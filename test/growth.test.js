// The growth loop's pure parts (lib/growth.js): a built product's funnel, and a demand test's counts
// from the same idea_signals rows. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../lib/growth');

// As lib/repohq.js funnelBySlug returns them; "reach" counts each visitor once across view and visit.
const row = {
  kinds: {
    view: { events: 6, d7: 3, prev7: 0, all: 3 },
    reach: { events: 9, d7: 4, prev7: 1, all: 5 },
    visit: { events: 3, d7: 2, prev7: 1, all: 2 },
    activate: { events: 1, d7: 1, prev7: 0, all: 1 },
    signup: { events: 2, d7: 1, prev7: 1, all: 2 },
  },
  referrers7d: [{ host: 'google.com', visitors: 2 }, { host: 'tiebreak-phi.vercel.app', visitors: 1 }, { host: 'direct', visitors: 1 }],
};
const deployed = { launch: { steps: [{ id: 'deployed', done: true, evidence: 'https://tiebreak-phi.vercel.app' }] } };

test('a product without a landing page counts its old home-page views as visits, once per visitor', () => {
  const f = G.funnelOf(row, { stage: 'live', repo: 'r', ...deployed });
  assert.deepEqual(f.d7, { visit: 4, signup: 1, activate: 1, checkout: 0 });
  assert.deepEqual(f.prev7, { visit: 1, signup: 1, activate: 0, checkout: 0 });
  assert.deepEqual(f.all, { visit: 5, signup: 2, activate: 1, checkout: 0 });
  assert.deepEqual(f.seen, { visit: true, activate: true, checkout: false });
  assert.deepEqual(f.referrers7d, [{ host: 'google.com', visitors: 2 }, { host: 'direct', visitors: 1 }], "the product's own pages aren't a source");
});

test("a product that had a landing page counts only its beacon's visits, not the page's views", () => {
  const f = G.funnelOf(row, { stage: 'live', repo: 'r', page: { url: 'https://idea-pages/x/' } });
  assert.equal(f.d7.visit, 2);
  assert.equal(f.all.visit, 2);
});

test('no events yet: a funnel of zeros, with nothing seen', () => {
  const f = G.funnelOf(undefined, { stage: 'building', repo: 'r', ...deployed });
  assert.deepEqual(f.all, { visit: 0, signup: 0, activate: 0, checkout: 0 });
  assert.deepEqual(f.seen, { visit: false, activate: false, checkout: false });
  assert.equal(G.funnelText(f), '0 visitors this week (0 the week before), 0 activations, 0 Buy clicks');
});

test("a demand test's counts are the same as before: views, unique visitors who viewed, distinct signups", () => {
  assert.deepEqual(G.signalsOf(row), { views: 6, uniqueVisitors: 3, signups: 2 });
  assert.deepEqual(G.signalsOf(undefined), { views: 0, uniqueVisitors: 0, signups: 0 });
});

test('which ideas keep a funnel, and when it counts as changed', () => {
  assert.equal(G.tracksFunnel({ stage: 'building', repo: 'r', ...deployed }, undefined), true, 'deployed');
  assert.equal(G.tracksFunnel({ stage: 'building', repo: 'r' }, row), true, 'had visitors');
  assert.equal(G.tracksFunnel({ stage: 'building', repo: 'r' }, undefined), false, 'not live, no visitors');
  assert.equal(G.tracksFunnel({ stage: 'validate', page: { url: 'x' } }, row), false, 'a demand test keeps state.signals');
  const f = G.funnelOf(row, { stage: 'live', repo: 'r' });
  assert.equal(G.sameFunnel({ at: '2026-10-12T00:00:00Z', ...f }, f), true, 'when it was taken doesn\'t count');
  assert.equal(G.sameFunnel(f, { ...f, d7: { ...f.d7, visit: 9 } }), false);
  assert.equal(G.funnelText(f), '4 visitors this week (1 the week before), 1 activation, 0 Buy clicks');
});
