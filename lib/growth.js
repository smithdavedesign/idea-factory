// growth.js — the growth loop (RepoHQ docs/growth-loop-prd.md), its pure parts.
//
//   funnelOf     a built product's funnel (state.funnel) from idea_signals rows (lib/repohq.js funnelBySlug):
//                unique visitors per event for the last 7 days, the 7 before and all time, plus where
//                they came from. The pipeline saves it every tick it changes; RepoHQ, the morning email,
//                MCP and the launch skill read it.
//   signalsOf    a demand test's counts (state.signals) from the same rows, as decideValidation reads them.

const NONE = { events: 0, d7: 0, prev7: 0, all: 0 };

/** One event kind's counts in a funnelBySlug row; zeros when it never fired. */
const kindOf = (row, kind) => row?.kinds?.[kind] || NONE;

/** A demand test's counts: landing-page views, unique visitors who viewed, distinct signup emails (pure). */
function signalsOf(row) {
  return { views: kindOf(row, 'view').events, uniqueVisitors: kindOf(row, 'view').all, signups: kindOf(row, 'signup').all };
}

/** Whether an idea keeps a funnel: a product with a repo that is deployed or has had a visitor (pure). */
function tracksFunnel(state, row) {
  if (!state.repo || !['building', 'live'].includes(state.stage)) return false;
  return !!row || !!state.launch?.steps?.find((s) => s.id === 'deployed')?.done;
}

/**
 * A built product's funnel (pure). Visits are its beacon's `visit` events. A product that never had a
 * landing page also counts `view`: go-lives before 2026-10-12 sent one view from the home page, and the
 * query's "reach" counts each visitor once across both. `seen` says which events the beacon has ever
 * sent (an instrumented product sends visit; activate and checkout follow use).
 */
function funnelOf(row, state) {
  const visits = state.page ? 'visit' : 'reach';
  const window = (w) => ({ visit: kindOf(row, visits)[w], signup: kindOf(row, 'signup')[w], activate: kindOf(row, 'activate')[w], checkout: kindOf(row, 'checkout')[w] });
  // The old beacon sent the product's own pages as referrers (back to the home page); they aren't a source.
  const own = hostOf(state.launch?.steps?.find((s) => s.id === 'deployed')?.evidence);
  return {
    d7: window('d7'), prev7: window('prev7'), all: window('all'),
    seen: { visit: kindOf(row, 'visit').all > 0, activate: kindOf(row, 'activate').all > 0, checkout: kindOf(row, 'checkout').all > 0 },
    referrers7d: (row?.referrers7d || []).filter((r) => r.host !== own).slice(0, 5),
    // Visitors left out this week as a burst (lib/repohq.js cleanSignals): said, never silently dropped.
    ...(kindOf(row, 'burst').d7 ? { burst7d: kindOf(row, 'burst').d7 } : {}),
  };
}

/**
 * The hours a burst of referrer-less visitors still counts (pure): `hours` after each logged launch post, since a real
 * post's visitors often arrive with no referrer (Reddit's app). For lib/repohq.js cleanSignals' `exempt`.
 */
function burstExempt(postsBySlug, hours = 48) {
  const out = [];
  for (const [slug, posts] of Object.entries(postsBySlug || {})) {
    for (const p of posts || []) {
      const t = Date.parse(p?.postedAt);
      if (Number.isFinite(t)) out.push({ slug, from: new Date(t - 3_600_000).toISOString(), to: new Date(t + hours * 3_600_000).toISOString() });
    }
  }
  return out;
}

/** "tiebreak-phi.vercel.app" from a URL, without "www."; null for anything else. */
function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

/** Same funnel, ignoring when it was taken? So an unchanged funnel doesn't rewrite the record. */
const sameFunnel = (a, b) => JSON.stringify(a ? { ...a, at: undefined } : null) === JSON.stringify(b ? { ...b, at: undefined } : null);

/** "3 visitors this week (0 the week before), 0 activations, 0 Buy clicks" (pure). */
function funnelText(f) {
  const n = (x, w) => `${x} ${w}${x === 1 ? '' : 's'}`;
  return `${n(f.d7.visit, 'visitor')} this week (${f.prev7.visit} the week before), ${n(f.d7.activate, 'activation')}, ${n(f.d7.checkout, 'Buy click')}`
    + (f.burst7d ? `; ${f.burst7d} more left out as a burst of direct visits` : '');
}

// ── The daily growth step (bin/idea-pipeline.js step 5d) ─────────────────────────────────────────────
//
//   bottleneck     a focus product's stage and next mission, by the first matching rule
//   canStart       whether a mission may start: no build running, nothing waiting for David
//   newExperiment  the record a mission starts: hypothesis, metric, baseline, target, window
//   advance        experiments move on by themselves: a kit runs from its first post; stale ones are dropped
//   onMerge        a growth PR's merge starts its experiment; onClose abandons it
//   brief          what a growth build reads: the mission, the funnel, lessons and the playbook's rules

const DAY = 86_400_000;

/** What each kind of mission tries and how it's measured (docs/growth-loop-prd.md, "Rules"). */
const KINDS = {
  instrumentation: { executor: 'build', metric: 'beacon', label: 'funnel beacon',
    hypothesis: 'Counting visits on every page, first uses and Buy clicks shows where visitors drop off.' },
  kit: { executor: 'claude', metric: 'visit', label: 'launch kit',
    hypothesis: "Posting the kit's channels, a day or two apart, brings the product to 50 visitors a week." },
  seo: { executor: 'build', metric: 'visit', label: 'search pages',
    hypothesis: 'Pages that answer what the buyer searches bring visitors from search.' },
  landing: { executor: 'build', metric: 'activate', label: 'first screen',
    hypothesis: "A first screen in the buyer's words, with one button to the core action, gets more visitors to use it." },
  paywall: { executor: 'build', metric: 'checkout', label: 'paid offer placement',
    hypothesis: 'Showing the paid offer where the product proves its value turns active users into Buy clicks.' },
};

/** What a growth build is asked to do, per kind (pure). The builder gets this with the brief. */
function missionTask(kind, { slug, signalUrl = 'the RepoHQ signal URL' }) {
  switch (kind) {
    case 'instrumentation': return `Replace the product's visit beacon with the funnel beacon: POST JSON {"slug": "${slug}", "kind": "<kind>", "referrer": <referrer>} to ${signalUrl} (fire-and-forget, keepalive, no cookies) for "visit" on every public page once per browser session (sessionStorage), "activate" the first time someone uses the core action, once per browser (localStorage), and "checkout" when someone clicks Buy. The referrer is document.referrer only when its origin differs from location.origin, else null. Send nothing when navigator.webdriver is true, on preview deployments (Vercel's VERCEL_ENV isn't "production"; Next.js sees NEXT_PUBLIC_VERCEL_ENV), or when localStorage "repohq:notrack" is set. Put the send-or-not decision in a small pure function and unit-test it. Name the core action in GROWTH.md, and make the privacy page name the three events.`;
    case 'seo': return 'Add two or three public pages that answer what the buyer searches before they would find this product. Start from REVENUE.md (who pays) and RESEARCH.md (competitors, the threads where the pain shows): for example "<competitor> alternative", or the job in the buyer\'s own words. Check real searches with WebSearch if it is available, else work from RESEARCH.md. Each page gives genuinely useful content for that search (how to decide, what to compare, a worked example), has a unique title and meta description, a canonical URL, an entry in sitemap.xml, a link from the home page or footer, and a clear link to try the product. No keyword stuffing, no invented statistics or quotes. List the target searches in GROWTH.md.';
    case 'landing': return "Rework the home page's first screen for the buyer in REVENUE.md: a headline about their problem in their words, one sentence on what the product does, and one primary button that starts the core action in as few steps as possible (a pre-filled example beats an empty form). Remove what competes with that button. Keep the SEO tags, the legal links and the beacon.";
    case 'paywall': return "Show the paid offer where the product proves its value, for example right after a result: one honest line on what the paid tier adds, and the Buy button (from its env var, hidden when unset). Don't change the price, don't hard-code a payment link, and keep the free path working.";
    default: return '';
  }
}

/** The metric's value now, from the funnel's last 7 days: visitors, or a share of visitors (pure). */
function metricValue(funnel, metric) {
  const d7 = funnel?.d7 || {};
  if (metric === 'beacon') return funnel?.seen?.visit ? 1 : 0;
  if (metric === 'visit') return d7.visit ?? 0;
  return d7.visit ? Math.round(((d7[metric] ?? 0) / d7.visit) * 1000) / 1000 : 0;
}

/** What counts as a win: the traction bar for visitors, half as much again (with a floor) for a share. */
function targetFor(metric, baseline, gp = {}) {
  if (metric === 'beacon') return 1;
  if (metric === 'visit') return Math.max(gp.minVisitorsPerWeek ?? 50, baseline + 1);
  return Math.max(Math.round(baseline * 1.5 * 1000) / 1000, metric === 'checkout' ? 0.02 : 0.1);
}

/** "12 visitors a week", "8.0% of visitors", "beacon live" (pure). */
function valueText(metric, v) {
  if (metric === 'beacon') return v ? 'beacon live' : 'old beacon';
  if (metric === 'visit') return `${v} visitor${v === 1 ? '' : 's'} a week`;
  return `${(v * 100).toFixed(1)}% of visitors`;
}

/** A launch kit's channels in posting order, from its "## Order" list (RepoHQ factory/context/growth.ts reads it the same way). */
function kitChannels(kit) {
  const m = /^##\s+Order\s*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/m.exec(String(kit || ''));
  if (!m) return [];
  return m[1].split('\n').map((l) => /^\s*\d+\.\s+(.*)$/.exec(l)?.[1]).filter(Boolean)
    .map((l) => (/\*\*(.+?)\*\*/.exec(l)?.[1] ?? l.split(/[,:(]/)[0]).trim()).filter(Boolean);
}

/** Whether a logged post went to this kit channel; the names differ a little between the kit and the log. */
function samePlace(channel, logged) {
  const norm = (s) => String(s).toLowerCase().replace(/^https?:\/\/(www\.)?reddit\.com/, '').replace(/[^a-z0-9/]+/g, '');
  const a = norm(channel), b = norm(logged);
  return !!a && !!b && (a.includes(b) || b.includes(a));
}

/** The kit's channels and how many have a logged post (pure). */
function kitFacts(kit, log) {
  const channels = kitChannels(kit);
  const posts = Array.isArray(log?.posts) ? log.posts : [];
  return { channels: channels.length, posted: channels.filter((c) => posts.some((p) => samePlace(c, p.channel))).length };
}

/** An experiment abandoned because its run failed, not because David turned it down (pure). A growth build that never opened a PR always failed. */
const failedRun = (e) => e.status === 'abandoned' && (e.failed === true || (e.executor === 'build' && !e.prUrl));

/**
 * Whether the product runs the funnel beacon (pure): it has sent a `visit`, or its go-live was built with
 * the funnel beacon (state.golive.beacon), or a funnel-beacon growth build merged. With a handful of
 * visitors a week, the first `visit` can take days to arrive after the merge; the loop moves on meanwhile.
 */
function beaconLive(state) {
  if (state.funnel?.seen?.visit || state.golive?.beacon === 'funnel') return true;
  return (state.growth?.experiments || []).some((e) => e.kind === 'instrumentation' && ['running', 'measuring', 'decided'].includes(e.status));
}

/**
 * A focus product's stage and next mission (pure), by the first rule that matches:
 * launch → park → instrument → acquire → retain → activate → monetize. `kit` = kitFacts(...), `gp` =
 * policy.growth. The action is {kind, executor: 'build' | 'claude' | 'owner', metric?}, or null when the
 * mission for this stage has been tried and its result isn't in yet.
 */
function bottleneck(state, { kit = { channels: 0, posted: 0 }, gp = {}, now = new Date() } = {}) {
  const f = state.funnel || {};
  const d7 = f.d7 || {};
  const bar = gp.minVisitorsPerWeek ?? 50;
  const exps = state.growth?.experiments || [];
  const mission = (kind) => ({ kind, executor: KINDS[kind].executor, metric: KINDS[kind].metric });
  // Tried: there's an experiment of that kind, unless it was abandoned over a week ago (then it may come back).
  // Tried: there's an experiment of that kind. One David abandoned (closed its PR, never posted its kit)
  // counts for a week. One that failed to run (the sandbox, no changes, a crash) doesn't: the mission is
  // tried again the next day, unless it failed three times this week.
  const failedRuns = (kind) => exps.filter((e) => e.kind === kind && failedRun(e) && now - new Date(e.updatedAt || e.createdAt) < 7 * DAY).length;
  const tried = (kind) => failedRuns(kind) >= 3
    || exps.some((e) => e.kind === kind && (e.status !== 'abandoned' || (!failedRun(e) && now - new Date(e.updatedAt || e.createdAt) < 7 * DAY)));
  const recentKit = exps.some((e) => e.kind === 'kit' && e.status !== 'abandoned' && now - new Date(e.createdAt) < (gp.experimentDays?.default ?? 14) * DAY);
  if (state.stage === 'validate') return { stage: 'acquire', bottleneck: 'a demand test short of visitors', action: kit.channels || recentKit ? null : mission('kit') };
  if (!state.launch?.steps?.find((s) => s.id === 'launchReady')?.done) return { stage: 'launch', bottleneck: 'not launch-ready yet: the go-live build and its audit come first', action: null };
  const n = gp.parkAfterNoLift ?? 2;
  const decided = exps.filter((e) => e.status === 'decided');
  if (decided.length >= n && decided.slice(-n).every((e) => e.result?.lift === false)) return { stage: 'park', bottleneck: `the last ${n} experiments moved nothing`, action: { kind: 'park', executor: 'owner' } };
  if (!beaconLive(state)) return { stage: 'instrument', bottleneck: "its beacon only counts home-page views, so activations and Buy clicks aren't measured", action: tried('instrumentation') ? null : mission('instrumentation') };
  const visits = d7.visit ?? 0;
  if (visits < bar) {
    const why = `${visits} visitor${visits === 1 ? '' : 's'} this week, under ${bar}`;
    if (!kit.channels && !recentKit) return { stage: 'acquire', bottleneck: why, action: mission('kit') };
    if (!tried('seo')) return { stage: 'acquire', bottleneck: why, action: mission('seo') };
    if (kit.channels && kit.posted >= kit.channels && !recentKit) return { stage: 'acquire', bottleneck: why, action: mission('kit') };
    return { stage: 'acquire', bottleneck: why, action: kit.posted < kit.channels ? { kind: 'post', executor: 'owner' } : null };
  }
  if ((d7.checkout ?? 0) > 0 || (state.revenue?.mrr ?? 0) > 0) return { stage: 'retain', bottleneck: 'people click Buy: keep it working and talk to the buyers', action: null };
  if ((d7.activate ?? 0) + (d7.signup ?? 0) === 0) return { stage: 'activate', bottleneck: `${visits} visitors this week and nobody used the core action`, action: tried('landing') ? null : mission('landing') };
  return { stage: 'monetize', bottleneck: `${d7.activate ?? 0} active users this week and no Buy clicks`, action: tried('paywall') ? null : mission('paywall') };
}

/**
 * Whether a mission may start on this product (pure): no build running or PR open, and nothing waiting for
 * David (a proposed experiment: a growth PR not merged yet, or a kit nobody has posted from). Experiments
 * being measured don't block; their windows overlap and Phase 3's judge notes it.
 */
function canStart(state) {
  const b = state.build || {};
  if (b.status === 'running' || b.status === 'pr-open') return false;
  return !(state.growth?.experiments || []).some((e) => e.status === 'proposed');
}

/** Whether today still has room for a mission (pure): policy.growth.auto, maxMissionsPerDay, and notBefore unless forced. */
function growthDue(pg, now, gp = {}, { force = false } = {}) {
  if (gp.auto === false) return false;
  const runs = pg?.date === now.toLocaleDateString('en-CA') ? pg.runs : 0;
  if (runs >= (gp.maxMissionsPerDay ?? 2)) return false;
  if (force) return true;
  const [h, m = 0] = String(gp.notBefore || '10:00').split(':').map(Number);
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}

/** Growth builds started in the last 7 days across ideas (policy.growth.maxBuildsPerWeek). */
function growthBuildsThisWeek(states, now) {
  return states.flatMap((s) => s.growth?.experiments || []).filter((e) => e.executor === 'build' && e.status !== 'abandoned' && now - new Date(e.createdAt) < 7 * DAY).length;
}

/** The experiment a mission starts (pure): id <slug>-<yyyymmdd>-<kind>, the baseline from this week's funnel. */
function newExperiment(slug, action, state, gp = {}, now = new Date()) {
  const spec = KINDS[action.kind];
  const baseline = metricValue(state.funnel, spec.metric);
  return {
    id: `${slug}-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${action.kind}`,
    kind: action.kind, executor: spec.executor, hypothesis: spec.hypothesis, metric: spec.metric,
    baseline, target: targetFor(spec.metric, baseline, gp), windowDays: gp.experimentDays?.[action.kind] ?? gp.experimentDays?.default ?? 14,
    status: 'proposed', createdAt: now.toISOString(), updatedAt: now.toISOString(),
  };
}

/**
 * Experiments move on by themselves (pure). A proposed kit starts running at its first post after it was
 * written, and is abandoned after policy.growth.proposedMaxDays without one. A growth build that never
 * opened a PR (it failed or crashed) is abandoned after a day.
 */
function advance(exps, { posts = [], now = new Date(), gp = {}, funnel = null } = {}) {
  const maxDays = gp.proposedMaxDays ?? 7;
  return exps.map((e0) => {
    if (e0.status !== 'proposed') return e0;
    // Until it starts, an experiment's baseline is the funnel as it is now, so a figure taken mid-burst or on a
    // product's first day doesn't stick (2026-10-16: botchelor's kit started from a crawler sweep's 15).
    const now7 = funnel ? metricValue(funnel, e0.metric) : e0.baseline;
    const e = now7 === e0.baseline ? e0 : { ...e0, baseline: now7, target: targetFor(e0.metric, now7, gp) };
    const age = now - new Date(e.createdAt);
    if (e.kind === 'kit') {
      const first = posts.map((p) => p.postedAt).filter((t) => typeof t === 'string' && t > e.createdAt).sort()[0];
      if (first) return { ...e, status: 'running', startedAt: first, endsAt: new Date(new Date(first).getTime() + e.windowDays * DAY).toISOString(), updatedAt: now.toISOString() };
      if (age > maxDays * DAY) return { ...e, status: 'abandoned', reason: `no post within ${maxDays} days of the kit`, updatedAt: now.toISOString() };
      return e;
    }
    if (e.executor === 'build' && !e.prUrl && age > DAY) return { ...e, status: 'abandoned', failed: true, reason: e.reason || 'the build never opened a PR', updatedAt: now.toISOString() };
    return e;
  });
}

const settle = (growth, id, change) => ({ ...growth, experiments: (growth?.experiments || []).map((e) => (e.id === id ? { ...e, ...change } : e)) });

/** A growth PR merged: its experiment runs for its window from now (pure). */
function onMerge(growth, id, now) {
  const e = (growth?.experiments || []).find((x) => x.id === id);
  if (!e) return growth;
  return settle(growth, id, { status: 'running', startedAt: now.toISOString(), endsAt: new Date(now.getTime() + e.windowDays * DAY).toISOString(), updatedAt: now.toISOString() });
}

/** A growth PR closed without merging: its experiment is abandoned (pure). */
const onClose = (growth, id, now) => settle(growth, id, { status: 'abandoned', reason: 'the PR was closed without merging', updatedAt: now.toISOString() });

/** The growth record with the experiment behind a reverted PR marked decided "revert" (pure). */
function markReverted(growth, prUrl, { url = null, reason = '', now = new Date() } = {}) {
  return { ...growth, experiments: (growth?.experiments || []).map((e) => (e.prUrl === prUrl && e.status !== 'decided'
    ? { ...e, status: 'decided', decision: 'revert', decidedAt: now.toISOString(), reverted: { at: now.toISOString(), url }, result: { ...(e.result || {}), lift: false, note: reason }, updatedAt: now.toISOString() }
    : e)) };
}

/** Same growth record, ignoring when it was checked? So an unchanged one doesn't rewrite the record. */
const sameGrowth = (a, b) => JSON.stringify(a ? { ...a, checkedAt: undefined } : null) === JSON.stringify(b ? { ...b, checkedAt: undefined } : null);

// ── Phase 3: judging experiments when their windows end ─────────────────────────────────────────────

/**
 * An experiment's result (pure), comparing the window before it started with its own window, both of
 * windowDays (lib/repohq.js funnelWindow: unique visitors per kind). `page`: the product had a landing
 * page, so visits are the beacon's `visit` only (else "reach", which counts old home-page views too).
 * Returns {decision: keep | iterate | revert | extend, lift: true | false | null, value, before, sample, note}:
 *   beacon   kept once a `visit` arrives; extended once without one, then inconclusive (no traffic isn't failure)
 *   visit    visitors a week against the target: met → keep; else iterate, lift = better than before
 *   a share  needs gp.minSampleVisits visitors in the window (extended once, then inconclusive); target met →
 *            keep; 30% or more worse than before on a first screen or paid offer → revert; else iterate
 */
function judge(exp, before, after, gp = {}, { page = false } = {}) {
  const visitsOf = (w) => (page ? w.visit : w.reach) ?? 0;
  const perWeek = (n) => Math.round((n * 7) / exp.windowDays);
  const canExtend = (exp.extensions ?? 0) < (gp.maxExtensions ?? 1);
  if (exp.metric === 'beacon') {
    if ((after.visit ?? 0) > 0) return { decision: 'keep', lift: true, value: 1, before: 0, sample: after.visit, note: `${after.visit} visit${after.visit === 1 ? '' : 's'} counted by the new beacon` };
    return canExtend ? { decision: 'extend', note: 'no visit yet to confirm the beacon' } : { decision: 'iterate', lift: null, value: 0, before: 0, sample: 0, note: 'no visit in its window, so the beacon is unconfirmed' };
  }
  if (exp.metric === 'visit') {
    const value = perWeek(visitsOf(after));
    const was = perWeek(visitsOf(before));
    return { decision: value >= exp.target ? 'keep' : 'iterate', lift: value > was, value, before: was, sample: visitsOf(after) };
  }
  const sample = visitsOf(after);
  if (sample < (gp.minSampleVisits ?? 30)) {
    return canExtend ? { decision: 'extend', note: `${sample} visitors, under the ${gp.minSampleVisits ?? 30} needed to judge a share` }
      : { decision: 'iterate', lift: null, value: null, before: null, sample, note: `only ${sample} visitors in its window: not enough to judge` };
  }
  const rate = (w) => (visitsOf(w) ? Math.round(((w[exp.metric] ?? 0) / visitsOf(w)) * 1000) / 1000 : 0);
  const value = rate(after);
  const was = rate(before);
  const enoughBefore = visitsOf(before) >= (gp.minSampleVisits ?? 30);
  if (value >= exp.target) return { decision: 'keep', lift: true, value, before: was, sample };
  if (enoughBefore && was > 0 && value <= was * 0.7 && ['landing', 'paywall'].includes(exp.kind)) return { decision: 'revert', lift: false, value, before: was, sample, note: 'at least 30% worse than before' };
  return { decision: 'iterate', lift: value > was, value, before: was, sample };
}

/** The product's other experiments whose windows overlapped this one's (pure): what else could explain a result. */
function ranWith(exp, all) {
  const from = new Date(exp.startedAt), to = new Date(exp.endsAt);
  return all.filter((e) => e.id !== exp.id && e.startedAt && new Date(e.startedAt) < to && new Date(e.endsAt || e.startedAt) > from).map((e) => KINDS[e.kind]?.label || e.kind);
}

/** One line for LEARNINGS.md (pure): date, mission, decision, the numbers, the hypothesis, what ran alongside. */
function learningEntry(exp, result, { now = new Date(), alongside = [] } = {}) {
  const numbers = result.value === null || result.value === undefined ? result.note
    : `${valueText(exp.metric, result.before ?? exp.baseline)} → ${valueText(exp.metric, result.value)} (target ${valueText(exp.metric, exp.target)})`;
  return `- ${now.toISOString().slice(0, 10)} · ${KINDS[exp.kind]?.label || exp.kind} (${exp.id}) · ${result.decision}: ${numbers}. ${exp.hypothesis}${alongside.length ? ` Ran alongside: ${alongside.join(', ')}.` : ''}`;
}

/** LEARNINGS.md with one more entry (pure); the file starts with a header the first time. */
function withLearning(md, slug, entry) {
  const head = `# Learnings: ${slug}\n\nWhat each growth experiment showed, oldest first. The growth loop writes this (RepoHQ docs/growth-loop-prd.md); RepoHQ shows it on the idea's page.\n`;
  return `${(md && md.trim() ? md.trimEnd() : head.trimEnd())}\n${md && md.trim() ? '' : '\n'}${entry}\n`;
}

/**
 * PLAYBOOK.md with a proposed rule from a kept experiment (pure), under "## Proposed": David moves it up to
 * Rules, rewords it or deletes it. The same hypothesis from the same product is proposed once.
 */
function withProposal(md, line) {
  const text = String(md || '');
  if (text.includes(line.split(' (kept on')[0])) return text;
  const lines = text.split('\n');
  const i = lines.findIndex((l) => /^##\s+Proposed\s*$/.test(l));
  if (i < 0) return `${text.trimEnd()}\n\n## Proposed\n\n${line}\n`;
  let j = lines.findIndex((l, k) => k > i && /^##\s/.test(l));
  if (j < 0) j = lines.length;
  const kept = lines.slice(i + 1, j).filter((l) => l.trim() && l.trim() !== 'None yet.');
  return [...lines.slice(0, i + 1), '', ...kept, line, '', ...lines.slice(j)].join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n*$/, '\n');
}

/** The "## Rules" section of PLAYBOOK.md: what David accepted; proposals stay out of briefs. */
function playbookRules(md) {
  const m = /^##\s+Rules\s*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/m.exec(String(md || ''));
  return m ? m[1].trim() : '';
}

/**
 * What a growth build reads before it starts (pure): the mission and its experiment, the product's funnel,
 * what this product learned, the playbook's rules, and how the same kind of experiment went elsewhere.
 * Counts and site names only: never emails or visitor hashes.
 */
function brief({ slug, exp, state, task, learnings = '', playbook = '', others = [] }) {
  const f = state.funnel;
  const rules = playbookRules(playbook);
  return [`# Growth brief: ${slug}, ${KINDS[exp.kind].label}`, '',
    '## Mission', task, '',
    '## The experiment',
    `- Hypothesis: ${exp.hypothesis}`,
    `- Metric: ${valueText(exp.metric, exp.baseline)} now; the target is ${valueText(exp.metric, exp.target)} within ${exp.windowDays} days of the merge.`,
    '- One change only, so the result says what worked.', '',
    '## The funnel (unique visitors; the last 7 days, the 7 before, all time)',
    f ? `- ${funnelText(f)}; ${f.all.visit} visitors, ${f.all.activate} activations and ${f.all.checkout} Buy clicks in all.` : '- No funnel yet.',
    f?.referrers7d?.length ? `- This week's sources: ${f.referrers7d.map((r) => `${r.host} ${r.visitors}`).join(', ')}.` : '- No sources this week.', '',
    `## What ${slug} learned so far (LEARNINGS.md)`, learnings.trim() || 'Nothing yet: this is its first experiment.', '',
    "## The playbook's rules (PLAYBOOK.md)", rules || 'None yet.', '',
    `## The same kind of experiment on other products`,
    ...(others.length ? others.map((o) => `- ${o.slug}: ${o.hypothesis} → ${o.decision || o.status}${o.reason ? ` (${o.reason})` : ''}`) : ['None yet.']),
  ].join('\n');
}

module.exports = {
  funnelOf, burstExempt, signalsOf, tracksFunnel, sameFunnel, funnelText,
  KINDS, missionTask, metricValue, targetFor, valueText, kitChannels, kitFacts, beaconLive, bottleneck, canStart, growthDue, growthBuildsThisWeek,
  newExperiment, advance, onMerge, onClose, sameGrowth, playbookRules, brief,
  judge, ranWith, learningEntry, withLearning, withProposal, markReverted,
};
