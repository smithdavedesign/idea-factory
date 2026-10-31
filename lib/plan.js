// plan.js — the weekly plan per focus product (RepoHQ docs/growth-loop-prd.md, "Feature loop"; David's call on
// 2026-10-19). Once a week, at night, a headless Claude run (bin/idea-plan.js) turns the funnel's bottleneck into
// 2–3 features, each with the number it should move and acceptance criteria a test can check, in PLAN.md. The
// growth step builds one item a night per product (a "feature" mission, lib/growth.js), and each merged item is an
// experiment judged when its window ends, so the next plan starts from what worked.
//
//   parsePlan   PLAN.md → {ok, items} (the fenced json block under "## Items"), validated
//   planDue     whether a product needs a new plan
//   itemStatus  where an item stands, from the experiments its builds started
//   nextItem    the item to build next, or null

const DAY = 86_400_000;
const METRICS = ['visit', 'activate', 'checkout'];
const SIZES = ['S', 'M', 'L'];
const MAX_FAILED_RUNS = 3;

/** One item, checked and normalized; null with why when it can't be built from. */
function normalizeItem(raw, i) {
  if (!raw || typeof raw !== 'object') return { error: `item ${i + 1} isn't an object` };
  const id = String(raw.id || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const title = String(raw.title || '').trim().slice(0, 120);
  const why = String(raw.why || '').trim().slice(0, 400);
  const acceptance = (Array.isArray(raw.acceptance) ? raw.acceptance : []).map((a) => String(a).trim()).filter(Boolean).slice(0, 8);
  if (!id || !title) return { error: `item ${i + 1} needs an id and a title` };
  if (!METRICS.includes(raw.metric)) return { error: `${id}: metric must be one of ${METRICS.join(', ')}` };
  if (acceptance.length < 2) return { error: `${id}: needs at least 2 acceptance criteria` };
  const windowDays = Math.min(Math.max(Number(raw.windowDays) || 14, 7), 28);
  return {
    item: {
      id, title, why, metric: raw.metric, acceptance, windowDays,
      size: SIZES.includes(raw.size) ? raw.size : 'M',
      // Payment code (Stripe, checkout, prices) is built, but only David merges it (lib/autonomy.js).
      payments: raw.payments === true,
      ...(Number.isFinite(Number(raw.target)) && Number(raw.target) > 0 ? { target: Number(raw.target) } : {}),
    },
  };
}

/** PLAN.md → {ok, items, errors} (pure). The items are the fenced ```json array under "## Items". */
function parsePlan(text, { maxItems = 3 } = {}) {
  const m = /^##\s+Items\s*\n[\s\S]*?```json\s*\n([\s\S]*?)\n```/m.exec(String(text || ''));
  if (!m) return { ok: false, items: [], errors: ['no "## Items" section with a ```json block'] };
  let raw;
  try { raw = JSON.parse(m[1]); } catch (e) { return { ok: false, items: [], errors: [`the items aren't valid JSON: ${e.message}`] }; }
  if (!Array.isArray(raw)) return { ok: false, items: [], errors: ['the items block must be a JSON array'] };
  const errors = [];
  const items = [];
  for (const [i, r] of raw.slice(0, maxItems).entries()) {
    const n = normalizeItem(r, i);
    if (n.error) errors.push(n.error);
    else if (items.some((x) => x.id === n.item.id)) errors.push(`${n.item.id}: duplicate id`);
    else items.push(n.item);
  }
  return { ok: items.length > 0, items, errors };
}

/**
 * Where an item stands (pure), from the experiments its builds started (`item.attempts`, newest last):
 * planned (never tried), building (a build or its PR open), shipped (merged, being measured), decided (judged),
 * failed (its build failed: tried again the next night, up to MAX_FAILED_RUNS), dropped (David closed its PR, or
 * it failed too often).
 */
function itemStatus(item, experiments = []) {
  const attempts = (item.attempts || []).map((id) => experiments.find((e) => e.id === id)).filter(Boolean);
  const last = attempts[attempts.length - 1];
  if (!last) return { status: 'planned' };
  // A run paused at the Claude usage limit (lib/usage-limit.js) isn't a failure of the item.
  const failedRuns = attempts.filter((e) => e.status === 'abandoned' && e.failed && !e.paused).length;
  if (last.status === 'proposed') return { status: 'building', experiment: last };
  if (['running', 'measuring'].includes(last.status)) return { status: 'shipped', experiment: last };
  if (last.status === 'decided') return { status: 'decided', experiment: last };
  if (last.status === 'abandoned' && last.failed) return failedRuns >= MAX_FAILED_RUNS ? { status: 'dropped', experiment: last, reason: `its build failed ${failedRuns} times` } : { status: 'failed', experiment: last };
  return { status: 'dropped', experiment: last, reason: last.reason || 'its PR was closed' };
}

/** The next item to build (pure): the first planned one, or a failed one whose last attempt was over 12 hours ago. */
function nextItem(plan, experiments = [], now = new Date()) {
  for (const item of plan?.items || []) {
    const st = itemStatus(item, experiments);
    if (st.status === 'planned') return item;
    if (st.status === 'failed' && (st.experiment.paused || now - new Date(st.experiment.updatedAt || st.experiment.createdAt) > DAY / 2)) return item;
    if (st.status === 'building') return null; // one at a time per product
  }
  return null;
}

/**
 * Whether a product needs a new plan (pure): none yet, older than maxAgeDays, or nothing left to build in it (every
 * item shipped, decided or dropped). Not while one of its items is building.
 */
function planDue(plan, experiments = [], { maxAgeDays = 7, now = new Date() } = {}) {
  if (!plan?.items?.length) return { due: true, reason: 'no plan yet' };
  const statuses = plan.items.map((i) => itemStatus(i, experiments).status);
  if (statuses.includes('building')) return { due: false, reason: 'an item is being built' };
  if (now - new Date(plan.at) >= maxAgeDays * DAY) return { due: true, reason: `the plan is ${Math.floor((now - new Date(plan.at)) / DAY)} days old` };
  if (statuses.every((s) => ['shipped', 'decided', 'dropped'].includes(s))) return { due: true, reason: 'every item is built or dropped' };
  return { due: false, reason: 'items left to build' };
}

/** The plan with `expId` recorded as the latest attempt at `itemId` (pure). */
function withAttempt(plan, itemId, expId) {
  return { ...plan, items: plan.items.map((i) => (i.id === itemId ? { ...i, attempts: [...(i.attempts || []), expId] } : i)) };
}

/** "visitor-pages (shipped), first-run (planned)" — the plan in one line, for logs and the email (pure). */
function planText(plan, experiments = []) {
  return (plan?.items || []).map((i) => `${i.title} (${itemStatus(i, experiments).status})`).join('; ');
}

module.exports = { METRICS, MAX_FAILED_RUNS, parsePlan, itemStatus, nextItem, planDue, withAttempt, planText };
