// "Start build now" from RepoHQ's Ideas page, and how builds run: Opus at xhigh, gstack plan and
// self-review, the free pool as the only fallback. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const B = require('../bin/idea-build');
const P = require('../lib/pipeline');
const { claudeArgs } = require('../lib/claude');
const policy = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'policy.json'), 'utf8'));

const ROADMAP = '# Roadmap\n\n## M1 — core\nexit\n\n## M2 — more\nexit\n';

test('policy: builds run Opus at xhigh, Sonnet on the subscription if Opus is unavailable, the free pool last, three at once and no daily cap', () => {
  assert.equal(policy.build.model, 'opus');
  assert.equal(policy.build.effort, 'xhigh');
  assert.equal(policy.build.claudeFallbackModel, 'sonnet');
  assert.equal(policy.build.fallback, 'free-agent');
  assert.equal(policy.build.manualPerDay, undefined, 'no daily cap (David, 2026-10-13)');
  assert.equal(policy.build.maxPerWeek, undefined, 'no weekly slot');
  assert.equal(policy.build.concurrency.max, 3);
});

test('Claude Code gets model, effort and its own fallback on the subscription only', () => {
  const sub = claudeArgs('do it', { model: 'opus', effort: 'xhigh', fallbackModel: 'sonnet' });
  assert.deepEqual(sub.slice(0, 8), ['-p', 'do it', '--model', 'opus', '--effort', 'xhigh', '--fallback-model', 'sonnet']);
  const free = claudeArgs('do it', { engine: 'free', model: 'opus', effort: 'xhigh', fallbackModel: 'sonnet' });
  assert.equal(free[3], 'free-agent');
  assert.ok(!free.includes('--effort') && !free.includes('--fallback-model'), 'LiteLLM never gets effort or a Claude fallback');
  assert.ok(!claudeArgs('x', { model: 'sonnet', fallbackModel: 'sonnet' }).includes('--fallback-model'), 'no fallback to the same model');
  assert.ok(claudeArgs('x', {}).includes('--permission-mode'), 'isolation flags stay');
});

test('a manual start builds M1 of an approved idea, the next milestone after a merge, and nothing else', () => {
  const repo = 'https://github.com/o/x';
  assert.deepEqual(B.manualBuildTarget({ stage: 'repo', repo, ownerApproved: true }, ROADMAP), { ok: true, milestone: 'M1' });
  assert.deepEqual(B.manualBuildTarget({ stage: 'repo', repo, review: { verdict: 'validate' } }, ROADMAP), { ok: true, milestone: 'M1' });
  assert.match(B.manualBuildTarget({ stage: 'repo', repo, review: { verdict: 'pass' } }, ROADMAP).reason, /not approved/);
  assert.deepEqual(B.manualBuildTarget({ stage: 'repo', repo, ownerApproved: true, build: { milestone: 'M1', status: 'failed' } }, ROADMAP), { ok: true, milestone: 'M1' });
  assert.match(B.manualBuildTarget({ stage: 'pass' }, ROADMAP).reason, /no repo yet/);
  assert.match(B.manualBuildTarget({ stage: 'building', repo, build: { milestone: 'M1', status: 'running' } }, ROADMAP).reason, /being built now/);
  assert.match(B.manualBuildTarget({ stage: 'building', repo, build: { milestone: 'M1', status: 'pr-open' } }, ROADMAP).reason, /waiting for your review/);
  assert.deepEqual(B.manualBuildTarget({ stage: 'building', repo, milestonesDone: ['M1'], build: { milestone: 'M1', status: 'merged' } }, ROADMAP), { ok: true, milestone: 'M2' });
  assert.deepEqual(B.manualBuildTarget({ stage: 'building', repo, milestonesDone: ['M1'], build: { milestone: 'M2', status: 'closed' } }, ROADMAP), { ok: true, milestone: 'M2' });
  assert.match(B.manualBuildTarget({ stage: 'building', repo, milestonesDone: ['M1', 'M2'], build: { milestone: 'M2', status: 'merged' } }, ROADMAP).reason, /every roadmap milestone/);
  assert.match(B.manualBuildTarget({ stage: 'live', repo }, ROADMAP).reason, /nothing to build/);
  // A go-live or growth build isn't on the roadmap: after one, Start build now goes back to the roadmap, live products too.
  assert.deepEqual(B.manualBuildTarget({ stage: 'live', repo, milestonesDone: ['M1'], build: { milestone: 'GOLIVE', status: 'failed' } }, ROADMAP), { ok: true, milestone: 'M2' });
  assert.match(B.manualBuildTarget({ stage: 'live', repo, milestonesDone: ['M1', 'M2'], build: { milestone: 'GOLIVE', status: 'merged' } }, ROADMAP).reason, /every roadmap milestone/);
  assert.match(B.manualBuildTarget({ stage: 'building', repo, milestonesDone: ['M1', 'M2'], build: { milestone: 'GROWTH', status: 'closed' } }, ROADMAP).reason, /every roadmap milestone/);
});

test('the builder plans and self-reviews with gstack sections read from the installed copy', () => {
  const g = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-'));
  fs.mkdirSync(path.join(g, 'plan-eng-review'));
  fs.mkdirSync(path.join(g, 'review'));
  fs.writeFileSync(path.join(g, 'plan-eng-review', 'SKILL.md'), '# x\n### Step 0: Scope Challenge\nminimum changes\n## Review Sections\n### 1. Architecture review\nboundaries\n### 2. Code quality\nno\n### 3. Test review\ncoverage\n### Test Framework Detection\nno\n');
  fs.writeFileSync(path.join(g, 'review', 'checklist.md'), '# c\n## Review Categories\nSQL safety\n## Severity Classification\nno\n## Fix-First Heuristic\nfix it\n## Suppressions\nno\n');
  const input = B.buildInput('x', 'M1', g);
  for (const s of ['minimum changes', 'boundaries', 'coverage', 'SQL safety', 'fix it']) assert.match(input, new RegExp(s));
  for (const s of ['Code quality', 'Severity Classification', 'Suppressions']) assert.doesNotMatch(input, new RegExp(s));
  assert.match(input, /Non-interactive: skip AskUserQuestion/);
  assert.equal(B.buildInput('x', 'M1', path.join(g, 'nope')), null);
  fs.rmSync(path.join(g, 'review'), { recursive: true });
  assert.match(B.buildInput('x', 'M1', g), /section not found in the installed gstack/);

  const withG = B.prompt('x', 'M1', '', { gstackFile: '/w/in.md' });
  assert.match(withG, /0\. Plan first with the gstack engineering frameworks in \/w\/in\.md/);
  assert.match(withG, /"## Plan": scope/);
  assert.match(withG, /5\. Screenshot proof[\s\S]*6\. Self-review your diff[\s\S]*Fix every CRITICAL finding[\s\S]*"## Review"/, 'the self-review covers the screenshot script too');
  assert.doesNotMatch(B.prompt('x', 'M1'), /gstack/);
  assert.ok(B.tools('/w/clone', ['/w/in.md']).includes('Read(//w/in.md)'));
});

test('manual builds have their own cap: the weekly slot ignores them', () => {
  const now = new Date('2026-10-11T12:00:00Z');
  const at = '2026-10-10T12:00:00Z';
  assert.equal(P.buildsThisWeek([{ build: { at } }, { build: { at, manual: true } }, { build: { at, milestone: 'GOLIVE' } }], now), 1, 'nor go-lives');
});

test('PR and Slack name the engine; a failed manual build says so', () => {
  assert.equal(B.engineLabel({ engine: 'claude', info: { model: 'claude-opus-5-5' } }, { model: 'opus', effort: 'xhigh' }), 'Claude subscription (claude-opus-5-5, effort xhigh)');
  assert.match(B.engineLabel({ engine: 'free', info: { model: 'free-agent' }, primaryReason: 'usage limit reached' }), /^free pool \(free-agent\) — the subscription couldn't take it: usage limit/);
  const ok = B.buildMessage({ slug: 'pr-split', milestone: 'M1', r: { ok: true, prUrl: 'https://github.com/o/pr-split/pull/1', testsPassing: true, engine: 'claude', model: 'claude-opus-5-5' }, effort: 'xhigh' });
  assert.match(ok, /^🔨 M1 for \*pr-split\* is ready for review: https:\/\/github\.com\/o\/pr-split\/pull\/1\nTests passing ✅ · claude-opus-5-5, effort xhigh/);
  assert.match(B.buildMessage({ slug: 'pr-split', milestone: 'M1', r: { ok: false, reason: 'tests never ran' } }), /M1 build for \*pr-split\* failed: tests never ran\nTry again from https:\/\/repohq\.vercel\.app\/ideas\/pr-split/);
});

test('builds get infrastructure only through the credential broker', () => {
  const tools = B.tools('/w/clone');
  assert.ok(tools.some((t) => /^Bash\(.*ai-stack\/bin\/provision:\*\)$/.test(t)));
  assert.ok(!tools.some((t) => /security|keychain/.test(t)));
  const p = B.prompt('grantgate', 'M2');
  assert.match(p, /bin\/provision neon db grantgate/);
  assert.match(p, /provision request "<what> for grantgate: <why>"/);
  assert.match(p, /"## Infrastructure"/);
});
