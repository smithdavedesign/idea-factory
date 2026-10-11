#!/usr/bin/env node
// idea-build.js — build an approved idea's milestones with Claude Code, tests first.
//
//   node bin/idea-build.js <slug> [--milestone M2] [--no-push]
//
// Engine: Claude Code on David's Claude subscription first. Coding a product from its PRD needs the
// strongest model available. Only when the subscription can't take the work (usage or rate limit,
// logged out) does it fall back to the free pool through LiteLLM (owner's decision, 2026-10-10).
// Idea repos hold generated code from public research, so the free fallback is allowed for them;
// the factory's "private repos never go to free cloud models" rule protects the owner's own code.
//
// For an idea at stage "repo" (its private repo exists): clones it, then Claude Code
//   1. turns ROADMAP.md's M1 exit criteria into failing tests,
//   2. scaffolds the smallest $0 stack the roadmap suggests,
//   3. implements until the tests pass, and writes BUILD.md (what was built, how to run it, what's left).
// The script then runs the tests itself and opens a draft PR (branch m1) that David merges, the same
// human-merge rule as the factory. State: stage "building", build {prUrl, testsPassing}.
//
// Safety: no secrets or paid services; npm install scripts are disabled (npm_config_ignore_scripts);
// Claude may only edit inside the clone and run npm/npx/node and read-only git. It still runs code it
// writes on this Mac: the next step is running this inside the factory's Docker sandbox with a
// subscription token (docs/idea-factory.md).
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { claudeTask } = require('../lib/claude');
const P = require('../lib/pipeline');
const { emit } = require('../lib/events');

const ROOT = path.resolve(__dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'policy.json'), 'utf8'));
const GH_OWNER = process.env.IDEA_GH_OWNER || 'smithdavedesign';

const SYSTEM = 'You are building the first milestone (M1) of a small product, tests first. Work only inside the current directory. ' +
  'No paid services, API keys, secrets or domains: everything must run on free tiers or locally. Never push, never touch git history; the caller commits.';

function tools(dir) {
  return [
    `Read(/${dir}/**)`, `Write(/${dir}/**)`, `Edit(/${dir}/**)`, 'Glob', 'Grep', 'WebSearch', 'WebFetch',
    'Bash(npm install:*)', 'Bash(npm i:*)', 'Bash(npm ci:*)', 'Bash(npm test:*)', 'Bash(npm run:*)',
    'Bash(npx vitest:*)', 'Bash(npx tsc:*)', 'Bash(npx eslint:*)', 'Bash(node:*)',
    'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(ls:*)', 'Bash(mkdir:*)', 'Bash(cat:*)',
  ];
}

/**
 * `ownerNote`: what David wrote when he approved the build (RepoHQ Ideas page). It steers the
 * build within the milestone: it can't widen the scope or break the $0 rule.
 */
function prompt(slug, milestone = 'M1', ownerNote = '') {
  const first = milestone === 'M1';
  const note = String(ownerNote || '').trim().slice(0, 1000);
  return `You are in the repo for the idea "${slug}". Read PRD.md, ROADMAP.md, REVIEW.md and BUILD.md (if present) first.${note ? `
The owner approved this build with a note; follow it where it fits ${milestone}'s scope and the $0 rule:
---
${note}
---` : ''}
Build ROADMAP.md's ${milestone} and nothing beyond it${first ? '' : ' (earlier milestones are already merged; keep their tests passing)'}:
1. Turn ${milestone}'s exit criteria into automated tests (vitest or node:test) that fail now. Each exit criterion becomes at least one test.
2. ${first ? 'Scaffold the smallest stack that fits the roadmap\'s suggestion and runs at $0 (static site, Next.js or a small Node service; free tiers only). Add "test" to package.json scripts.' : 'Extend the existing code; keep the stack and the $0 rule.'}
3. Implement until \`npm test\` passes. Don't weaken or delete a test to make it pass.
4. ${first ? 'Write' : 'Update'} BUILD.md: what the product does now, how to run it locally, how to deploy it on a free tier, which exit criteria pass, and what's left.
Install scripts are disabled (npm_config_ignore_scripts); choose packages that work without them.
Your final message: one line — tests passing or not, and the number of tests.`;
}

/** The milestones in ROADMAP.md, in order ("## M1 …", "## M2 …"). */
function milestones(roadmap) {
  return [...String(roadmap).matchAll(/^#{2,3}\s*(M\d+)\b/gm)].map((m) => m[1]).filter((m, i, a) => a.indexOf(m) === i);
}

/** The next milestone to build after the merged ones, or null when the roadmap is done. */
function nextMilestone(roadmap, done = []) {
  return milestones(roadmap).find((m) => !done.includes(m)) || null;
}

const sh = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'pipe' }).toString().trim();

/** The milestone's section of ROADMAP.md ("## M2 …" up to the next "## "). */
function milestoneText(roadmap, milestone) {
  const lines = String(roadmap).split('\n');
  const i = lines.findIndex((l) => new RegExp(`^#{2,3}\\s*${milestone}\\b`).test(l));
  if (i < 0) return '';
  const j = lines.findIndex((l, k) => k > i && /^#{2,3}\s/.test(l));
  return lines.slice(i, j < 0 ? undefined : j).join('\n');
}

/** RepoHQ's tier advisor rates the milestone 1–3 (local model). Null when it isn't reachable. */
function rateMilestone(ideaDir, slug, milestone) {
  try {
    const roadmap = fs.readFileSync(path.join(ideaDir, 'ROADMAP.md'), 'utf8');
    const tmp = path.join(ROOT, 'work', `.rate-${slug}-${milestone}.md`);
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    fs.writeFileSync(tmp, milestoneText(roadmap, milestone) || roadmap.slice(0, 4000));
    const out = execFileSync(path.join(ROOT, 'bin', 'rate'), ['--kind', 'idea-milestone', '--title', `${milestone}: ${slug}`, '--objective-file', tmp], { encoding: 'utf8', timeout: 180_000 });
    fs.rmSync(tmp, { force: true });
    return JSON.parse(out.trim().split('\n').pop());
  } catch { return null; }
}

/** Engine order: Claude first, unless the advisor acts and rated the milestone routine (1). */
function engineOrder(difficulty, mode) {
  return mode === 'act' && difficulty === 1 ? ['free', 'claude'] : ['claude', 'free'];
}

async function buildOne(slug, { push = true, milestone = 'M1' } = {}) {
  const branch = milestone.toLowerCase();
  const ideaDir = path.join(ROOT, 'ideas', slug);
  const state = P.readState(ideaDir);
  if (!state.repo) return { ok: false, slug, reason: 'no repo yet (stage must be "repo")' };
  const full = state.repo.replace('https://github.com/', '');
  const work = path.join(ROOT, 'work', slug);
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(work), { recursive: true });
  sh('gh', ['repo', 'clone', full, work, '--', '-q'], ROOT);
  sh('git', ['checkout', '-q', '-b', branch], work);
  // The record has the review; the product repo gets a copy for the builder.
  for (const f of ['REVIEW.md']) if (fs.existsSync(path.join(ideaDir, f)) && !fs.existsSync(path.join(work, f))) fs.copyFileSync(path.join(ideaDir, f), path.join(work, f));

  const now = new Date();
  const advice = rateMilestone(ideaDir, slug, milestone);
  const engines = engineOrder(advice?.difficulty ?? null, policy.build.advisor || 'report');
  P.writeState(ideaDir, { ...state, stage: 'building', build: { ...(state.build || {}), milestone, status: 'running', at: now.toISOString(), ...(advice ? { advice } : {}) } }, now);
  const ownerNote = state.ownerDecision?.decision === 'build' ? state.ownerDecision.note : '';
  const run = await claudeTask(prompt(slug, milestone, ownerNote), {
    cwd: work, tools: tools(work), timeoutMs: policy.build.timeoutMinutes * 60_000, system: SYSTEM,
    env: { npm_config_ignore_scripts: 'true', CI: '1' },
    fallback: policy.build.fallback !== 'none', // subscription first, the free pool only if it can't take the work
    engines,
  });
  const engine = run.engine === 'free' ? `free pool (${run.info.model || 'free-agent'}) — the subscription couldn't take it: ${String(run.primaryReason).slice(0, 120)}` : `Claude subscription (${run.info.model})`;
  const test = spawnSync('npm', ['test', '--silent'], { cwd: work, encoding: 'utf8', timeout: 10 * 60_000, env: { ...process.env, CI: '1', npm_config_ignore_scripts: 'true' } });
  const testsPassing = test.status === 0;
  const changed = sh('git', ['status', '--porcelain'], work);
  if (!changed) {
    const s = P.writeState(ideaDir, { ...P.readState(ideaDir), stage: milestone === 'M1' ? 'repo' : 'building', build: { ...(state.build || {}), milestone, status: 'failed', at: now.toISOString(), reason: run.reason || 'no changes' } });
    emit({ component: 'build', event: milestone, status: 'fail', subject: { idea: slug }, message: run.reason || 'no changes made' });
    return { ok: false, slug, reason: run.reason || 'Claude made no changes', state: s };
  }
  sh('git', ['add', '-A'], work);
  sh('git', ['-c', 'user.name=idea-factory', '-c', 'user.email=idea-factory@users.noreply.github.com', 'commit', '-q', '-m', `${milestone}: ${slug} (tests ${testsPassing ? 'passing' : 'failing'})`], work);
  let prUrl = null;
  if (push) {
    sh('git', ['push', '-q', '-u', 'origin', branch], work);
    const body = [
      `${milestone} for **${slug}**, built by the idea pipeline, tests first. Engine: ${engine}.`, '',
      `Tests: ${testsPassing ? '✅ passing' : '❌ failing'} (\`npm test\` run by the pipeline after the build).`,
      run.reason ? `Builder note: ${run.reason}` : `Builder: ${run.info.result.slice(0, 300)}`, '',
      fs.existsSync(path.join(work, 'BUILD.md')) ? fs.readFileSync(path.join(work, 'BUILD.md'), 'utf8').slice(0, 6000) : '_No BUILD.md written._', '',
      '_Review it like any factory PR: merge if it does what M1 says. Nothing here spends money._',
    ].join('\n');
    prUrl = sh('gh', ['pr', 'create', '--draft', '--base', 'main', '--head', branch, '--title', `${milestone}: ${slug}`, '--body', body], work);
  }
  const s = P.writeState(ideaDir, { ...P.readState(ideaDir), stage: 'building', build: { ...(state.build || {}), milestone, status: prUrl ? 'pr-open' : 'local', prUrl, testsPassing, engine: run.engine, at: now.toISOString(), ...(advice ? { advice } : {}) } });
  emit({ component: 'build', event: milestone, status: testsPassing ? 'ok' : 'fail', subject: { idea: slug, pr: prUrl || undefined },
    message: `${milestone} ${prUrl ? `PR ${prUrl}` : 'built locally'}, tests ${testsPassing ? 'passing' : 'failing'}, engine ${run.engine}${advice ? `, advisor ${advice.difficulty}` : ''}` });
  return { ok: true, slug, milestone, prUrl, testsPassing, engine: run.engine, model: run.info.model, builderReason: run.reason, state: s };
}

module.exports = { buildOne, tools, milestones, nextMilestone, prompt, milestoneText, engineOrder };

if (require.main === module) {
  const slug = process.argv[2];
  if (!slug) { console.log(JSON.stringify({ ok: false, error: 'usage: idea-build.js <slug> [--no-push]' })); process.exit(1); }
  const mi = process.argv.indexOf('--milestone');
  buildOne(slug, { push: !process.argv.includes('--no-push'), milestone: mi > 0 ? process.argv[mi + 1] : 'M1' }).then((o) => {
    console.log(JSON.stringify({ ...o, state: undefined }));
    if (!o.ok) process.exitCode = 1;
  });
}
