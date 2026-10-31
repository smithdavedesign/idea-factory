// usage-limit.js — when the Claude subscription is at its usage limit, builds wait for the reset instead of
// shipping half-built work. On 2026-10-31 tiebreak's feature build ran into the limit mid-run, opened a PR
// with failing tests, and its plan item counted a failed run toward being dropped; pr-split's go-live the
// day before went the same way. David's call (2026-10-31): pause at the limit, resume first after the reset.
//
// A build that hits the limit is recorded as `paused` (no PR, no retry penalty, no failed run against its
// plan item), and the tick holds every build it would start by itself until the reset (pstate.usageHold).
// "Start build now" requests aren't held: David may choose to try anyway.

const HOUR = 3_600_000;
const BUFFER_MS = 5 * 60_000; // a few minutes past the stated reset
const FALLBACK_HOURS = 5; // Claude's usage window, when the message names no reset time

/** True when a run's failure reads as the subscription's usage or spend limit (pure). */
function isUsageLimit(reason) {
  const t = String(reason || '');
  return /usage limit|spend limit|hit your .{0,40}limit|limit (will )?resets?|out of (extra )?usage|claude ai usage limit reached/i.test(t);
}

/** The UTC offset (ms) of `timeZone` at instant `ms` (pure, via Intl). */
function offsetAt(ms, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(ms)).filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]));
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - Math.floor(ms / 1000) * 1000;
}

/**
 * When the limit resets (pure): "resets 4pm (UTC)", "resets 10:30am (America/Los_Angeles)" → the next such
 * moment after `now`, plus a few minutes. Anything else → now + FALLBACK_HOURS. A weekly limit named only by
 * its hour resumes at the next one; if that's too early the first build fails at once and holds again.
 */
function resumeAt(reason, now = new Date()) {
  const m = String(reason || '').match(/resets?\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*(?:\(([^)]+)\))?/i);
  const t = now.getTime();
  if (m) {
    let h = Number(m[1]) % 12;
    if (m[3].toLowerCase() === 'pm') h += 12;
    const min = Number(m[2] || 0);
    let tz = (m[4] || 'UTC').trim();
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { tz = 'UTC'; }
    for (let day = -1; day <= 7; day += 1) {
      const d = new Date(t + day * 24 * HOUR);
      const guess = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, min);
      const at = guess - offsetAt(guess, tz);
      if (at > t) return new Date(at + BUFFER_MS);
    }
  }
  return new Date(t + FALLBACK_HOURS * HOUR);
}

/** The hold after `results` (pure): the latest resumeAt of any usage-limited result, kept if already later. */
function holdAfter(hold, results = []) {
  const limited = results.filter((r) => r && r.usageLimited && r.resumeAt);
  if (!limited.length) return hold || null;
  const latest = limited.reduce((a, b) => (new Date(b.resumeAt) > new Date(a.resumeAt) ? b : a));
  if (hold?.until && new Date(hold.until) >= new Date(latest.resumeAt)) return hold;
  return { until: new Date(latest.resumeAt).toISOString(), reason: String(latest.reason || '').slice(0, 200), slug: latest.slug || null };
}

/** True while the hold applies (pure). */
function holdActive(hold, now = new Date()) {
  return !!hold?.until && new Date(hold.until) > now;
}

module.exports = { isUsageLimit, resumeAt, holdAfter, holdActive };
