#!/usr/bin/env node
// idea-build.js — build an approved idea's M1 on the Claude Pro subscription, tests first.
//
//   node bin/idea-build.js <slug> [--no-push]
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

function prompt(slug) {
  return `You are in the repo for the idea "${slug}". Read PRD.md, ROADMAP.md and REVIEW.md (if present) first.
Build ROADMAP.md's M1 and nothing beyond it:
1. Turn M1's exit criteria into automated tests (vitest or node:test) that fail now. Each exit criterion becomes at least one test.
2. Scaffold the smallest stack that fits the roadmap's suggestion and runs at $0 (static site, Next.js or a small Node service; free tiers only). Add "test" to package.json scripts.
3. Implement until \`npm test\` passes. Don't weaken or delete a test to make it pass.
4. Write BUILD.md: what M1 does, how to run it locally, how to deploy it on a free tier, which exit criteria pass, and what's left for M2.
Install scripts are disabled (npm_config_ignore_scripts); choose packages that work without them.
Your final message: one line — tests passing or not, and the number of tests.`;
}

const sh = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'pipe' }).toString().trim();

async function buildOne(slug, { push = true } = {}) {
  const ideaDir = path.join(ROOT, 'ideas', slug);
  const state = P.readState(ideaDir);
  if (!state.repo) return { ok: false, slug, reason: 'no repo yet (stage must be "repo")' };
  const full = state.repo.replace('https://github.com/', '');
  const work = path.join(ROOT, 'work', slug);
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(work), { recursive: true });
  sh('gh', ['repo', 'clone', full, work, '--', '-q'], ROOT);
  sh('git', ['checkout', '-q', '-b', 'm1'], work);
  // The record has the review; the product repo gets a copy for the builder.
  for (const f of ['REVIEW.md']) if (fs.existsSync(path.join(ideaDir, f)) && !fs.existsSync(path.join(work, f))) fs.copyFileSync(path.join(ideaDir, f), path.join(work, f));

  const now = new Date();
  P.writeState(ideaDir, { ...state, stage: 'building', build: { status: 'running', at: now.toISOString() } }, now);
  const run = await claudeTask(prompt(slug), {
    cwd: work, tools: tools(work), timeoutMs: policy.build.timeoutMinutes * 60_000, system: SYSTEM,
    env: { npm_config_ignore_scripts: 'true', CI: '1' },
  });
  const test = spawnSync('npm', ['test', '--silent'], { cwd: work, encoding: 'utf8', timeout: 10 * 60_000, env: { ...process.env, CI: '1', npm_config_ignore_scripts: 'true' } });
  const testsPassing = test.status === 0;
  const changed = sh('git', ['status', '--porcelain'], work);
  if (!changed) {
    const s = P.writeState(ideaDir, { ...P.readState(ideaDir), stage: 'repo', build: { status: 'failed', at: now.toISOString(), reason: run.reason || 'no changes' } });
    return { ok: false, slug, reason: run.reason || 'Claude made no changes', state: s };
  }
  sh('git', ['add', '-A'], work);
  sh('git', ['-c', 'user.name=idea-factory', '-c', 'user.email=idea-factory@users.noreply.github.com', 'commit', '-q', '-m', `M1: ${slug} (tests ${testsPassing ? 'passing' : 'failing'})`], work);
  let prUrl = null;
  if (push) {
    sh('git', ['push', '-q', '-u', 'origin', 'm1'], work);
    const body = [
      `M1 for **${slug}**, built by the idea pipeline on the Claude Pro subscription (tests first).`, '',
      `Tests: ${testsPassing ? '✅ passing' : '❌ failing'} (\`npm test\` run by the pipeline after the build).`,
      run.reason ? `Builder note: ${run.reason}` : `Builder: ${run.info.result.slice(0, 300)}`, '',
      fs.existsSync(path.join(work, 'BUILD.md')) ? fs.readFileSync(path.join(work, 'BUILD.md'), 'utf8').slice(0, 6000) : '_No BUILD.md written._', '',
      '_Review it like any factory PR: merge if it does what M1 says. Nothing here spends money._',
    ].join('\n');
    prUrl = sh('gh', ['pr', 'create', '--draft', '--base', 'main', '--head', 'm1', '--title', `M1: ${slug}`, '--body', body], work);
  }
  const s = P.writeState(ideaDir, { ...P.readState(ideaDir), stage: 'building', build: { status: prUrl ? 'pr-open' : 'local', prUrl, testsPassing, at: now.toISOString() } });
  return { ok: true, slug, prUrl, testsPassing, model: run.info.model, builderReason: run.reason, state: s };
}

module.exports = { buildOne, tools };

if (require.main === module) {
  const slug = process.argv[2];
  if (!slug) { console.log(JSON.stringify({ ok: false, error: 'usage: idea-build.js <slug> [--no-push]' })); process.exit(1); }
  buildOne(slug, { push: !process.argv.includes('--no-push') }).then((o) => {
    console.log(JSON.stringify({ ...o, state: undefined }));
    if (!o.ok) process.exitCode = 1;
  });
}
