// revenue.js — the road from "M1 merged" to the first dollar, for each idea (pure).
//
//   revenue.json  the plan bin/idea-revenue.js writes once M1 merges: who pays, the price, what must
//                 exist before charging, where to launch. validatePlan checks it.
//   state.launch  the checklist the pipeline refreshes every tick (launchChecklist): each step says
//                 whose it is (an agent's or David's), whether it's done, and how we know. The page,
//                 the morning email and the build queue read it.
//   revenueScore  how close an idea is to money: the build queue (weekly slot, approved builds)
//                 goes to the idea closest to its first dollar, not the one approved first.

/** The plan's shape; returns {ok, plan} or {ok:false, errors}. */
function validatePlan(raw) {
  const errors = [];
  const p = raw && typeof raw === 'object' ? raw : {};
  const str = (k, min = 3) => { if (typeof p[k] !== 'string' || p[k].trim().length < min) errors.push(`${k} missing`); };
  str('buyer', 8);
  str('paymentMethod');
  str('mvpScope', 8);
  str('firstTenUsers', 8);
  const price = p.price || {};
  if (typeof price.amount !== 'number' || price.amount < 0) errors.push('price.amount must be a number');
  if (!['month', 'year', 'once'].includes(price.interval)) errors.push('price.interval must be month, year or once');
  if (!Array.isArray(p.mustHaveBeforeCharging) || !p.mustHaveBeforeCharging.length) errors.push('mustHaveBeforeCharging must list something');
  if (!Array.isArray(p.launchChannels) || !p.launchChannels.length) errors.push('launchChannels must list something');
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    plan: {
      buyer: p.buyer.trim(), paymentMethod: p.paymentMethod.trim(), mvpScope: p.mvpScope.trim(), firstTenUsers: p.firstTenUsers.trim(),
      price: { amount: price.amount, currency: (price.currency || 'USD').toUpperCase(), interval: price.interval, why: String(price.why || '') },
      mustHaveBeforeCharging: p.mustHaveBeforeCharging.map(String).slice(0, 12),
      launchChannels: p.launchChannels.slice(0, 8).map((c) => (typeof c === 'string' ? { name: c } : { name: String(c.name || ''), url: c.url ? String(c.url) : undefined, why: c.why ? String(c.why) : undefined })),
      risks: Array.isArray(p.risks) ? p.risks.map(String).slice(0, 8) : [],
      killCriteria: typeof p.killCriteria === 'string' ? p.killCriteria : '',
    },
  };
}

/** "$19/month", "$49 once" (pure). */
function priceText(price) {
  if (!price) return '';
  const amount = price.currency === 'USD' || !price.currency ? `$${price.amount}` : `${price.amount} ${price.currency}`;
  return price.interval === 'once' ? `${amount} once` : `${amount}/${price.interval}`;
}

/** ROADMAP.md's milestones, in order. */
const roadmapMilestones = (md) => [...String(md || '').matchAll(/^#{2,3}\s*(M\d+)\b/gm)].map((m) => m[1]).filter((m, i, a) => a.indexOf(m) === i);

/**
 * The checklist from M1 merged to the first payment (pure). `facts` are what the tick found:
 *   plan        validated revenue plan, or null
 *   roadmap     ROADMAP.md text
 *   repo        {homepage, stripeProductId, mrr} from RepoHQ's repositories row, or null
 *   liveUrl     a URL that answered (the homepage, or <slug>.vercel.app), or null
 *   legal       {privacy, terms} found in the repo tree, or null when not checked
 *   launchPosts number of posts in launch-log.json
 *   signups     signups from idea_signals
 *   activations unique visitors who used the product's core action (state.funnel, the beacon's "activate")
 *   audit       the live launch audit (lib/golive.js auditLaunch), or null before the product is live
 */
function launchChecklist(state, facts = {}) {
  const { plan = null, roadmap = '', repo = null, liveUrl = null, legal = null, launchPosts = 0, signups = 0, activations = 0, audit = null } = facts;
  const liveLegal = !!audit && audit.checks.some((c) => c.id === 'privacy' && c.ok) && audit.checks.some((c) => c.id === 'terms' && c.ok);
  const milestones = roadmapMilestones(roadmap);
  const done = new Set(state.milestonesDone || []);
  const mvpDone = milestones.length > 0 && milestones.every((m) => done.has(m));
  const mrr = Number(repo?.mrr ?? state.revenue?.mrr ?? 0);
  const steps = [
    { id: 'plan', owner: 'agent', label: 'Road-to-revenue plan written', done: !!plan, evidence: plan ? `${plan.buyer.slice(0, 80)} · ${priceText(plan.price)}` : 'written after M1 merges' },
    { id: 'mvp', owner: 'agent', label: 'MVP built: every roadmap milestone merged', done: mvpDone, evidence: milestones.length ? `${milestones.filter((m) => done.has(m)).length}/${milestones.length} milestones merged` : 'no roadmap milestones' },
    { id: 'deployed', owner: 'agent', label: 'Live on a free tier', done: !!liveUrl, evidence: liveUrl || 'no live URL answered yet (Vercel project via the credential broker)' },
    { id: 'legal', owner: 'agent', label: 'Privacy policy and terms pages', done: !!(legal?.privacy && legal?.terms) || liveLegal, evidence: liveLegal ? 'live on the site' : legal ? `privacy ${legal.privacy ? '✓' : '✗'} · terms ${legal.terms ? '✓' : '✗'}` : 'not checked yet' },
    { id: 'launchReady', owner: 'agent', label: 'Launch-ready: SEO basics, share image, sitemap, privacy and terms live', done: !!audit?.ready,
      evidence: audit ? `${audit.passed}/${audit.total} launch checks${audit.missing.length ? ` · missing: ${audit.missing.join(', ')}` : ''}` : 'checked once it\'s live (the go-live build adds what\'s missing)' },
    { id: 'price', owner: 'david', label: plan ? `Price: ${priceText(plan.price)} (from the plan)` : 'Price decided', done: !!plan && plan.price.amount > 0, evidence: plan?.price.why ? plan.price.why.slice(0, 120) : '' },
    { id: 'payments', owner: 'david', label: 'Stripe product created and mapped to the repo in RepoHQ', done: !!repo?.stripeProductId, evidence: repo?.stripeProductId ? 'mapped' : 'RepoHQ → repo → Stripe product' },
    { id: 'launched', owner: 'david', label: 'Launch posted', done: launchPosts > 0, evidence: launchPosts ? `${launchPosts} post${launchPosts === 1 ? '' : 's'} logged` : 'the launch skill drafts them (/launch)' },
    { id: 'firstUser', owner: 'david', label: 'First user or signup', done: signups > 0 || activations > 0 || mrr > 0,
      evidence: [signups && `${signups} signup${signups === 1 ? '' : 's'}`, activations && `${activations} active user${activations === 1 ? '' : 's'}`].filter(Boolean).join(' · ') },
    { id: 'firstDollar', owner: 'david', label: 'First payment', done: mrr > 0, evidence: mrr > 0 ? `$${mrr.toFixed(2)} MRR` : '' },
  ];
  const next = steps.find((s) => !s.done) || null;
  const doneCount = steps.filter((s) => s.done).length;
  return { steps, next: next && { id: next.id, label: next.label, owner: next.owner }, done: doneCount, total: steps.length, ...(plan ? { buyer: plan.buyer, price: priceText(plan.price) } : {}) };
}

/** Same checklist? (ignores timestamps) — so an unchanged checklist doesn't rewrite the record. */
const sameChecklist = (a, b) => JSON.stringify(a ? { ...a, updatedAt: undefined } : null) === JSON.stringify(b ? { ...b, updatedAt: undefined } : null);

/**
 * How close an idea is to its first dollar, 0–100 (pure). Demand counts most (signups, a demand test
 * that passed), then a plan with a price, then progress on the checklist, then the review's score.
 * Ties go to the earlier approval (the caller's order).
 */
function revenueScore(state, { plan = null, signups = 0 } = {}) {
  let score = 0;
  if (state.validation?.decision === 'build') score += 30;
  score += Math.min(signups, 20); // up to 20
  if (plan) score += 15 + (plan.price.amount > 0 ? 5 : 0);
  const l = state.launch;
  if (l?.total) score += Math.round((l.done / l.total) * 20);
  score += Math.round(Math.min(Math.max(state.review?.score ?? 0, 0), 10)); // up to 10
  if (state.review?.verdict === 'pass' && !state.validation?.decision) score -= 5; // built against the review, no demand evidence
  return Math.max(0, Math.min(100, score));
}

/** [slug, state, extra] entries ordered by revenueScore, highest first; stable for ties (pure). */
function rankByRevenue(entries) {
  return entries.map((e, i) => ({ e, i, s: revenueScore(e[1], e[2] || {}) }))
    .sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.e);
}

module.exports = { validatePlan, priceText, launchChecklist, sameChecklist, revenueScore, rankByRevenue, roadmapMilestones };
