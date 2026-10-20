import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  computeRemainingSeconds,
  formatCountdown,
  getBotanicalStage,
  calculateHabitStreak,
  LAST_7_DAYS,
} from '../utils/focusEngine';
import App from '../App';

describe('FocusGarden Wall-Clock Timer & Habit Engine Tests', () => {
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

  it('computes consecutive habit streaks over the 7-day window', () => {
    const dates = ['2026-10-18', '2026-10-19', '2026-10-20'];
    expect(calculateHabitStreak(dates, LAST_7_DAYS)).toBe(3);
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
