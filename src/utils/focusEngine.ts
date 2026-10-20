export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export interface TimerPreset {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  dailyGoalMinutes: number;
}

export interface FocusSessionRecord {
  id: string;
  date: string; // YYYY-MM-DD
  timestampIso: string;
  taskLabel: string;
  durationMinutes: number;
  mode: TimerMode;
}

export interface HabitItem {
  id: string;
  title: string;
  category: 'Deep Work' | 'Health' | 'Learning' | 'Mindfulness';
  completedDates: string[]; // Array of YYYY-MM-DD strings
}

export const DEFAULT_PRESET: TimerPreset = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  dailyGoalMinutes: 120,
};

export interface PersistedTimerState {
  mode: TimerMode;
  taskLabel: string;
  targetEndTimeMs: number | null;
  pausedRemainingSec: number;
  activeDurationMinutes: number;
}

/**
 * Formats a Date object as a local calendar YYYY-MM-DD string.
 * Uses local year/month/date getters rather than UTC toISOString()
 * so local day boundaries and time-zone offsets are respected.
 */
export function formatLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD key into a local Date anchored at 12:00:00 noon
 * so adding/subtracting days never suffers from DST midnight/2am jumps.
 */
export function parseLocalDateKey(dateKey: string): Date {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date(NaN);
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Generates an ordered array of the last `count` local calendar dates (YYYY-MM-DD),
 * ending on `referenceDate` (inclusive).
 */
export function getLastNDays(
  count = 7,
  referenceDate: Date | string = new Date()
): string[] {
  const safeCount = Math.max(1, Math.floor(count));
  const anchor =
    typeof referenceDate === 'string'
      ? parseLocalDateKey(referenceDate)
      : new Date(
          referenceDate.getFullYear(),
          referenceDate.getMonth(),
          referenceDate.getDate(),
          12,
          0,
          0,
          0
        );

  const baseDate = Number.isNaN(anchor.getTime()) ? new Date() : anchor;
  const days: string[] = [];
  for (let i = safeCount - 1; i >= 0; i--) {
    const d = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate() - i,
      12,
      0,
      0,
      0
    );
    days.push(formatLocalDateKey(d));
  }
  return days;
}

/**
 * Detects whether the local calendar date has rolled over across midnight
 * or changed due to a system time-zone adjustment.
 */
export function checkDayBoundary(
  previousDateKey: string,
  now: Date = new Date()
): { changed: boolean; currentDateKey: string } {
  const currentDateKey = formatLocalDateKey(now);
  return {
    changed: currentDateKey !== previousDateKey,
    currentDateKey,
  };
}

export const LAST_7_DAYS: string[] = getLastNDays(7);

export function createDemoSessions(
  referenceDays: string[] = getLastNDays(7)
): FocusSessionRecord[] {
  const d =
    referenceDays.length >= 7 ? referenceDays.slice(-7) : getLastNDays(7);
  return [
    {
      id: 'sess-1',
      date: d[0],
      timestampIso: `${d[0]}T09:30:00Z`,
      taskLabel: 'System Architecture RFC Review',
      durationMinutes: 90,
      mode: 'focus',
    },
    {
      id: 'sess-2',
      date: d[1],
      timestampIso: `${d[1]}T10:15:00Z`,
      taskLabel: 'API Rate-Limiter Implementation',
      durationMinutes: 115,
      mode: 'focus',
    },
    {
      id: 'sess-3',
      date: d[2],
      timestampIso: `${d[2]}T11:00:00Z`,
      taskLabel: 'Database Query Optimization',
      durationMinutes: 130,
      mode: 'focus',
    },
    {
      id: 'sess-4',
      date: d[3],
      timestampIso: `${d[3]}T14:20:00Z`,
      taskLabel: 'Frontend Accessibility Audit',
      durationMinutes: 85,
      mode: 'focus',
    },
    {
      id: 'sess-5',
      date: d[4],
      timestampIso: `${d[4]}T10:00:00Z`,
      taskLabel: 'Technical Reading & Notes',
      durationMinutes: 60,
      mode: 'focus',
    },
    {
      id: 'sess-6',
      date: d[5],
      timestampIso: `${d[5]}T15:00:00Z`,
      taskLabel: 'Weekly Sprint Planning & Backlog',
      durationMinutes: 95,
      mode: 'focus',
    },
    {
      id: 'sess-7',
      date: d[6],
      timestampIso: `${d[6]}T09:00:00Z`,
      taskLabel: 'Core Algorithm Unit Testing',
      durationMinutes: 50,
      mode: 'focus',
    },
    {
      id: 'sess-8',
      date: d[6],
      timestampIso: `${d[6]}T10:30:00Z`,
      taskLabel: 'Documentation & Release Polish',
      durationMinutes: 45,
      mode: 'focus',
    },
  ];
}

export function createDemoHabits(
  referenceDays: string[] = getLastNDays(7)
): HabitItem[] {
  const d =
    referenceDays.length >= 7 ? referenceDays.slice(-7) : getLastNDays(7);
  return [
    {
      id: 'hab-1',
      title: '90+ mins uninterrupted morning deep work',
      category: 'Deep Work',
      completedDates: [d[0], d[1], d[2], d[4], d[5], d[6]],
    },
    {
      id: 'hab-2',
      title: 'Zero inbox / notifications before 11:00 AM',
      category: 'Mindfulness',
      completedDates: [d[1], d[2], d[3], d[5], d[6]],
    },
    {
      id: 'hab-3',
      title: 'Read 20 pages of engineering or design literature',
      category: 'Learning',
      completedDates: [d[0], d[2], d[3], d[6]],
    },
    {
      id: 'hab-4',
      title: 'Outdoor walk & screen-free break after lunch',
      category: 'Health',
      completedDates: [d[0], d[1], d[3], d[4], d[5], d[6]],
    },
  ];
}

export const DEMO_SESSIONS: FocusSessionRecord[] = createDemoSessions(LAST_7_DAYS);

export const DEMO_HABITS: HabitItem[] = createDemoHabits(LAST_7_DAYS);

/**
 * Computes exact remaining seconds using wall-clock timestamps (`targetEndTimeMs - nowMs`)
 * so that backgrounded or throttled browser tabs never cause timer drift.
 */
export function computeRemainingSeconds(
  targetEndTimeMs: number | null,
  pausedRemainingSeconds: number,
  nowMs = Date.now()
): number {
  if (targetEndTimeMs === null) {
    return Math.max(0, Math.round(pausedRemainingSeconds));
  }
  const deltaSec = Math.ceil((targetEndTimeMs - nowMs) / 1000);
  return Math.max(0, deltaSec);
}

/**
 * Formats seconds into MM:SS string.
 */
export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export type BotanicalStage = {
  stageName: 'Dormant Seed' | 'Sprouting Seedling' | 'Leafy Sapling' | 'Flowering Canopy';
  description: string;
  progressPercent: number;
};

/**
 * Determines the botanical growth stage based on today's completed focus minutes vs daily goal.
 */
export function getBotanicalStage(
  completedMinutesToday: number,
  dailyGoalMinutes: number
): BotanicalStage {
  const safeGoal = Math.max(15, dailyGoalMinutes);
  const pct = Math.min(100, Math.round((completedMinutesToday / safeGoal) * 100));

  if (pct === 0) {
    return {
      stageName: 'Dormant Seed',
      description: 'Start your first focus session today to germinate your garden.',
      progressPercent: 0,
    };
  }
  if (pct < 45) {
    return {
      stageName: 'Sprouting Seedling',
      description: 'First roots established! Keep focusing to grow stronger stems.',
      progressPercent: pct,
    };
  }
  if (pct < 95) {
    return {
      stageName: 'Leafy Sapling',
      description: 'Strong momentum—your daily canopy is nearly in full bloom.',
      progressPercent: pct,
    };
  }
  return {
    stageName: 'Flowering Canopy',
    description: 'Daily focus goal achieved! Your botanical sanctuary is in full bloom.',
    progressPercent: pct,
  };
}

export function getModeDurationMinutes(
  mode: TimerMode,
  preset: TimerPreset
): number {
  if (mode === 'focus') return preset.focusMinutes;
  if (mode === 'shortBreak') return preset.shortBreakMinutes;
  return preset.longBreakMinutes;
}

export interface ReconciledTimerState {
  mode: TimerMode;
  taskLabel: string;
  targetEndTimeMs: number | null;
  pausedRemainingSec: number;
  displaySeconds: number;
  activeDurationMinutes: number;
  expiredSession: FocusSessionRecord | null;
  expiredBreak: boolean;
}

/**
 * Restores and reconciles persisted timer state across page reloads or tab wakeups.
 * - If running and still in the future, computes exact remaining wall-clock seconds.
 * - If running and already expired while the page was closed/reloaded, resets the timer
 *   and produces the completed FocusSessionRecord dated to the actual expiration timestamp.
 */
export function reconcileRestoredTimerState(
  saved: Partial<PersistedTimerState> | null | undefined,
  preset: TimerPreset = DEFAULT_PRESET,
  nowMs = Date.now(),
  defaultTaskLabel = 'Deep Work: System Architecture & Code Review'
): ReconciledTimerState {
  const validMode: TimerMode =
    saved?.mode === 'focus' ||
    saved?.mode === 'shortBreak' ||
    saved?.mode === 'longBreak'
      ? saved.mode
      : 'focus';

  const taskLabel =
    typeof saved?.taskLabel === 'string' ? saved.taskLabel : defaultTaskLabel;

  const modeDurationMinutes = getModeDurationMinutes(validMode, preset);
  const activeDurationMinutes =
    typeof saved?.activeDurationMinutes === 'number' &&
    saved.activeDurationMinutes > 0
      ? saved.activeDurationMinutes
      : modeDurationMinutes;

  const fallbackSec = modeDurationMinutes * 60;
  const pausedRemainingSec =
    typeof saved?.pausedRemainingSec === 'number' &&
    Number.isFinite(saved.pausedRemainingSec) &&
    saved.pausedRemainingSec >= 0
      ? Math.round(saved.pausedRemainingSec)
      : fallbackSec;

  const targetEndTimeMs =
    typeof saved?.targetEndTimeMs === 'number' &&
    Number.isFinite(saved.targetEndTimeMs) &&
    saved.targetEndTimeMs > 0
      ? saved.targetEndTimeMs
      : null;

  if (targetEndTimeMs === null) {
    const restoredSec = pausedRemainingSec > 0 ? pausedRemainingSec : fallbackSec;
    return {
      mode: validMode,
      taskLabel,
      targetEndTimeMs: null,
      pausedRemainingSec: restoredSec,
      displaySeconds: restoredSec,
      activeDurationMinutes,
      expiredSession: null,
      expiredBreak: false,
    };
  }

  const remaining = computeRemainingSeconds(
    targetEndTimeMs,
    pausedRemainingSec,
    nowMs
  );

  if (remaining > 0) {
    return {
      mode: validMode,
      taskLabel,
      targetEndTimeMs,
      pausedRemainingSec,
      displaySeconds: remaining,
      activeDurationMinutes,
      expiredSession: null,
      expiredBreak: false,
    };
  }

  // Timer expired while unloaded or in background
  const completionDate = new Date(targetEndTimeMs);
  const expiredSession: FocusSessionRecord | null =
    validMode === 'focus'
      ? {
          id: `sess-completed-${targetEndTimeMs}`,
          date: formatLocalDateKey(completionDate),
          timestampIso: completionDate.toISOString(),
          taskLabel: taskLabel.trim() || 'Focused Session',
          durationMinutes: activeDurationMinutes,
          mode: 'focus',
        }
      : null;

  return {
    mode: validMode,
    taskLabel,
    targetEndTimeMs: null,
    pausedRemainingSec: fallbackSec,
    displaySeconds: fallbackSec,
    activeDurationMinutes: modeDurationMinutes,
    expiredSession,
    expiredBreak: validMode !== 'focus',
  };
}

/**
 * Calculates current consecutive streak of days completed ending on referenceDate (or yesterday).
 * If today is not yet completed, a streak ending yesterday remains active rather than resetting to 0.
 */
export function calculateHabitStreak(
  completedDates: string[],
  referenceDays: string[] | string | Date = getLastNDays(7)
): number {
  if (!Array.isArray(completedDates) || completedDates.length === 0) {
    return 0;
  }

  let todayKey: string;
  if (Array.isArray(referenceDays)) {
    if (referenceDays.length === 0) return 0;
    todayKey = referenceDays[referenceDays.length - 1];
  } else if (typeof referenceDays === 'string') {
    todayKey = referenceDays;
  } else {
    todayKey = formatLocalDateKey(referenceDays);
  }

  const set = new Set(completedDates);
  const anchor = parseLocalDateKey(todayKey);

  if (!Number.isNaN(anchor.getTime())) {
    let streak = 0;
    // Start at today (offset 0) if completed today; otherwise start at yesterday (offset 1)
    let offset = set.has(todayKey) ? 0 : 1;
    while (offset <= 3660) {
      const d = new Date(
        anchor.getFullYear(),
        anchor.getMonth(),
        anchor.getDate() - offset,
        12,
        0,
        0,
        0
      );
      const key = formatLocalDateKey(d);
      if (set.has(key)) {
        streak++;
        offset++;
      } else {
        break;
      }
    }
    return streak;
  }

  // Fallback for non-ISO reference arrays
  if (Array.isArray(referenceDays)) {
    let streak = 0;
    const startIdx = set.has(referenceDays[referenceDays.length - 1])
      ? referenceDays.length - 1
      : referenceDays.length - 2;
    for (let i = startIdx; i >= 0; i--) {
      if (set.has(referenceDays[i])) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  return 0;
}
