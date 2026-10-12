// The growth loop's launch-kit run (bin/idea-growth.js): what it may touch, and the check on what it
// wrote. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const K = require('../bin/idea-growth');

test('a kit run reads the idea and the skill, searches and fetches, and writes LAUNCH-KIT.md only: no shell, no MCP', () => {
  const t = K.kitTools('/data/ideas/tiebreak');
  assert.deepEqual(t.filter((x) => /^(Write|Edit)\(/.test(x)), ['Write(//data/ideas/tiebreak/LAUNCH-KIT.md)', 'Edit(//data/ideas/tiebreak/LAUNCH-KIT.md)']);
  assert.ok(t.includes('Read(//data/ideas/tiebreak/**)') && t.includes('WebSearch') && t.includes('WebFetch'));
  assert.ok(!t.some((x) => x.startsWith('Bash') || x.startsWith('mcp__')), t.join(' '));
  const p = K.kitPrompt('tiebreak', '/data/ideas/tiebreak');
  assert.match(p, /skills\/launch\/SKILL\.md, steps 1 to 4/);
  assert.match(p, /Never post anything anywhere/);
  assert.match(p, /state\.json → funnel for a built product/);
  assert.match(p, /check the sidebar before posting/, "Reddit refuses this machine's fetches: the kit says where its rules came from");
});

test('the run counts only when it wrote a fresh kit with an Order list', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-'));
  const file = path.join(dir, 'LAUNCH-KIT.md');
  const before = Date.now() - 1000;
  assert.deepEqual(K.checkKit(file, before), { ok: false, reason: 'no new LAUNCH-KIT.md was written' });
  fs.writeFileSync(file, '# kit\n## Dropped\n- x\n');
  assert.match(K.checkKit(file, before).reason, /no "## Order" list/);
  fs.writeFileSync(file, '# kit\n## Order\n1. **r/SideProject**, Tue.\n2. **Indie Hackers**: Thu.\n');
  assert.deepEqual(K.checkKit(file, before), { ok: true, channels: ['r/SideProject', 'Indie Hackers'] });
  assert.equal(K.checkKit(file, Date.now() + 60_000).ok, false, "a kit written before the run isn't this run's");
});
