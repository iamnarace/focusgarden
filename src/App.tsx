import { useState, useEffect, useMemo } from 'react';
import {
  Sprout,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Flame,
  Calendar,
  Clock,
  Plus,
  Trash2,
  BarChart3,
  Sparkles,
  Check,
  ShieldCheck,
} from 'lucide-react';
import {
  TimerMode,
  TimerPreset,
  FocusSessionRecord,
  HabitItem,
  PersistedTimerState,
  DEFAULT_PRESET,
  createDemoSessions,
  createDemoHabits,
  formatLocalDateKey,
  getLastNDays,
  checkDayBoundary,
  getModeDurationMinutes,
  reconcileRestoredTimerState,
  computeRemainingSeconds,
  formatCountdown,
  getBotanicalStage,
  calculateHabitStreak,
} from './utils/focusEngine';

const STORAGE_PRESET_KEY = 'focusgarden_preset_v1';
const STORAGE_SESSIONS_KEY = 'focusgarden_sessions_v1';
const STORAGE_HABITS_KEY = 'focusgarden_habits_v1';
export const STORAGE_TIMER_STATE_KEY = 'focusgarden_timer_state_v1';

function loadInitialPreset(): TimerPreset {
  try {
    const saved = localStorage.getItem(STORAGE_PRESET_KEY);
    if (saved) return { ...DEFAULT_PRESET, ...JSON.parse(saved) };
  } catch {
    // Fallback
  }
  return DEFAULT_PRESET;
}

function loadSavedTimerState(): Partial<PersistedTimerState> | null {
  try {
    const saved = localStorage.getItem(STORAGE_TIMER_STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return parsed as Partial<PersistedTimerState>;
      }
    }
  } catch {
    // Fallback
  }
  return null;
}

export function App() {
  const [activeTab, setActiveTab] = useState<'sanctuary' | 'habits'>('sanctuary');

  // Dynamic Local Date & 7-Day Window State (updates across midnight & timezone changes)
  const [todayDate, setTodayDate] = useState<string>(() =>
    formatLocalDateKey(new Date())
  );
  const last7Days = useMemo(() => getLastNDays(7, todayDate), [todayDate]);

  // Timer Preset Configuration
  const [preset, setPreset] = useState<TimerPreset>(loadInitialPreset);

  // Reconcile any persisted timer state at initialization
  const initialReconciled = useMemo(
    () => reconcileRestoredTimerState(loadSavedTimerState(), preset, Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Sessions & Habits State
  const [sessions, setSessions] = useState<FocusSessionRecord[]>(() => {
    let baseSessions: FocusSessionRecord[] | null = null;
    try {
      const saved = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseSessions = parsed;
        }
      }
    } catch {
      // Fallback
    }
    const list = baseSessions ?? createDemoSessions(getLastNDays(7));
    if (
      initialReconciled.expiredSession &&
      !list.some((s) => s.id === initialReconciled.expiredSession?.id)
    ) {
      return [initialReconciled.expiredSession, ...list];
    }
    return list;
  });

  const [habits, setHabits] = useState<HabitItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HABITS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return createDemoHabits(getLastNDays(7));
  });

  // Drift-Free Wall-Clock Timer State (restored from localStorage when active/paused)
  const [mode, setMode] = useState<TimerMode>(initialReconciled.mode);
  const [taskLabel, setTaskLabel] = useState<string>(initialReconciled.taskLabel);
  const [targetEndTimeMs, setTargetEndTimeMs] = useState<number | null>(
    initialReconciled.targetEndTimeMs
  );
  const [pausedRemainingSec, setPausedRemainingSec] = useState<number>(
    initialReconciled.pausedRemainingSec
  );
  const [displaySeconds, setDisplaySeconds] = useState<number>(
    initialReconciled.displaySeconds
  );
  const [activeDurationMinutes, setActiveDurationMinutes] = useState<number>(
    initialReconciled.activeDurationMinutes
  );

  // New Habit Form
  const [newHabitTitle, setNewHabitTitle] = useState<string>('');
  const [newHabitCat, setNewHabitCat] = useState<HabitItem['category']>('Deep Work');
  const [bannerMsg, setBannerMsg] = useState<string | null>(() => {
    if (initialReconciled.expiredSession) {
      return `Completed ${initialReconciled.expiredSession.durationMinutes}-minute focus session on "${initialReconciled.expiredSession.taskLabel}"!`;
    }
    if (initialReconciled.expiredBreak) {
      return 'Break interval complete! Ready for your next focus block.';
    }
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PRESET_KEY, JSON.stringify(preset));
    } catch {
      // Ignore storage quota errors
    }
  }, [preset]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
    } catch {
      // Ignore
    }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HABITS_KEY, JSON.stringify(habits));
    } catch {
      // Ignore
    }
  }, [habits]);

  // Persist active or paused timer state so reloads preserve running sessions
  useEffect(() => {
    try {
      const stateToSave: PersistedTimerState = {
        mode,
        taskLabel,
        targetEndTimeMs,
        pausedRemainingSec,
        activeDurationMinutes,
      };
      localStorage.setItem(STORAGE_TIMER_STATE_KEY, JSON.stringify(stateToSave));
    } catch {
      // Ignore
    }
  }, [mode, taskLabel, targetEndTimeMs, pausedRemainingSec, activeDurationMinutes]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'habits' || tab === 'sanctuary') {
      setActiveTab(tab);
    }
  }, []);

  // Day-boundary and time-zone change synchronization
  useEffect(() => {
    const syncDayBoundary = () => {
      const check = checkDayBoundary(todayDate, new Date(Date.now()));
      if (check.changed) {
        setTodayDate(check.currentDateKey);
      }
    };
    const intervalId = window.setInterval(syncDayBoundary, 15_000);
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncDayBoundary();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', syncDayBoundary);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', syncDayBoundary);
    };
  }, [todayDate]);

  // Wall-clock synchronization effect (handles inactive/throttled tabs accurately)
  useEffect(() => {
    if (targetEndTimeMs === null) {
      setDisplaySeconds(pausedRemainingSec);
      return;
    }

    const syncClock = () => {
      const nowMs = Date.now();
      const now = new Date(nowMs);
      const dayCheck = checkDayBoundary(todayDate, now);
      if (dayCheck.changed) {
        setTodayDate(dayCheck.currentDateKey);
      }

      const rem = computeRemainingSeconds(targetEndTimeMs, pausedRemainingSec, nowMs);
      setDisplaySeconds(rem);

      if (rem <= 0) {
        // Timer finished! Use actual completion timestamp for date accuracy across midnight
        const completedTargetMs = targetEndTimeMs;
        setTargetEndTimeMs(null);
        const modeMinutes = getModeDurationMinutes(mode, preset);

        setPausedRemainingSec(modeMinutes * 60);
        setDisplaySeconds(modeMinutes * 60);
        setActiveDurationMinutes(modeMinutes);

        if (mode === 'focus') {
          const completionDate = new Date(completedTargetMs);
          const sessionDuration = activeDurationMinutes || modeMinutes;
          const newRecord: FocusSessionRecord = {
            id: `sess-completed-${completedTargetMs}`,
            date: formatLocalDateKey(completionDate),
            timestampIso: completionDate.toISOString(),
            taskLabel: taskLabel.trim() || 'Focused Session',
            durationMinutes: sessionDuration,
            mode: 'focus',
          };
          setSessions((prev) =>
            prev.some((s) => s.id === newRecord.id) ? prev : [newRecord, ...prev]
          );
          setBannerMsg(
            `Completed ${sessionDuration}-minute focus session on "${newRecord.taskLabel}"!`
          );
        } else {
          setBannerMsg('Break interval complete! Ready for your next focus block.');
        }
      }
    };

    syncClock();
    const intervalId = window.setInterval(syncClock, 250);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncClock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [
    targetEndTimeMs,
    pausedRemainingSec,
    mode,
    preset,
    taskLabel,
    todayDate,
    activeDurationMinutes,
  ]);

  const totalModeSeconds = getModeDurationMinutes(mode, preset) * 60;

  const switchMode = (nextMode: TimerMode) => {
    setTargetEndTimeMs(null);
    setMode(nextMode);
    const mins = getModeDurationMinutes(nextMode, preset);
    const secs = mins * 60;
    setActiveDurationMinutes(mins);
    setPausedRemainingSec(secs);
    setDisplaySeconds(secs);
  };

  const handleToggleStartPause = () => {
    if (targetEndTimeMs === null) {
      // Start timer using monotonic wall-clock target timestamp
      const mins = getModeDurationMinutes(mode, preset);
      setActiveDurationMinutes(mins);
      setTargetEndTimeMs(Date.now() + pausedRemainingSec * 1000);
    } else {
      // Pause timer and capture exact remaining seconds
      const rem = computeRemainingSeconds(targetEndTimeMs, pausedRemainingSec, Date.now());
      setPausedRemainingSec(rem);
      setDisplaySeconds(rem);
      setTargetEndTimeMs(null);
    }
  };

  const handleResetTimer = () => {
    const mins = getModeDurationMinutes(mode, preset);
    setTargetEndTimeMs(null);
    setActiveDurationMinutes(mins);
    setPausedRemainingSec(mins * 60);
    setDisplaySeconds(mins * 60);
  };

  const handleLogQuickSession = () => {
    const now = new Date();
    const currentDayKey = formatLocalDateKey(now);
    if (currentDayKey !== todayDate) {
      setTodayDate(currentDayKey);
    }
    const mins = preset.focusMinutes;
    const record: FocusSessionRecord = {
      id: `sess-${now.getTime()}`,
      date: currentDayKey,
      timestampIso: now.toISOString(),
      taskLabel: taskLabel.trim() || 'Deep Work Session',
      durationMinutes: mins,
      mode: 'focus',
    };
    setSessions((prev) => [record, ...prev]);
    setBannerMsg(`Logged completed ${mins}-minute session: "${record.taskLabel}".`);
  };

  const handleToggleHabitDate = (habitId: string, dateStr: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const exists = h.completedDates.includes(dateStr);
        return {
          ...h,
          completedDates: exists
            ? h.completedDates.filter((d) => d !== dateStr)
            : [...h.completedDates, dateStr],
        };
      })
    );
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    const currentDayKey = formatLocalDateKey(new Date());
    if (currentDayKey !== todayDate) {
      setTodayDate(currentDayKey);
    }
    const item: HabitItem = {
      id: `hab-${Date.now()}`,
      title: newHabitTitle.trim(),
      category: newHabitCat,
      completedDates: [currentDayKey],
    };
    setHabits((prev) => [...prev, item]);
    setNewHabitTitle('');
    setBannerMsg(`Added new daily habit: "${item.title}".`);
  };

  const handleDeleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const handleResetDemoWorkspace = () => {
    const freshToday = formatLocalDateKey(new Date());
    const fresh7Days = getLastNDays(7, freshToday);
    setTodayDate(freshToday);
    setTargetEndTimeMs(null);
    setMode('focus');
    setPreset(DEFAULT_PRESET);
    setSessions(createDemoSessions(fresh7Days));
    setHabits(createDemoHabits(fresh7Days));
    setActiveDurationMinutes(DEFAULT_PRESET.focusMinutes);
    setPausedRemainingSec(DEFAULT_PRESET.focusMinutes * 60);
    setDisplaySeconds(DEFAULT_PRESET.focusMinutes * 60);
    setBannerMsg('Restored demonstration focus history and 7-day habit streaks.');
  };

  // Analytics Computations
  const todayMinutes = useMemo(
    () =>
      sessions
        .filter((s) => s.date === todayDate && s.mode === 'focus')
        .reduce((acc, s) => acc + s.durationMinutes, 0),
    [sessions, todayDate]
  );

  const botanical = useMemo(
    () => getBotanicalStage(todayMinutes, preset.dailyGoalMinutes),
    [todayMinutes, preset.dailyGoalMinutes]
  );

  const weeklyChartData = useMemo(() => {
    return last7Days.map((dateStr) => {
      const totalMins = sessions
        .filter((s) => s.date === dateStr && s.mode === 'focus')
        .reduce((acc, s) => acc + s.durationMinutes, 0);
      const dayLabel = dateStr.slice(5); // MM-DD
      return {
        date: dateStr,
        label: dayLabel,
        minutes: totalMins,
      };
    });
  }, [sessions, last7Days]);

  const maxChartMins = Math.max(
    preset.dailyGoalMinutes,
    ...weeklyChartData.map((d) => d.minutes),
    60
  );

  const timerProgressFraction =
    totalModeSeconds > 0 ? (totalModeSeconds - displaySeconds) / totalModeSeconds : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8F4] text-stone-900">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-amber-100 flex items-center justify-center shadow-sm">
              <Sprout className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl font-bold tracking-tight text-stone-900">
                  FocusGarden
                </h1>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
                  Wall-Clock Synced
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Botanical deep-work timer, habit streak matrix & 7-day analytics
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200">
              <button
                type="button"
                onClick={() => setActiveTab('sanctuary')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'sanctuary'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Focus Timer & Garden
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('habits')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'habits'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Habit Tracker & Analytics
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetDemoWorkspace}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Restore Sample Progress
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {bannerMsg && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-medium flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              {bannerMsg}
            </span>
            <button
              type="button"
              onClick={() => setBannerMsg(null)}
              className="underline text-emerald-800 ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === 'sanctuary' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Drift-Free Timer Studio */}
            <section
              aria-labelledby="timer-heading"
              className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-4">
                <div>
                  <h2 id="timer-heading" className="font-serif text-lg font-bold text-stone-900">
                    Deep Work Timer Studio
                  </h2>
                  <p className="text-xs text-stone-500">
                    Monotonic timestamp calculation prevents drift when browser tabs are inactive
                  </p>
                </div>

                <div className="inline-flex rounded-lg bg-stone-100 p-1 border border-stone-200">
                  {[
                    { id: 'focus', label: `Focus (${preset.focusMinutes}m)` },
                    { id: 'shortBreak', label: `Short Break (${preset.shortBreakMinutes}m)` },
                    { id: 'longBreak', label: `Long Break (${preset.longBreakMinutes}m)` },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => switchMode(m.id as TimerMode)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                        mode === m.id
                          ? 'bg-white text-emerald-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Circular SVG Timer Dial */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative w-56 h-56 flex items-center justify-center">
                  <svg className="w-56 h-56 -rotate-90" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="86"
                      fill="transparent"
                      stroke="#e7e5e4"
                      strokeWidth="12"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="86"
                      fill="transparent"
                      stroke={mode === 'focus' ? '#065f46' : '#d97706'}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 86}
                      strokeDashoffset={
                        2 * Math.PI * 86 * (1 - Math.min(1, Math.max(0, timerProgressFraction)))
                      }
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-mono uppercase tracking-widest text-stone-400">
                      {mode === 'focus'
                        ? 'Focus Session'
                        : mode === 'shortBreak'
                        ? 'Short Rest'
                        : 'Restorative Break'}
                    </span>
                    <span
                      data-testid="timer-readout"
                      className="font-mono text-5xl font-bold tracking-tight text-stone-900 mt-1"
                    >
                      {formatCountdown(displaySeconds)}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-800 mt-2">
                      {targetEndTimeMs !== null ? 'Running (Wall-Clock Locked)' : 'Ready / Paused'}
                    </span>
                  </div>
                </div>

                {/* Task Input */}
                <div className="w-full max-w-md mt-4">
                  <label
                    htmlFor="focus-task-input"
                    className="block text-xs font-semibold text-stone-600 mb-1"
                  >
                    Current Focus Objective
                  </label>
                  <input
                    id="focus-task-input"
                    type="text"
                    value={taskLabel}
                    onChange={(e) => setTaskLabel(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50/70 text-sm font-medium"
                    placeholder="What are you working on right now?"
                  />
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                  <button
                    type="button"
                    onClick={handleToggleStartPause}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold shadow-sm cursor-pointer"
                  >
                    {targetEndTimeMs !== null ? (
                      <>
                        <Pause className="w-4 h-4" /> Pause Timer
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" /> Start Timer
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetTimer}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset
                  </button>

                  <button
                    type="button"
                    onClick={handleLogQuickSession}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold cursor-pointer"
                    title="Complete and record a focus block immediately"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-700" /> Complete Block Now
                  </button>
                </div>
              </div>

              {/* Configurable Durations Bar */}
              <div className="pt-4 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label htmlFor="cfg-focus" className="block text-stone-500 font-medium mb-1">
                    Focus (mins)
                  </label>
                  <input
                    id="cfg-focus"
                    type="number"
                    min={1}
                    max={120}
                    value={preset.focusMinutes}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value) || 25);
                      setPreset((p) => ({ ...p, focusMinutes: val }));
                      if (mode === 'focus' && targetEndTimeMs === null) {
                        setPausedRemainingSec(val * 60);
                        setDisplaySeconds(val * 60);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="cfg-short" className="block text-stone-500 font-medium mb-1">
                    Short Break (m)
                  </label>
                  <input
                    id="cfg-short"
                    type="number"
                    min={1}
                    max={60}
                    value={preset.shortBreakMinutes}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value) || 5);
                      setPreset((p) => ({ ...p, shortBreakMinutes: val }));
                      if (mode === 'shortBreak' && targetEndTimeMs === null) {
                        setActiveDurationMinutes(val);
                        setPausedRemainingSec(val * 60);
                        setDisplaySeconds(val * 60);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="cfg-long" className="block text-stone-500 font-medium mb-1">
                    Long Break (m)
                  </label>
                  <input
                    id="cfg-long"
                    type="number"
                    min={5}
                    max={60}
                    value={preset.longBreakMinutes}
                    onChange={(e) => {
                      const val = Math.max(5, Number(e.target.value) || 15);
                      setPreset((p) => ({ ...p, longBreakMinutes: val }));
                      if (mode === 'longBreak' && targetEndTimeMs === null) {
                        setActiveDurationMinutes(val);
                        setPausedRemainingSec(val * 60);
                        setDisplaySeconds(val * 60);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="cfg-goal" className="block text-stone-500 font-medium mb-1">
                    Daily Goal (m)
                  </label>
                  <input
                    id="cfg-goal"
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    value={preset.dailyGoalMinutes}
                    onChange={(e) =>
                      setPreset((p) => ({
                        ...p,
                        dailyGoalMinutes: Math.max(15, Number(e.target.value) || 120),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 font-mono"
                  />
                </div>
              </div>
            </section>

            {/* Right Column: Botanical Growth Stage + Session History */}
            <div className="lg:col-span-5 space-y-6">
              {/* Botanical Companion Card */}
              <section
                aria-labelledby="botanical-heading"
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <h2 id="botanical-heading" className="font-serif text-base font-bold text-stone-900">
                      Daily Botanical Growth
                    </h2>
                    <p className="text-xs text-stone-500">
                      Today ({todayDate}): {todayMinutes} / {preset.dailyGoalMinutes} mins
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
                    {botanical.stageName}
                  </span>
                </div>

                {/* Custom SVG Plant Artwork */}
                <div className="bg-[#F6F8F4] rounded-xl border border-stone-200 p-5 flex items-center gap-5">
                  <svg className="w-24 h-24 shrink-0" viewBox="0 0 120 120">
                    {/* Terracotta Pot */}
                    <polygon points="35,85 85,85 77,112 43,112" fill="#c85a32" />
                    <rect x="31" y="79" width="58" height="7" rx="3" fill="#b04822" />
                    {/* Stem */}
                    <path
                      d="M60,79 Q60,52 60,34"
                      stroke="#15803d"
                      strokeWidth="5"
                      strokeLinecap="round"
                      fill="none"
                    />
                    {/* Left & Right Leaves */}
                    {botanical.progressPercent >= 20 && (
                      <>
                        <path d="M60,64 Q40,56 42,44 Q56,46 60,64" fill="#16a34a" />
                        <path d="M60,55 Q80,47 78,35 Q64,37 60,55" fill="#22c55e" />
                      </>
                    )}
                    {/* Upper Canopy & Bloom */}
                    {botanical.progressPercent >= 65 && (
                      <>
                        <circle cx="60" cy="28" r="14" fill="#15803d" />
                        <circle cx="48" cy="34" r="10" fill="#16a34a" />
                        <circle cx="72" cy="34" r="10" fill="#22c55e" />
                      </>
                    )}
                    {botanical.progressPercent >= 95 && (
                      <circle cx="60" cy="24" r="6" fill="#f59e0b" />
                    )}
                  </svg>

                  <div className="space-y-2 flex-1">
                    <p className="text-xs text-stone-700 leading-relaxed">
                      {botanical.description}
                    </p>
                    <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-700 transition-all"
                        style={{ width: `${botanical.progressPercent}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-mono text-stone-500">
                      Daily Goal Completion: {botanical.progressPercent}%
                    </p>
                  </div>
                </div>
              </section>

              {/* Recent Focus Session Log */}
              <section
                aria-labelledby="history-heading"
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <h2 id="history-heading" className="font-serif text-base font-bold text-stone-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-800" />
                    Recent Focus Sessions ({sessions.length})
                  </h2>
                </div>

                <ul className="divide-y divide-stone-100 max-h-64 overflow-y-auto text-xs">
                  {sessions.slice(0, 8).map((sess) => (
                    <li
                      key={sess.id}
                      className="py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900 truncate">
                          {sess.taskLabel}
                        </p>
                        <p className="font-mono text-[11px] text-stone-500">{sess.date}</p>
                      </div>
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shrink-0">
                        +{sess.durationMinutes}m
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        ) : (
          /* TAB 2: HABIT TRACKER & 7-DAY ANALYTICS */
          <div className="space-y-6">
            {/* 7-Day Focus Bar Chart */}
            <section
              aria-labelledby="chart-heading"
              className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div>
                  <h2 id="chart-heading" className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-800" />
                    7-Day Focus Output (Minutes per Day)
                  </h2>
                  <p className="text-xs text-stone-500">
                    Daily deep-work minutes compared against your {preset.dailyGoalMinutes}-minute daily target
                  </p>
                </div>
                <div className="font-mono text-xs text-stone-600">
                  7-Day Total:{' '}
                  <strong className="text-emerald-900">
                    {weeklyChartData.reduce((a, b) => a + b.minutes, 0)} mins
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-3 pt-4 items-end h-48">
                {weeklyChartData.map((day) => {
                  const heightPct = Math.round((day.minutes / maxChartMins) * 100);
                  const metGoal = day.minutes >= preset.dailyGoalMinutes;
                  return (
                    <div
                      key={day.date}
                      className="flex flex-col items-center justify-end h-full gap-2"
                    >
                      <span className="font-mono text-[11px] font-bold text-stone-700">
                        {day.minutes}m
                      </span>
                      <div className="w-full max-w-[48px] bg-stone-100 rounded-t-lg h-32 flex items-end overflow-hidden border border-stone-200">
                        <div
                          className={`w-full transition-all rounded-t ${
                            metGoal ? 'bg-emerald-700' : 'bg-emerald-500/80'
                          }`}
                          style={{ height: `${Math.max(6, heightPct)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-stone-500">{day.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Daily Habit Check-in Matrix */}
            <section
              aria-labelledby="habits-heading"
              className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div>
                  <h2 id="habits-heading" className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-800" />
                    7-Day Habit Consistency Matrix
                  </h2>
                  <p className="text-xs text-stone-500">
                    Toggle daily completions across the past 7 days to build sustainable routines
                  </p>
                </div>

                <form onSubmit={handleAddHabit} className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    aria-label="New habit title"
                    value={newHabitTitle}
                    onChange={(e) => setNewHabitTitle(e.target.value)}
                    placeholder="Add a new daily ritual..."
                    className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs w-56"
                  />
                  <select
                    aria-label="New habit category"
                    value={newHabitCat}
                    onChange={(e) =>
                      setNewHabitCat(e.target.value as HabitItem['category'])
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                  >
                    <option value="Deep Work">Deep Work</option>
                    <option value="Mindfulness">Mindfulness</option>
                    <option value="Learning">Learning</option>
                    <option value="Health">Health</option>
                  </select>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Habit
                  </button>
                </form>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-[11px] font-mono uppercase text-stone-400">
                      <th className="py-2.5 px-3">Daily Habit</th>
                      {last7Days.map((d) => (
                        <th key={d} className="py-2.5 px-2 text-center">
                          {d.slice(5)}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-center">Streak</th>
                      <th className="py-2.5 px-2 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {habits.map((habit) => {
                      const streak = calculateHabitStreak(habit.completedDates, last7Days);
                      return (
                        <tr key={habit.id} className="hover:bg-stone-50/80">
                          <td className="py-3 px-3">
                            <p className="font-semibold text-stone-900">{habit.title}</p>
                            <span className="text-[10px] font-mono uppercase text-stone-500">
                              {habit.category}
                            </span>
                          </td>
                          {last7Days.map((dateStr) => {
                            const done = habit.completedDates.includes(dateStr);
                            return (
                              <td key={dateStr} className="py-3 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleHabitDate(habit.id, dateStr)}
                                  aria-label={`Toggle ${habit.title} for ${dateStr}`}
                                  className={`w-7 h-7 rounded-lg inline-flex items-center justify-center border transition-colors cursor-pointer ${
                                    done
                                      ? 'bg-emerald-700 border-emerald-700 text-white'
                                      : 'bg-stone-50 border-stone-300 text-transparent hover:border-emerald-500'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            );
                          })}
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Flame className="w-3.5 h-3.5 text-amber-600" /> {streak}d
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteHabit(habit.id)}
                              aria-label={`Delete habit ${habit.title}`}
                              className="p-1 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-5 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
            <span>
              <strong>Drift-Free Wall-Clock Timer:</strong> Remaining time is computed against monotonic epoch timestamps so background tab throttling never slows down your countdown.
            </span>
          </div>
          <div className="font-mono shrink-0">FocusGarden v1.0 • MIT License</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
