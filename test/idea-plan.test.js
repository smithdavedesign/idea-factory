// The weekly plan run (bin/idea-plan.js): what it may touch, what it's asked, how its output is checked. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { planTools, planPrompt, checkPlan } = require('../bin/idea-plan');

test('a plan run reads the record and the web, and writes only PLAN.md', () => {
  const tools = planTools('/x/ideas/tiebreak');
  assert.deepEqual(tools.filter((t) => /^(Write|Edit)\(/.test(t)), ['Write(//x/ideas/tiebreak/PLAN.md)', 'Edit(//x/ideas/tiebreak/PLAN.md)']);
  assert.ok(!tools.some((t) => /^Bash/.test(t)), 'no shell');
  assert.ok(tools.includes('WebSearch'));
});

test('the prompt asks for testable criteria, the bottleneck, and payments marked', () => {
  const p = planPrompt('tiebreak', '/x/ideas/tiebreak', { items: 3, bottleneck: 'acquire: 4 visitors this week, under 50', funnel: '4 visitors this week' });
  assert.match(p, /acquire: 4 visitors this week, under 50/);
  assert.match(p, /acceptance criteria an automated test or a browser check can verify/);
  assert.match(p, /Mark payments true only if it changes checkout/);
  assert.match(p, /## Items\n```json/);
});

test('only a fresh PLAN.md with buildable items counts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-'));
  const file = path.join(dir, 'PLAN.md');
  const started = Date.now() - 1000;
  assert.match(checkPlan(file, started).reason, /no new PLAN\.md/);
  fs.writeFileSync(file, '# Plan\n\n## Items\n\n```json\n[{"id":"a","title":"A","metric":"visit","acceptance":["x","y"]}]\n```\n');
  assert.deepEqual(checkPlan(file, started).items.map((i) => i.id), ['a']);
  fs.writeFileSync(file, '# Plan\n\n## Items\n\n```json\n[{"id":"a","title":"A","metric":"likes","acceptance":["x","y"]}]\n```\n');
  assert.match(checkPlan(file, started).reason, /no buildable items: a: metric/);
  fs.rmSync(dir, { recursive: true, force: true });
});
