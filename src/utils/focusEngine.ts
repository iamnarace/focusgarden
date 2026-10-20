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

export const LAST_7_DAYS = [
  '2026-10-14',
  '2026-10-15',
  '2026-10-16',
  '2026-10-17',
  '2026-10-18',
  '2026-10-19',
  '2026-10-20',
];

export const DEMO_SESSIONS: FocusSessionRecord[] = [
  {
    id: 'sess-1',
    date: '2026-10-14',
    timestampIso: '2026-10-14T09:30:00Z',
    taskLabel: 'System Architecture RFC Review',
    durationMinutes: 90,
    mode: 'focus',
  },
  {
    id: 'sess-2',
    date: '2026-10-15',
    timestampIso: '2026-10-15T10:15:00Z',
    taskLabel: 'API Rate-Limiter Implementation',
    durationMinutes: 115,
    mode: 'focus',
  },
  {
    id: 'sess-3',
    date: '2026-10-16',
    timestampIso: '2026-10-16T11:00:00Z',
    taskLabel: 'Database Query Optimization',
    durationMinutes: 130,
    mode: 'focus',
  },
  {
    id: 'sess-4',
    date: '2026-10-17',
    timestampIso: '2026-10-17T14:20:00Z',
    taskLabel: 'Frontend Accessibility Audit',
    durationMinutes: 85,
    mode: 'focus',
  },
  {
    id: 'sess-5',
    date: '2026-10-18',
    timestampIso: '2026-10-18T10:00:00Z',
    taskLabel: 'Technical Reading & Notes',
    durationMinutes: 60,
    mode: 'focus',
  },
  {
    id: 'sess-6',
    date: '2026-10-19',
    timestampIso: '2026-10-19T15:00:00Z',
    taskLabel: 'Weekly Sprint Planning & Backlog',
    durationMinutes: 95,
    mode: 'focus',
  },
  {
    id: 'sess-7',
    date: '2026-10-20',
    timestampIso: '2026-10-20T09:00:00Z',
    taskLabel: 'Core Algorithm Unit Testing',
    durationMinutes: 50,
    mode: 'focus',
  },
  {
    id: 'sess-8',
    date: '2026-10-20',
    timestampIso: '2026-10-20T10:30:00Z',
    taskLabel: 'Documentation & Release Polish',
    durationMinutes: 45,
    mode: 'focus',
  },
];

export const DEMO_HABITS: HabitItem[] = [
  {
    id: 'hab-1',
    title: '90+ mins uninterrupted morning deep work',
    category: 'Deep Work',
    completedDates: [
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
    ],
  },
  {
    id: 'hab-2',
    title: 'Zero inbox / notifications before 11:00 AM',
    category: 'Mindfulness',
    completedDates: [
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-19',
      '2026-10-20',
    ],
  },
  {
    id: 'hab-3',
    title: 'Read 20 pages of engineering or design literature',
    category: 'Learning',
    completedDates: ['2026-10-14', '2026-10-16', '2026-10-17', '2026-10-20'],
  },
  {
    id: 'hab-4',
    title: 'Outdoor walk & screen-free break after lunch',
    category: 'Health',
    completedDates: [
      '2026-10-14',
      '2026-10-15',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
    ],
  },
];

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

/**
 * Calculates current consecutive streak of days completed ending on referenceDate (or yesterday).
 */
export function calculateHabitStreak(
  completedDates: string[],
  referenceDays: string[] = LAST_7_DAYS
): number {
  const set = new Set(completedDates);
  let streak = 0;
  for (let i = referenceDays.length - 1; i >= 0; i--) {
    if (set.has(referenceDays[i])) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
