# Changelog

## [1.0.1] - 2026-10-20

### Changed
- **Dynamic Local Date & Day-Boundary Handling:** Replaced static initial dates with dynamic local calendar date calculation (`YYYY-MM-DD`) and automatic midnight/timezone rollover detection.
- **Consecutive Habit Streak Calculation:** Preserved active streaks when today's habit is not yet checked off and supported multi-week streaks across month/year boundaries.
- **Persistent Timer State & Reload Recovery:** Persisted active countdown state to `localStorage` so page reloads restore in-progress sessions or complete expired focus blocks without duplicating events.
- **Build & Test Tooling:** Upgraded Vite to v6 and Vitest to v4 with expanded DST, year-boundary, and reload regression tests.

## [1.0.0] - 2026-10-20

### Added
- **Drift-Free Wall-Clock Timer:** Monotonic timestamp delta calculation (`targetEndTimeMs - Date.now()`) + `visibilitychange` synchronization so background tab throttling never causes countdown drift.
- **Configurable Focus & Break Intervals:** Customize Focus, Short Break, Long Break, and Daily Focus Goal durations.
- **Botanical Growth Companion:** Dynamic SVG plant visualization that evolves from Dormant Seed to Flowering Canopy as daily focus minutes accumulate.
- **7-Day Habit Consistency Matrix & Focus Bar Chart:** Track daily habits with streak counters and inspect 7-day deep-work output.
