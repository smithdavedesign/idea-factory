// schedule.js — when the pipeline starts work by itself (policy.schedule; David's call on 2026-10-19: "spread out
// agent tasks throughout the night and day, but mostly at night").
//
//   windowAt   which window an instant falls in: night, day, or quiet (the hours David is likely using the Mac
//              and the subscription himself)
//   mayStart   whether a kind of job may start now, within its window's cap
//   counted    the window's start counts after one more start
//
// Night (22:00–07:00) carries most of the work: feature builds, the weekly plans, go-lives and MVP builds. Day
// (12:00–17:00) gets a smaller share. Quiet hours start nothing automatic. "Start build now" requests ignore all
// of this: David asked for them. `off: true` switches the windows off (any time, no caps).

const DEFAULTS = {
  night: { from: '22:00', to: '07:00' },
  day: { from: '12:00', to: '17:00' },
  starts: {
    auto: { night: 6, day: 2 },
    feature: { night: 2, day: 1 },
    growth: { night: 2, day: 1 },
    plan: { night: 2, day: 0 },
    kit: { night: 0, day: 2 },
  },
};

const minutes = (hhmm) => { const [h, m = 0] = String(hhmm).split(':').map(Number); return h * 60 + m; };
const localDate = (d) => d.toLocaleDateString('en-CA');

/** Whether `now` (local time) is inside [from, to), which may wrap past midnight. */
function inside(now, { from, to }) {
  const t = now.getHours() * 60 + now.getMinutes();
  const a = minutes(from), b = minutes(to);
  return a <= b ? t >= a && t < b : t >= a || t < b;
}

/**
 * The window at `now` (pure) and its key: a night is named by the date it starts on, so 02:00 on the 20th is
 * the night of the 19th, and a day by its date. Quiet hours have a key too, though nothing starts in them.
 */
function windowAt(now, sched = {}) {
  const night = sched.night || DEFAULTS.night;
  const day = sched.day || DEFAULTS.day;
  if (inside(now, night)) {
    const start = now.getHours() * 60 + now.getMinutes() < minutes(night.from) ? new Date(now.getTime() - 86_400_000) : now;
    return { name: 'night', key: `night:${localDate(start)}` };
  }
  if (inside(now, day)) return { name: 'day', key: `day:${localDate(now)}` };
  return { name: 'quiet', key: `quiet:${localDate(now)}` };
}

/** This window's cap for a kind (pure): 0 in quiet hours and for unknown kinds. */
function capFor(kind, windowName, sched = {}) {
  if (windowName === 'quiet') return 0;
  const starts = { ...DEFAULTS.starts, ...(sched.starts || {}) };
  return Number(starts[kind]?.[windowName] ?? 0);
}

/**
 * Whether a `kind` of job may start now (pure). `state` is pstate.schedule: {key, starts: {kind: n}} for the
 * current window; a different key means a new window with nothing started yet. → {ok, reason, window}.
 */
function mayStart(kind, now, state = {}, sched = {}) {
  const w = windowAt(now, sched);
  if (sched.off === true) return { ok: true, window: w, reason: null }; // the windows switched off: any time, no caps
  const cap = capFor(kind, w.name, sched);
  const used = state.key === w.key ? state.starts?.[kind] ?? 0 : 0;
  if (cap <= 0) return { ok: false, window: w, reason: w.name === 'quiet' ? `quiet hours: ${kind} jobs start at night (${(sched.night || DEFAULTS.night).from}–${(sched.night || DEFAULTS.night).to}) and in the day window (${(sched.day || DEFAULTS.day).from}–${(sched.day || DEFAULTS.day).to})` : `no ${kind} jobs in the ${w.name} window` };
  if (used >= cap) return { ok: false, window: w, reason: `${used} ${kind} job${used === 1 ? '' : 's'} already started this ${w.name} (the cap is ${cap})` };
  return { ok: true, window: w, reason: null };
}

/** The window's counts after one more `kind` start at `now` (pure). */
function counted(kind, now, state = {}, sched = {}) {
  const w = windowAt(now, sched);
  const starts = state.key === w.key ? { ...(state.starts || {}) } : {};
  starts[kind] = (starts[kind] ?? 0) + 1;
  return { key: w.key, starts };
}

module.exports = { DEFAULTS, windowAt, capFor, mayStart, counted };
