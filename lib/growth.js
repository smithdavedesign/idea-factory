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
  };
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
  return `${n(f.d7.visit, 'visitor')} this week (${f.prev7.visit} the week before), ${n(f.d7.activate, 'activation')}, ${n(f.d7.checkout, 'Buy click')}`;
}

module.exports = { funnelOf, signalsOf, tracksFunnel, sameFunnel, funnelText };
