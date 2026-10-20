import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  computeRemainingSeconds,
  formatCountdown,
  getBotanicalStage,
  calculateHabitStreak,
  formatLocalDateKey,
  getLastNDays,
  checkDayBoundary,
  reconcileRestoredTimerState,
  DEFAULT_PRESET,
} from '../utils/focusEngine';
import App, { STORAGE_TIMER_STATE_KEY } from '../App';

describe('FocusGarden Wall-Clock Timer & Habit Engine Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('calculates remaining seconds accurately using monotonic wall-clock delta without drift', () => {
    const startMs = 1_700_000_000_000;
    const targetEndMs = startMs + 25 * 60 * 1000; // 25 minutes later

    // Simulate 10 minutes elapsed while tab was inactive in background
    const afterTenMinsMs = startMs + 10 * 60 * 1000;
    expect(computeRemainingSeconds(targetEndMs, 1500, afterTenMinsMs)).toBe(900);

    // Simulate timer past expiration
    const afterThirtyMinsMs = startMs + 30 * 60 * 1000;
    expect(computeRemainingSeconds(targetEndMs, 1500, afterThirtyMinsMs)).toBe(0);

    // Paused state returns pausedRemainingSeconds
    expect(computeRemainingSeconds(null, 425, afterThirtyMinsMs)).toBe(425);
  });

  it('formats countdown seconds into MM:SS strings', () => {
    expect(formatCountdown(1500)).toBe('25:00');
    expect(formatCountdown(65)).toBe('01:05');
    expect(formatCountdown(0)).toBe('00:00');
  });

  it('determines botanical growth stages accurately against daily goals', () => {
    expect(getBotanicalStage(0, 120).stageName).toBe('Dormant Seed');
    expect(getBotanicalStage(30, 120).stageName).toBe('Sprouting Seedling');
    expect(getBotanicalStage(90, 120).stageName).toBe('Leafy Sapling');
    expect(getBotanicalStage(120, 120).stageName).toBe('Flowering Canopy');
  });

  it('computes dynamic local date keys and 7-day windows across month and year boundaries', () => {
    const localDate = new Date(2027, 2, 3, 23, 45, 0); // March 3, 2027 23:45 local time
    expect(formatLocalDateKey(localDate)).toBe('2027-03-03');

    const marchWindow = getLastNDays(7, localDate);
    expect(marchWindow).toEqual([
      '2027-02-25',
      '2027-02-26',
      '2027-02-27',
      '2027-02-28',
      '2027-03-01',
      '2027-03-02',
      '2027-03-03',
    ]);

    const newYearWindow = getLastNDays(4, '2027-01-02');
    expect(newYearWindow).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });

  it('detects midnight day-boundary rollovers and timezone date changes', () => {
    const beforeMidnight = new Date(2026, 9, 20, 23, 59, 50);
    const afterMidnight = new Date(2026, 9, 21, 0, 0, 5);
    const prevKey = formatLocalDateKey(beforeMidnight);

    expect(checkDayBoundary(prevKey, beforeMidnight)).toEqual({
      changed: false,
      currentDateKey: '2026-10-20',
    });
    expect(checkDayBoundary(prevKey, afterMidnight)).toEqual({
      changed: true,
      currentDateKey: '2026-10-21',
    });
  });

  it('computes consecutive habit streaks and preserves active streaks when today is not yet checked off', () => {
    const refWindow = getLastNDays(7, '2026-10-20');

    // Completed today and previous 2 days -> streak is 3
    expect(
      calculateHabitStreak(['2026-10-18', '2026-10-19', '2026-10-20'], refWindow)
    ).toBe(3);

    // Regression: Completed yesterday and 2 days prior, but NOT yet checked today -> streak is still 3 (not 0)
    expect(
      calculateHabitStreak(['2026-10-17', '2026-10-18', '2026-10-19'], refWindow)
    ).toBe(3);

    // Missed both today and yesterday -> streak is 0
    expect(
      calculateHabitStreak(['2026-10-17', '2026-10-18'], refWindow)
    ).toBe(0);

    // Multi-week streak extending beyond the 7-day display window
    const tenDayDates = getLastNDays(10, '2026-10-19');
    expect(calculateHabitStreak(tenDayDates, refWindow)).toBe(10);
  });

  it('reconciles persisted active and expired timers across reloads and midnight boundaries', () => {
    const baseNow = new Date(2026, 9, 20, 14, 0, 0).getTime();

    // 1. Active running timer with 10 minutes left
    const activeState = reconcileRestoredTimerState(
      {
        mode: 'focus',
        taskLabel: 'Write Regression Tests',
        targetEndTimeMs: baseNow + 600_000,
        pausedRemainingSec: 1500,
        activeDurationMinutes: 25,
      },
      DEFAULT_PRESET,
      baseNow
    );
    expect(activeState.targetEndTimeMs).toBe(baseNow + 600_000);
    expect(activeState.displaySeconds).toBe(600);
    expect(activeState.expiredSession).toBeNull();

    // 2. Timer that expired late yesterday evening while tab was closed, reopened the next morning
    const finishedYesterdayMs = new Date(2026, 9, 20, 23, 50, 0).getTime();
    const reopenedNextMorningMs = new Date(2026, 9, 21, 8, 15, 0).getTime();
    const expiredState = reconcileRestoredTimerState(
      {
        mode: 'focus',
        taskLabel: 'Late Evening Deep Work',
        targetEndTimeMs: finishedYesterdayMs,
        pausedRemainingSec: 1500,
        activeDurationMinutes: 25,
      },
      DEFAULT_PRESET,
      reopenedNextMorningMs
    );

    expect(expiredState.targetEndTimeMs).toBeNull();
    expect(expiredState.displaySeconds).toBe(1500);
    expect(expiredState.expiredSession).not.toBeNull();
    expect(expiredState.expiredSession?.date).toBe('2026-10-20');
    expect(expiredState.expiredSession?.taskLabel).toBe('Late Evening Deep Work');
    expect(expiredState.expiredSession?.durationMinutes).toBe(25);
  });

  it('persists an active timer to localStorage and restores the running countdown after a page reload', () => {
    const baseMs = 1_760_920_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(baseMs);

    const { unmount } = render(<App />);
    expect(screen.getByTestId('timer-readout')).toHaveTextContent('25:00');

    // Start the timer
    fireEvent.click(screen.getByRole('button', { name: /Start Timer/i }));
    expect(screen.getByText(/Running \(Wall-Clock Locked\)/i)).toBeInTheDocument();

    const savedRaw = localStorage.getItem(STORAGE_TIMER_STATE_KEY);
    expect(savedRaw).toBeTruthy();
    const savedParsed = JSON.parse(savedRaw!);
    expect(savedParsed.targetEndTimeMs).toBe(baseMs + 25 * 60 * 1000);

    // Simulate page unload and reload 5 minutes (300s) later
    unmount();
    nowSpy.mockReturnValue(baseMs + 5 * 60 * 1000);

    render(<App />);
    expect(screen.getByText(/Running \(Wall-Clock Locked\)/i)).toBeInTheDocument();
    expect(screen.getByTestId('timer-readout')).toHaveTextContent('20:00');
  });

  it('auto-completes an expired focus timer upon reload and records the session', () => {
    const expiredEndMs = Date.now() - 30_000; // expired 30 seconds ago
    localStorage.setItem(
      STORAGE_TIMER_STATE_KEY,
      JSON.stringify({
        mode: 'focus',
        taskLabel: 'Reloaded Expired Block',
        targetEndTimeMs: expiredEndMs,
        pausedRemainingSec: 1500,
        activeDurationMinutes: 25,
      })
    );

    render(<App />);
    expect(
      screen.getByText(/Completed 25-minute focus session on "Reloaded Expired Block"!/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId('timer-readout')).toHaveTextContent('25:00');
  });

  it('renders FocusGarden UI, logs a completed block, and switches to Habit Tracker', () => {
    render(<App />);
    expect(screen.getByText('FocusGarden')).toBeInTheDocument();
    expect(screen.getByTestId('timer-readout')).toHaveTextContent('25:00');

    fireEvent.click(screen.getByRole('button', { name: /Complete Block Now/i }));
    expect(screen.getByText(/Logged completed 25-minute session/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Habit Tracker & Analytics/i }));
    expect(
      screen.getByText(/7-Day Habit Consistency Matrix/i)
    ).toBeInTheDocument();
  });
});
