// The weekly plan per focus product (lib/plan.js). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const PL = require('../lib/plan');

const md = (items) => `# Plan: tiebreak, week of 2026-10-19\n\nWhy these: under 50 visitors a week.\n\n## Items\n\n\`\`\`json\n${JSON.stringify(items, null, 1)}\n\`\`\`\n`;
const item = (over = {}) => ({ id: 'compare-pages', title: 'Comparison pages', why: 'Searchers compare tools first.', metric: 'visit', acceptance: ['three /vs/ pages render', 'each is in sitemap.xml'], size: 'M', ...over });

test('a plan parses into checked items', () => {
  const p = PL.parsePlan(md([item(), item({ id: 'First Run!', title: 'First run', metric: 'activate', payments: 'yes', windowDays: 90 })]));
  assert.equal(p.ok, true);
  assert.deepEqual(p.items.map((i) => i.id), ['compare-pages', 'first-run']);
  assert.equal(p.items[1].payments, false); // only a literal true counts
  assert.equal(p.items[1].windowDays, 28); // capped
});

test('items that can not be built from are refused, with why', () => {
  const p = PL.parsePlan(md([item({ metric: 'signups' }), item({ id: 'x', acceptance: ['only one'] }), item({ id: 'ok' }), item({ id: 'ok' })]));
  assert.deepEqual(p.items.map((i) => i.id), ['ok']);
  assert.equal(p.errors.length, 2); // the 4th is past maxItems
  assert.equal(PL.parsePlan('no items here').ok, false);
  assert.match(PL.parsePlan('## Items\n```json\n{oops\n```').errors[0], /valid JSON/);
});

test('an item stands where its latest build left it', () => {
  const exps = [
    { id: 'e1', status: 'abandoned', failed: true, updatedAt: '2026-10-19T02:00:00Z' },
    { id: 'e2', status: 'running' },
    { id: 'e3', status: 'abandoned', reason: 'David closed it' },
  ];
  assert.equal(PL.itemStatus({ attempts: [] }, exps).status, 'planned');
  assert.equal(PL.itemStatus({ attempts: ['e1'] }, exps).status, 'failed');
  assert.equal(PL.itemStatus({ attempts: ['e1', 'e2'] }, exps).status, 'shipped');
  assert.equal(PL.itemStatus({ attempts: ['e3'] }, exps).status, 'dropped');
  const thrice = [1, 2, 3].map((n) => ({ id: `f${n}`, status: 'abandoned', failed: true }));
  assert.equal(PL.itemStatus({ attempts: ['f1', 'f2', 'f3'] }, thrice).status, 'dropped');
});

test('the next item: one at a time, failed ones retried after half a day', () => {
  const now = new Date('2026-10-20T03:00:00Z');
  const plan = { at: '2026-10-19T01:00:00Z', items: [{ id: 'a', attempts: ['e1'] }, { id: 'b' }] };
  assert.equal(PL.nextItem(plan, [{ id: 'e1', status: 'proposed' }], now), null);
  assert.equal(PL.nextItem(plan, [{ id: 'e1', status: 'running' }], now).id, 'b');
  assert.equal(PL.nextItem(plan, [{ id: 'e1', status: 'abandoned', failed: true, updatedAt: '2026-10-20T01:00:00Z' }], now).id, 'b');
  assert.equal(PL.nextItem(plan, [{ id: 'e1', status: 'abandoned', failed: true, updatedAt: '2026-10-19T12:00:00Z' }], now).id, 'a');
});

test('a new plan is due weekly, or once everything in it is built', () => {
  const now = new Date('2026-10-20T03:00:00Z');
  assert.equal(PL.planDue(null).due, true);
  const plan = { at: '2026-10-19T01:00:00Z', items: [{ id: 'a', attempts: ['e1'] }, { id: 'b' }] };
  assert.equal(PL.planDue(plan, [{ id: 'e1', status: 'running' }], { now }).due, false);
  assert.equal(PL.planDue(plan, [{ id: 'e1', status: 'proposed' }], { now: new Date('2026-10-30T00:00:00Z') }).due, false);
  assert.equal(PL.planDue(plan, [], { now: new Date('2026-10-27T00:00:00Z') }).due, true);
  const done = PL.withAttempt(plan, 'b', 'e2');
  assert.equal(PL.planDue(done, [{ id: 'e1', status: 'decided' }, { id: 'e2', status: 'running' }], { now }).due, true);
  const titled = { ...done, items: done.items.map((i) => ({ ...i, title: i.id.toUpperCase() })) };
  assert.equal(PL.planText(titled, [{ id: 'e1', status: 'decided' }, { id: 'e2', status: 'proposed' }]), 'A (decided); B (building)');
});
