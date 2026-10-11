#!/usr/bin/env node
// idea-build.js — build an approved idea's milestones with Claude Code, tests first.
//
//   node bin/idea-build.js <slug> [--milestone M2] [--no-push]
//
// Engine: Claude Code on David's Claude subscription first, as policy.build.model at policy.build.effort
// (Opus at xhigh; Claude Code drops to claudeFallbackModel if Opus is unavailable). Coding a product
// from its PRD needs the strongest model available. Only when the subscription can't take the work
// (usage or rate limit, logged out) does it fall back to the free pool through LiteLLM (owner's
// decision, 2026-10-10). No local model.
//
// gstack: the builder plans with plan-eng-review (Step 0 scope challenge, architecture, test review)
// before coding and self-reviews its diff with gstack's pre-landing checklist after, both read from
// the installed gstack (buildInput), non-interactively.
//
// Started by the pipeline: the weekly slot (policy.build.maxPerWeek), or "Start build now" on RepoHQ's
// Ideas page (idea_build_requests, at most policy.build.manualPerDay a day; manualBuildTarget).
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
// Where it runs (policy.build.sandbox):
//   "docker" (default): Claude Code, npm install and npm test run in RepoHQ's factory sandbox
//     (lib/sandbox.js → factory/bin/sandbox-session.ts): no mounts, no host environment, no
//     credentials, network only to package registries and api.anthropic.com. Claude logs in with a
//     subscription token from `claude setup-token`, kept in the keychain (policy.build.tokenService).
//     The host only clones, applies the patch that comes back, commits, pushes and opens the PR.
//   "host": the old way, on this Mac with install scripts off. Code the builder writes can read
//     the Mac's files there, so use it only when the sandbox is down and a build can't wait.
// Before any commit, the patch is scanned for credentials (lib/secret-scan.js): credential-shaped
// strings (a fake key written as a literal still turns a PR's secret checks red) and the Mac's real
// secrets by value. One repair round, then the build fails rather than open a PR with them.
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { claudeTask, FREE_MODEL } = require('../lib/claude');
const { scanPatch, formatFindings, knownSecrets } = require('../lib/secret-scan');
const { startSession } = require('../lib/sandbox');
const P = require('../lib/pipeline');
const { emit } = require('../lib/events');

const ROOT = path.resolve(__dirname, '..');
// The record and the build's scratch space; IDEA_PIPELINE_DATA points them elsewhere (tests), like the pipeline.
const DATA = process.env.IDEA_PIPELINE_DATA || ROOT;
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'policy.json'), 'utf8'));
const GH_OWNER = process.env.IDEA_GH_OWNER || 'smithdavedesign';

/** The credential broker (ai-stack bin/provision): fixed verbs, values never printed. */
const PROVISION = path.join(process.env.HOME, 'ai-stack', 'bin', 'provision');

const SYSTEM = 'You are building one milestone of a small product, tests first. Work only inside the current directory. ' +
  'Nobody will answer questions: decide from the PRD, roadmap and review, and write down what you decided. ' +
  'No paid services or domains: everything must run on free tiers or locally. Never push, never touch git history; the caller commits. ' +
  'Infrastructure (a database, an API key) comes only from the credential broker, the way the task says: it writes secrets to the keychain and Vercel env and never shows them. ' +
  'Never read, print, write down or ask for a secret value; code reads them from environment variables, and tests never need real ones. ' +
  'Never write anything shaped like a credential (API keys, tokens, private keys, JWTs, connection strings with passwords) into any file, tests and examples included: ' +
  "when a test needs a fake one, build it at runtime from a prefix and a repeated filler, e.g. ['sk', 'ant', 'api03', 'A1b2C3d4'.repeat(6)].join('-'), so secret scanners don't flag the repo. " +
  'Never read files outside the repository, and never print, log or save environment variables.';

const GSTACK = path.join(process.env.HOME, '.claude', 'skills', 'gstack');
/** gstack sections the builder applies: plan before coding, self-review after (from the installed copy). */
const GSTACK_BUILD_SECTIONS = [
  ['plan-eng-review/SKILL.md', /^### Step 0: Scope Challenge/, /^## Review Sections/],
  ['plan-eng-review/SKILL.md', /^### 1\. Architecture review/, /^### 2\. /],
  ['plan-eng-review/SKILL.md', /^### 3\. Test review/, /^### Test Framework Detection/],
  ['review/checklist.md', /^## Review Categories/, /^## Severity Classification/],
  ['review/checklist.md', /^## Fix-First Heuristic/, /^## Suppressions/],
];

/** The text from a heading matching `start` up to the next heading matching `stop` (or the end). */
function extractSection(md, start, stop) {
  const lines = String(md).split('\n');
  const i = lines.findIndex((l) => start.test(l));
  if (i < 0) return '';
  const j = lines.findIndex((l, k) => k > i && stop.test(l));
  return lines.slice(i, j < 0 ? undefined : j).join('\n').trim();
}

/** The gstack frameworks for one build, as markdown (pure apart from reading gstack). Null without gstack. */
function buildInput(slug, milestone, gstack = GSTACK) {
  if (!fs.existsSync(gstack)) return null;
  const sections = GSTACK_BUILD_SECTIONS.map(([file, start, stop]) => {
    const f = path.join(gstack, file);
    const text = fs.existsSync(f) ? extractSection(fs.readFileSync(f, 'utf8'), start, stop) : '';
    return `### From gstack ${file}\n\n${text || '(section not found in the installed gstack: apply it from memory and say so in BUILD.md)'}`;
  });
  return [`# gstack frameworks for building ${milestone} of ${slug}`, '',
    'Non-interactive: skip AskUserQuestion, approval gates and anything that waits for a person; answer each question yourself and record the answer.', '',
    ...sections].join('\n');
}

/**
 * In the sandbox (`sandbox: true`): no WebFetch, since the egress allows no arbitrary hosts (WebSearch
 * runs at Anthropic), and no credential broker, which lives on the Mac: the builder writes `.provision`
 * instead and the host runs it (provisionCommands).
 */
function tools(dir, extraRead = [], { sandbox = false } = {}) {
  return [
    `Read(/${dir}/**)`, ...extraRead.map((f) => `Read(/${f})`), `Write(/${dir}/**)`, `Edit(/${dir}/**)`, 'Glob', 'Grep', 'WebSearch', ...(sandbox ? [] : ['WebFetch']),
    'Bash(npm install:*)', 'Bash(npm i:*)', 'Bash(npm ci:*)', 'Bash(npm test:*)', 'Bash(npm run:*)',
    'Bash(npx vitest:*)', 'Bash(npx tsc:*)', 'Bash(npx eslint:*)', 'Bash(node:*)',
    'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(ls:*)', 'Bash(mkdir:*)', 'Bash(cat:*)',
    ...(sandbox ? [] : [`Bash(${PROVISION}:*)`]),
  ];
}

/**
 * The broker commands a sandboxed build asked for in `.provision`, checked (pure): only the broker's
 * verbs, only for this idea's repo, plain tokens; `request "<text>"` passes its text. One per line.
 */
function provisionCommands(text, slug) {
  const ok = [];
  const rejected = [];
  const token = /^[A-Za-z0-9_.-]{1,64}$/;
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim().replace(new RegExp(`^${PROVISION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`), '').replace(/^provision\s+/, '');
    if (!line || line.startsWith('#')) continue;
    const req = line.match(/^request\s+"([^"]{1,500})"$/);
    if (req) { ok.push(['request', req[1]]); continue; }
    const p = line.split(/\s+/);
    const forSlug = p[2] === slug;
    if (p[0] === 'neon' && p[1] === 'db' && forSlug && p.length === 3) ok.push(p);
    else if (p[0] === 'vercel' && p[1] === 'project' && forSlug && p.length === 3) ok.push(p);
    else if (p[0] === 'vercel' && p[1] === 'env' && forSlug && p.length === 4 && token.test(p[3])) ok.push(p);
    else if (p[0] === 'gcp' && p[1] === 'key' && forSlug && (p.length === 4 || p.length === 5) && p.slice(3).every((x) => token.test(x))) ok.push(p);
    else rejected.push(line.slice(0, 200));
  }
  return { ok, rejected };
}

/**
 * `ownerNote`: what David wrote when he approved the build (RepoHQ Ideas page). It steers the
 * build within the milestone: it can't widen the scope or break the $0 rule.
 */
function prompt(slug, milestone = 'M1', ownerNote = '', { gstackFile = null, provision = 'direct' } = {}) {
  const first = milestone === 'M1';
  const note = String(ownerNote || '').trim().slice(0, 1000);
  const plan = gstackFile ? `
0. Plan first with the gstack engineering frameworks in ${gstackFile} (read it): apply "Step 0: Scope Challenge", "1. Architecture review" and "3. Test review" to ${milestone} yourself. Keep the narrowest version that meets the exit criteria. Put the outcome at the top of BUILD.md as "## Plan": scope (and what's deliberately not in it), architecture, test plan.` : '';
  const selfReview = gstackFile ? `
5. Self-review your diff (\`git status\`, \`git diff\`) against gstack's pre-landing checklist in the same file ("Review Categories", "Fix-First Heuristic"). Fix every CRITICAL finding and rerun the tests, then list what's left in BUILD.md as "## Review".` : '';
  return `You are in the repo for the idea "${slug}". Read PRD.md, ROADMAP.md, REVIEW.md and BUILD.md (if present) first.${note ? `
The owner approved this build with a note; follow it where it fits ${milestone}'s scope and the $0 rule:
---
${note}
---` : ''}
Build ROADMAP.md's ${milestone} and nothing beyond it${first ? '' : ' (earlier milestones are already merged; keep their tests passing)'}:${plan}
1. Turn ${milestone}'s exit criteria into automated tests (vitest or node:test) that fail now. Each exit criterion becomes at least one test.
2. ${first ? 'Scaffold the smallest stack that fits the roadmap\'s suggestion and runs at $0 (static site, Next.js or a small Node service; free tiers only). Add "test" to package.json scripts.' : 'Extend the existing code; keep the stack and the $0 rule.'}
3. Implement until \`npm test\` passes. Don't weaken or delete a test to make it pass.
4. ${first ? 'Write' : 'Update'} BUILD.md: what the product does now, how to run it locally, how to deploy it on a free tier, which exit criteria pass, and what's left.${selfReview}
Install scripts are disabled (npm_config_ignore_scripts); choose packages that work without them.
${provision === 'file' ? `If ${milestone} needs a database or a Google API key, you can't provision it from here (you're in a sandbox). Write what you need into \`.provision\` at the repo root, one per line; the pipeline runs it through the credential broker after the build:
  neon db ${slug}            → DATABASE_URL (Postgres, free tier)
  vercel project ${slug}     → the Vercel project, which gets every stored value as env
  vercel env ${slug} <KEY>   → push a stored value to its Vercel env
  gcp key ${slug} <api>      → GOOGLE_API_KEY restricted to that API
  request "<what> for ${slug}: <why>"   → anything else (another service, auth, payments), for David
Build against the env vars (DATABASE_URL, GOOGLE_API_KEY, …); tests never need the real values. List what you asked for in BUILD.md under "## Infrastructure".` : `If ${milestone} needs a database or a Google API key, provision it for the repo "${slug}" (never by hand, never with a value in code):
  ${PROVISION} neon db ${slug}            → DATABASE_URL (Postgres, free tier)
  ${PROVISION} vercel project ${slug}     → the Vercel project, which gets every stored value as env
  ${PROVISION} gcp key ${slug} <api>      → GOOGLE_API_KEY restricted to that API
Anything else (another service, auth, payments): \`${PROVISION} request "<what> for ${slug}: <why>"\`, then build behind an env var and say so in BUILD.md. List what you provisioned in BUILD.md under "## Infrastructure".`}
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
    const tmp = path.join(DATA, 'work', `.rate-${slug}-${milestone}.md`);
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    fs.writeFileSync(tmp, milestoneText(roadmap, milestone) || roadmap.slice(0, 4000));
    const out = execFileSync(path.join(ROOT, 'bin', 'rate'), ['--kind', 'idea-milestone', '--title', `${milestone}: ${slug}`, '--objective-file', tmp], { encoding: 'utf8', timeout: 180_000 });
    fs.rmSync(tmp, { force: true });
    return JSON.parse(out.trim().split('\n').pop());
  } catch { return null; }
}

/**
 * What "Start build now" on the Ideas page builds for an idea, or why it can't (pure). M1 for an
 * approved idea whose repo exists and hasn't been built (or whose last build failed); the next roadmap
 * milestone once the previous one's PR is merged. Never while a build runs or a PR waits for review.
 */
function manualBuildTarget(state, roadmap = '') {
  const b = state.build || {};
  if (!state.repo) return { ok: false, reason: 'no repo yet: approve the build first, and the pipeline creates it' };
  if (b.status === 'running') return { ok: false, reason: `${b.milestone || 'M1'} is being built now` };
  if (b.status === 'pr-open') return { ok: false, reason: `${b.milestone || 'M1'}'s PR is waiting for your review: merge it first` };
  if (state.stage === 'repo') {
    const approved = state.ownerApproved === true || state.validation?.decision === 'build' || (!!state.review && state.review.verdict !== 'pass');
    if (!approved) return { ok: false, reason: 'not approved: approve the build first' };
    return { ok: true, milestone: b.status === 'failed' && b.milestone ? b.milestone : 'M1' };
  }
  if (state.stage === 'building' && ['merged', 'failed', 'closed'].includes(b.status)) {
    if (b.status !== 'merged') return { ok: true, milestone: b.milestone || 'M1' };
    const next = nextMilestone(roadmap, state.milestonesDone || []);
    return next ? { ok: true, milestone: next } : { ok: false, reason: 'every roadmap milestone is merged' };
  }
  return { ok: false, reason: `nothing to build at stage "${state.stage}"` };
}

/** How the PR and the state name the engine (pure). */
function engineLabel(run, build = policy.build) {
  if (run.engine === 'free') return `free pool (${run.info.model || 'free-agent'}) — the subscription couldn't take it: ${String(run.primaryReason).slice(0, 120)}`;
  return `Claude subscription (${run.info.model || build.model || 'claude'}${build.effort ? `, effort ${build.effort}` : ''})`;
}

/** The Slack message when a build started from the Ideas page finishes (pure). */
function buildMessage({ slug, milestone, r, effort }) {
  if (!r.ok) return `🔨 ${milestone} build for *${slug}* failed: ${String(r.reason || 'unknown').slice(0, 300)}\nTry again from https://repohq.vercel.app/ideas/${slug}`;
  const engine = r.engine === 'free' ? `free pool (${r.model || 'free-agent'}), the subscription couldn't take it` : `${r.model || 'Claude'}${effort ? `, effort ${effort}` : ''}`;
  return [`🔨 ${milestone} for *${slug}* is ready for review: ${r.prUrl || '(no PR: built locally)'}`,
    `Tests ${r.testsPassing ? 'passing ✅' : 'failing ❌'} · ${engine}`,
    `Merge it to unlock the next milestone: https://repohq.vercel.app/ideas/${slug}`].join('\n');
}

/** Engine order: Claude first, unless the advisor acts and rated the milestone routine (1). */
function engineOrder(difficulty, mode) {
  return mode === 'act' && difficulty === 1 ? ['free', 'claude'] : ['claude', 'free'];
}

/** `manual`: started from the Ideas page; `note`: what the owner wrote with that request (else his approval note). */
async function buildOne(slug, { push = true, milestone = 'M1', manual = false, note = '' } = {}) {
  const branch = milestone.toLowerCase();
  const ideaDir = path.join(DATA, 'ideas', slug);
  const state = P.readState(ideaDir);
  if (!state.repo) return { ok: false, slug, reason: 'no repo yet (stage must be "repo")' };
  const full = state.repo.replace('https://github.com/', '');
  const work = path.join(DATA, 'work', slug);
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(work), { recursive: true });
  sh('gh', ['repo', 'clone', full, work, '--', '-q'], ROOT);
  sh('git', ['checkout', '-q', '-b', branch], work);
  // The record has the review; the product repo gets a copy for the builder.
  for (const f of ['REVIEW.md']) if (fs.existsSync(path.join(ideaDir, f)) && !fs.existsSync(path.join(work, f))) fs.copyFileSync(path.join(ideaDir, f), path.join(work, f));

  const now = new Date();
  const advice = rateMilestone(ideaDir, slug, milestone);
  const engines = engineOrder(advice?.difficulty ?? null, policy.build.advisor || 'report');
  P.writeState(ideaDir, { ...state, stage: 'building', build: { ...(state.build || {}), milestone, status: 'running', at: now.toISOString(), manual, ...(advice ? { advice } : {}) } }, now);
  // "Running now" on RepoHQ's Agents page comes from this event until the build's own ok/fail lands.
  emit({ component: 'build', event: milestone, status: 'start', subject: { idea: slug }, message: `${milestone} started${manual ? ' (Start build now)' : ''} on ${policy.build.model || 'claude'}${policy.build.effort ? ` at ${policy.build.effort}` : ''}`,
    data: { milestone, manual: !!manual, model: policy.build.model || null, effort: policy.build.effort || null, timeoutMinutes: policy.build.timeoutMinutes } });
  const ownerNote = String(note || '').trim() || (state.ownerDecision?.decision === 'build' ? state.ownerDecision.note : '');
  const failBuild = (reason, data = {}) => {
    const s = P.writeState(ideaDir, { ...P.readState(ideaDir), stage: milestone === 'M1' ? 'repo' : 'building', build: { ...(state.build || {}), milestone, status: 'failed', at: now.toISOString(), manual: !!manual, reason } });
    emit({ component: 'build', event: milestone, status: 'fail', subject: { idea: slug }, message: reason, durationMs: Date.now() - now.getTime(), data: { milestone, manual: !!manual, ...data } });
    return { ok: false, slug, milestone, reason, state: s };
  };

  let ws;
  try {
    ws = await openWorkspace({ slug, milestone, work, input: buildInput(slug, milestone) });
  } catch (e) {
    return failBuild(`couldn't start the build ${(policy.build.sandbox || 'docker') === 'host' ? 'on the host' : 'sandbox'}: ${String(e.message).slice(0, 300)}`);
  }
  try {
    const runOpts = { timeoutMs: policy.build.timeoutMinutes * 60_000, system: SYSTEM, env: { npm_config_ignore_scripts: 'true', CI: '1' },
      model: policy.build.model, effort: policy.build.effort, fallbackModel: policy.build.claudeFallbackModel,
      fallback: policy.build.fallback !== 'none' }; // subscription first, the free pool only if it can't take the work
    const run = await ws.claude(prompt(slug, milestone, ownerNote, { gstackFile: ws.gstackFile, provision: ws.kind === 'docker' ? 'file' : 'direct' }), { ...runOpts, engines });
    const engine = engineLabel(run);
    const usage = { milestone, manual: !!manual, model: run.info.model ?? null, engine: run.engine, effort: run.engine === 'free' ? null : policy.build.effort || null, sandbox: ws.kind,
      fellBack: run.engine === 'free' || (!!run.info.model && !!policy.build.model && !run.info.model.includes(policy.build.model)), ...(run.primaryReason ? { primaryReason: String(run.primaryReason).slice(0, 200) } : {}) };
    let testsPassing = await ws.test();
    let patch = await ws.patch();
    if (!patch.trim()) return failBuild(run.reason || 'no changes made', usage);

    // Credentials: one repair round, then no PR.
    const known = knownSecrets(ws.secrets);
    let findings = scanPatch(patch, { known });
    let repaired = false;
    if (findings.length) {
      emit({ component: 'build', event: milestone, status: 'info', subject: { idea: slug }, message: `secret scan: ${findings.length} credential-shaped string(s), asking the builder to fix them`, data: { findings: findings.slice(0, 20) } });
      await ws.claude(repairPrompt(findings), { ...runOpts, timeoutMs: 15 * 60_000, engines: run.engine === 'free' ? ['free'] : ['claude', 'free'] });
      testsPassing = await ws.test();
      patch = await ws.patch();
      findings = scanPatch(patch, { known });
      repaired = true;
    }
    if (findings.length) {
      return failBuild(`secret scan: credential-shaped strings still in the changes after a repair round, so no PR was opened: ${formatFindings(findings, 5).replace(/\n/g, '; ')}`, { ...usage, findings: findings.slice(0, 20) });
    }

    // What a sandboxed builder asked the credential broker for: checked, then run here on the Mac.
    const provisioned = [];
    const provisionText = await ws.provisionFile();
    if (provisionText) {
      const { ok, rejected } = provisionCommands(provisionText, slug);
      for (const args of ok) {
        try { execFileSync(PROVISION, args, { stdio: 'pipe', timeout: 5 * 60_000 }); provisioned.push(`${args.join(' ')}: done`); } catch (e) { provisioned.push(`${args.join(' ')}: failed (${String(e.stderr || e.message).trim().split('\n').pop().slice(0, 160)})`); }
      }
      for (const line of rejected) provisioned.push(`${line}: refused (not a broker verb for ${slug})`);
      emit({ component: 'build', event: milestone, status: 'info', subject: { idea: slug }, message: `provisioning for ${slug}: ${provisioned.join('; ').slice(0, 600)}` });
    }

    await ws.stage(patch);
    sh('git', ['-c', 'user.name=idea-factory', '-c', 'user.email=idea-factory@users.noreply.github.com', 'commit', '-q', '-m', `${milestone}: ${slug} (tests ${testsPassing ? 'passing' : 'failing'})`], work);
    let prUrl = null;
    if (push) {
      sh('git', ['push', '-q', '-u', 'origin', branch], work);
      const body = [
        `${milestone} for **${slug}**, built by the idea pipeline, tests first. Engine: ${engine}. Built in ${ws.kind === 'docker' ? 'the factory\'s Docker sandbox' : 'host mode (on the Mac)'}.`, '',
        `Tests: ${testsPassing ? '✅ passing' : '❌ failing'} (\`npm test\` run by the pipeline after the build).`,
        `Secret scan: clean${repaired ? ' after one repair round' : ''}.`,
        ...(provisioned.length ? [`Provisioned through the credential broker: ${provisioned.join('; ')}.`] : []),
        run.reason ? `Builder note: ${run.reason}` : `Builder: ${run.info.result.slice(0, 300)}`, '',
        fs.existsSync(path.join(work, 'BUILD.md')) ? fs.readFileSync(path.join(work, 'BUILD.md'), 'utf8').slice(0, 6000) : '_No BUILD.md written._', '',
        '_Review it like any factory PR: merge if it does what the milestone says. Nothing here spends money._',
      ].join('\n');
      prUrl = sh('gh', ['pr', 'create', '--draft', '--base', 'main', '--head', branch, '--title', `${milestone}: ${slug}`, '--body', body], work);
    }
    const s = P.writeState(ideaDir, { ...P.readState(ideaDir), stage: 'building', build: { ...(state.build || {}), milestone, status: prUrl ? 'pr-open' : 'local', prUrl, testsPassing, engine: run.engine, model: run.info.model || null, effort: run.engine === 'free' ? null : policy.build.effort || null, manual: !!manual, sandbox: ws.kind, at: now.toISOString(), ...(advice ? { advice } : {}) } });
    emit({ component: 'build', event: milestone, status: testsPassing ? 'ok' : 'fail', subject: { idea: slug, pr: prUrl || undefined }, durationMs: Date.now() - now.getTime(), data: { ...usage, testsPassing, prUrl, repaired },
      message: `${milestone} ${prUrl ? `PR ${prUrl}` : 'built locally'}, tests ${testsPassing ? 'passing' : 'failing'}, engine ${run.engine}${advice ? `, advisor ${advice.difficulty}` : ''}` });
    return { ok: true, slug, milestone, prUrl, testsPassing, engine: run.engine, model: run.info.model, builderReason: run.reason, state: s };
  } finally {
    await ws.close();
  }
}

/** What the builder gets when the secret scan finds something (pure). */
function repairPrompt(findings) {
  return `The pipeline's secret scan found credential-shaped strings in your changes. Fix every one, and change nothing else:
- a fake value in a test, fixture or example: build it at runtime from a prefix and a repeated filler, e.g. ['sk', 'ant', 'api03', 'A1b2C3d4'.repeat(6)].join('-'), so the literal never appears in the source (a shared helper file is fine);
- anything that could be a real credential: delete it and read it from an environment variable instead.
Then run \`npm test\` again and keep it passing. Findings (file:line, kind):
${formatFindings(findings, 40)}`;
}

/** The Claude subscription token for the sandbox (`claude setup-token`), from the keychain. Null if unset. */
function sandboxToken(service = policy.build.tokenService || 'idea-build-claude-token') {
  if (process.env.IDEA_BUILD_CLAUDE_TOKEN) return process.env.IDEA_BUILD_CLAUDE_TOKEN;
  try { return execFileSync('security', ['find-generic-password', '-s', service, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; } catch { return null; }
}

/**
 * Where the builder works: { kind, gstackFile, secrets, claude(prompt, opts), test(), patch(), provisionFile(), stage(patch), close() }.
 * docker (default): everything that runs code runs in the factory sandbox; host: the clone on this Mac.
 */
async function openWorkspace({ slug, milestone, work, input, startSessionFn = startSession, token = sandboxToken }) {
  if ((policy.build.sandbox || 'docker') === 'host') {
    const inputDir = path.join(DATA, 'work', '.build-input');
    const gstackFile = input ? path.join(inputDir, `${slug}-${milestone}.md`) : null;
    if (input) { fs.mkdirSync(inputDir, { recursive: true }); fs.writeFileSync(gstackFile, input); }
    return {
      kind: 'host', gstackFile, secrets: [],
      claude: (text, opts) => claudeTask(text, { ...opts, cwd: work, tools: tools(work, gstackFile ? [gstackFile] : []), addDirs: gstackFile ? [inputDir] : [] }),
      test: async () => spawnSync('npm', ['test', '--silent'], { cwd: work, encoding: 'utf8', timeout: 10 * 60_000, env: { ...process.env, CI: '1', npm_config_ignore_scripts: 'true' } }).status === 0,
      patch: async () => { sh('git', ['add', '-A', '--', '.', ':(exclude)node_modules'], work); return execFileSync('git', ['diff', '--cached', '--binary'], { cwd: work, encoding: 'utf8', maxBuffer: 200 * 1024 * 1024 }); },
      provisionFile: async () => null, // on the host the builder runs the broker itself
      stage: async () => {},
      close: async () => { if (gstackFile) fs.rmSync(gstackFile, { force: true }); },
    };
  }
  const oauthToken = token();
  if (!oauthToken) throw new Error(`no Claude subscription token for the sandbox: run \`claude setup-token\`, then \`security add-generic-password -U -s ${policy.build.tokenService || 'idea-build-claude-token'} -a "$USER" -w <token>\``);
  const sb = startSessionFn({ log: () => {} });
  try {
    const info = await sb.open(work, { allowHosts: ['api.anthropic.com'], allowModels: policy.build.fallback === 'none' ? [] : [FREE_MODEL] });
    const inputDir = '/home/worker/build-input';
    const gstackFile = input ? `${inputDir}/${slug}-${milestone}.md` : null;
    if (input) await sb.put(gstackFile, input);
    const sandbox = { exec: sb.exec, workdir: info.workdir, relayUrl: info.relayUrl, modelKey: info.modelKey };
    return {
      kind: 'docker', gstackFile, secrets: [oauthToken],
      claude: (text, opts) => claudeTask(text, { ...opts, sandbox, oauthToken, cwd: info.workdir, tools: tools(info.workdir, gstackFile ? [gstackFile] : [], { sandbox: true }), addDirs: gstackFile ? [inputDir] : [] }),
      test: async () => (await sb.exec('npm', ['test', '--silent'], { env: { CI: '1', npm_config_ignore_scripts: 'true' }, timeoutMs: 10 * 60_000 })).code === 0,
      // .provision is a request to the host, never part of the product repo.
      patch: async () => fs.readFileSync(await sb.patch(['.provision']), 'utf8'),
      provisionFile: async () => { const r = await sb.exec('cat', ['.provision'], { timeoutMs: 30_000 }); return r.code === 0 ? r.output : null; },
      // The clone on the host is still at the base commit: apply the sandbox's diff and stage it.
      stage: async (patch) => {
        const file = path.join(DATA, 'work', `.${slug}-${milestone}.patch`);
        fs.writeFileSync(file, patch);
        // Anything the host put in the clone before the sandbox opened (REVIEW.md) is in the patch too.
        sh('git', ['checkout', '-q', '--', '.'], work);
        sh('git', ['clean', '-fdq'], work);
        try { sh('git', ['apply', '--binary', '--index', file], work); } finally { fs.rmSync(file, { force: true }); }
      },
      close: () => sb.close(),
    };
  } catch (e) {
    await sb.close();
    throw e;
  }
}

module.exports = { buildOne, tools, milestones, nextMilestone, prompt, milestoneText, engineOrder, manualBuildTarget, buildMessage, engineLabel, buildInput, extractSection, GSTACK_BUILD_SECTIONS, repairPrompt, openWorkspace, sandboxToken, provisionCommands };

if (require.main === module) {
  const slug = process.argv[2];
  if (!slug) { console.log(JSON.stringify({ ok: false, error: 'usage: idea-build.js <slug> [--no-push]' })); process.exit(1); }
  const mi = process.argv.indexOf('--milestone');
  buildOne(slug, { push: !process.argv.includes('--no-push'), milestone: mi > 0 ? process.argv[mi + 1] : 'M1' }).then((o) => {
    console.log(JSON.stringify({ ...o, state: undefined }));
    if (!o.ok) process.exitCode = 1;
  });
}
