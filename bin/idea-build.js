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
// Screenshot proof (David's rule, 2026-10-11): every build captures the product working in a real
// browser (Playwright, desktop and phone) and puts the screenshots at the top of README.md. One
// reminder round if they're missing; the PR shows them, or says they're missing.
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { claudeTask, FREE_MODEL } = require('../lib/claude');
const { scanPatch, formatFindings, knownSecrets } = require('../lib/secret-scan');
const { startSession } = require('../lib/sandbox');
const P = require('../lib/pipeline');
const { emit } = require('../lib/events');
const { authorArgs, commitAuthor } = require('../lib/author');

const ROOT = path.resolve(__dirname, '..');
// The record and the build's scratch space; IDEA_PIPELINE_DATA points them elsewhere (tests), like the pipeline.
const DATA = process.env.IDEA_PIPELINE_DATA || ROOT;
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'policy.json'), 'utf8'));
const GH_OWNER = process.env.IDEA_GH_OWNER || 'smithdavedesign';

/** The credential broker (ai-stack bin/provision): fixed verbs, values never printed. */
const PROVISION = path.join(process.env.HOME, 'ai-stack', 'bin', 'provision');
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

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

/**
 * How the builder proves the product works (David's rule, 2026-10-11): screenshots from a real browser
 * at the top of README.md. The sandbox image has Chromium at $CHROMIUM_PATH (RepoHQ
 * factory/docker/worker.Dockerfile); its egress has no route to a browser CDN.
 */
const SCREENSHOT_STEPS = `- Add \`npm run screenshots\` (scripts/screenshots.mjs, with playwright-core as a devDependency) if it isn't there. It starts the app itself (the production build if that's quick, else the dev server), waits until it answers on localhost, drives it with Playwright, saves the PNGs and stops the app. Launch Chromium with \`executablePath: process.env.CHROMIUM_PATH\`; never download a browser.
- Capture the product doing its main job with realistic sample data, not just the landing page: the start page, the core action and its result. Each at desktop size (1280×800) and on a phone (Playwright's devices['iPhone 13']), viewport only. At most 6 PNGs in docs/screenshots/, named for what they show (home-desktop.png, result-mobile.png).
- Not a web app (a CLI, an API, a library)? Run it for real and screenshot that: the actual command and its output, or a real request and its response, on a plain HTML page.
- Run it, then open every PNG with Read and look at it: a blank page, an error overlay or a spinner isn't proof. Fix the app or the script and run it again.
- At the very top of README.md, right under the title: a "## Screenshots" section with each one as ![what it shows](docs/screenshots/<file>.png) and a one-line caption saying what it proves. Replace older screenshots there; don't pile them up.
- Sample data only: no secret, token or real person's data in a screenshot. Keep the screenshot run out of \`npm test\`.`;
/** The reminder round when they're missing: an install, a production build and a browser run. */
const SCREENSHOT_ROUND_MINUTES = 30;

/** The text from a heading matching `start` up to the next heading matching `stop` (or the end). */
function extractSection(md, start, stop) {
  const lines = String(md).split('\n');
  const i = lines.findIndex((l) => start.test(l));
  if (i < 0) return '';
  const j = lines.findIndex((l, k) => k > i && stop.test(l));
  return lines.slice(i, j < 0 ? undefined : j).join('\n').trim();
}

/** The gstack frameworks for one build, as markdown (pure apart from reading gstack). Null without gstack. */
/** `milestone` is a label for the header: "M2", or "the MVP (M1–M3)". */
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
function tools(dir, extraRead = [], { sandbox = false, broker = true } = {}) {
  return [
    `Read(/${dir}/**)`, ...extraRead.map((f) => `Read(/${f})`), `Write(/${dir}/**)`, `Edit(/${dir}/**)`, 'Glob', 'Grep', 'WebSearch', ...(sandbox ? [] : ['WebFetch']),
    'Bash(npm install:*)', 'Bash(npm i:*)', 'Bash(npm ci:*)', 'Bash(npm test:*)', 'Bash(npm run:*)',
    'Bash(npx vitest:*)', 'Bash(npx tsc:*)', 'Bash(npx eslint:*)', 'Bash(node:*)',
    'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(ls:*)', 'Bash(mkdir:*)', 'Bash(cat:*)',
    // A growth build may only file a request with the broker (`broker: false`), never create anything.
    ...(sandbox ? [] : [broker ? `Bash(${PROVISION}:*)` : `Bash(${PROVISION} request:*)`]),
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
function prompt(slug, milestone = 'M1', ownerNote = '', { gstackFile = null, provision = 'direct', mvp = null } = {}) {
  const first = milestone === 'M1';
  // An MVP run builds several milestones one after another in the same session (buildOne({mvp})).
  const mvpNote = mvp ? `
This is an MVP run: you're building ${mvp.all.join(', ')} one after another in this session, so the product is usable and can take money at the end. Now: ${milestone} (${mvp.index + 1} of ${mvp.all.length}).${mvp.index > 0 ? ` ${mvp.all.slice(0, mvp.index).join(', ')} ${mvp.index === 1 ? 'is' : 'are'} done in this session: keep their tests passing and build on them.` : ''}
REVENUE.md, if present, says who pays and what must exist before charging (checkout, legal pages…): build those parts in the milestone they fit.` : '';
  const note = String(ownerNote || '').trim().slice(0, 1000);
  const plan = gstackFile ? `
0. Plan first with the gstack engineering frameworks in ${gstackFile} (read it): apply "Step 0: Scope Challenge", "1. Architecture review" and "3. Test review" to ${milestone} yourself. Keep the narrowest version that meets the exit criteria. Put the outcome at the top of BUILD.md as "## Plan": scope (and what's deliberately not in it), architecture, test plan.` : '';
  // The last milestone of the run shows the product working (an MVP that stops early gets a reminder round).
  const proof = !mvp || mvp.index === mvp.all.length - 1 ? `
5. Screenshot proof that it works, with the tests passing:
${SCREENSHOT_STEPS}` : '';
  const selfReview = gstackFile ? `
${proof ? 6 : 5}. Self-review your diff (\`git status\`, \`git diff\`) against gstack's pre-landing checklist in the same file ("Review Categories", "Fix-First Heuristic"). Fix every CRITICAL finding and rerun the tests, then list what's left in BUILD.md as "## Review".` : '';
  return `You are in the repo for the idea "${slug}". Read PRD.md, ROADMAP.md, REVIEW.md and BUILD.md (if present) first.${note ? `
The owner approved this build with a note; follow it where it fits ${milestone}'s scope and the $0 rule:
---
${note}
---` : ''}
Build ROADMAP.md's ${milestone} and nothing beyond it${first ? '' : ' (earlier milestones are already built; keep their tests passing)'}:${mvpNote}${plan}
1. Turn ${milestone}'s exit criteria into automated tests (vitest or node:test) that fail now. Each exit criterion becomes at least one test.
2. ${first ? 'Scaffold the smallest stack that fits the roadmap\'s suggestion and runs at $0 (static site, Next.js or a small Node service; free tiers only). Add "test" to package.json scripts.' : 'Extend the existing code; keep the stack and the $0 rule.'}
3. Implement until \`npm test\` passes. Don't weaken or delete a test to make it pass.
4. ${first ? 'Write' : 'Update'} BUILD.md: what the product does now, how to run it locally, how to deploy it on a free tier, which exit criteria pass, and what's left.${proof}${selfReview}
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

/**
 * The go-live build (buildOne({golive})): make a built product ready for a public launch without
 * changing what it does (pure). `price` from the revenue plan, `signalUrl` RepoHQ's visit endpoint.
 */
function goLivePrompt(slug, { price = '', signalUrl = '', gstackFile = null, provision = 'direct', ownerNote = '' } = {}) {
  const note = String(ownerNote || '').trim().slice(0, 1000);
  const provisionLines = [`vercel project ${slug}`, ...(price ? [`request "Stripe payment link for ${slug}: ${price}, per REVENUE.md"`] : [])];
  return `You are in the repo for "${slug}", a built product. Make it ready for a public launch without changing what it does. Read README.md, PRD.md, BUILD.md and REVENUE.md (if present) first.${note ? `
The owner asked for this with a note; follow it where it fits:
---
${note}
---` : ''}
1. Search and sharing: every public page gets a unique <title> and meta description, Open Graph and Twitter card tags with a 1200×630 share image, a canonical URL, and JSON-LD (SoftwareApplication${price ? `, with an Offer for ${price}` : ''}). Add robots.txt (allow indexing, point at the sitemap) and sitemap.xml listing the public pages. Use the framework's own conventions (e.g. Next.js metadata, opengraph-image, robots.ts, sitemap.ts). The share image is generated at build time or drawn with code; never copy an image from the web.
2. A /privacy page and a /terms page, plain and honest: what the product collects (say "nothing" if that's true), cookies (none unless needed), the visit beacon below, and contact through the GitHub repo's issues. Terms: no warranty${price ? `, and the price and refund line from REVENUE.md` : ''}. Link both from the footer.
3. Payment: ${price ? `a clear "Buy" button (or "Get Pro") linking to the URL in the STRIPE_PAYMENT_LINK env var (NEXT_PUBLIC_STRIPE_PAYMENT_LINK if it must reach the browser), hidden when the variable is unset.` : 'no plan with a price yet: skip payments.'} Never hard-code a payment link or key.
4. Visit beacon, so RepoHQ counts real use: POST JSON {"slug": "${slug}", "kind": "<kind>", "referrer": <referrer>} to ${signalUrl || 'the RepoHQ signal URL'} (fire-and-forget, keepalive, no cookies) for three events:
   - "visit" on every public page, once per browser session (sessionStorage);
   - "activate" the first time someone uses the product's core action, once per browser (localStorage); name that action in LAUNCH-READY.md;
   - "checkout" when someone clicks Buy.
   The referrer is document.referrer only when it comes from another site (its origin differs from location.origin), else null, so share links never leave the page. Send nothing when navigator.webdriver is true (bots, screenshot runs), on preview deployments (Vercel's VERCEL_ENV isn't "production"; Next.js sees it as NEXT_PUBLIC_VERCEL_ENV), or when localStorage "repohq:notrack" is set (the owner's browser). The privacy page names the three events.
5. Deployment: ${provision === 'file' ? `you can't provision from here; write \`.provision\` at the repo root with these lines, and the pipeline runs them through the credential broker after the build:
${provisionLines.map((l) => `  ${l}`).join('\n')}` : `run ${provisionLines.map((l) => `\`${PROVISION} ${l}\``).join(' and ')}.`}
6. Keep \`npm test\` passing, and add tests for what you can: the pages render, robots.txt and the sitemap exist, and the Buy button is hidden without the env var.
7. Screenshot proof of the launch-ready site (footer links and the Buy button included; give the screenshot run a placeholder STRIPE_PAYMENT_LINK such as https://example.com/pay):
${SCREENSHOT_STEPS}
8. Write LAUNCH-READY.md: what you did, how to check it, and what's left for David (the Stripe payment link to paste into the Vercel env as STRIPE_PAYMENT_LINK; a custom domain if he wants one).${gstackFile ? `
9. Self-review your diff (\`git status\`, \`git diff\`) against gstack's pre-landing checklist in ${gstackFile} ("Review Categories", "Fix-First Heuristic"), and fix every CRITICAL finding.` : ''}
Install scripts are disabled (npm_config_ignore_scripts); choose packages that work without them, and prefer none.
Your final message: one line — tests passing or not, and what's left for David.`;
}

/**
 * A growth build (buildOne({growth}), the growth loop's step 5d): one change to a live product, to test one
 * idea about its funnel (pure). `exp` is the experiment (lib/growth.js newExperiment), `task` the mission
 * (missionTask), `briefFile` the brief with the funnel, lessons and the playbook's rules.
 */
function growthPrompt(slug, { exp, task, briefFile = null, signalUrl = '', provision = 'direct', ui = true } = {}) {
  const { valueText } = require('../lib/growth');
  return `You are in the repo for "${slug}", a live product. Make one change, to test one idea about its funnel, and nothing else. Read README.md, PRD.md, REVENUE.md, BUILD.md and GROWTH.md (if present) first${briefFile ? `, then the brief in ${briefFile}: the mission, the product's funnel numbers, what earlier experiments taught, the playbook's rules and gstack's review checklist` : ''}.
The mission: ${task}
The experiment: ${exp.hypothesis} Metric: ${valueText(exp.metric, exp.baseline)} now; the target is ${valueText(exp.metric, exp.target)} within ${exp.windowDays} days of the merge.
1. Make the change, and keep to the mission: no refactors, no features beyond it, no new dependencies unless the mission needs one. Never change a price or hard-code a payment link or key.
2. Keep the beacon to ${signalUrl || 'the RepoHQ signal URL'} working (visit, activate, checkout): if you move the core action or the Buy button, their events move with them.
3. Add tests for what you changed and keep \`npm test\` passing. Don't weaken or delete a test.
4. Honest copy only: no invented numbers, quotes, testimonials, user counts or claims the product can't back. Use the buyer's words from RESEARCH.md and REVENUE.md.
5. Append to GROWTH.md (create it if missing): the date, the mission, what you changed and why, and how the metric is measured. Keep earlier entries.${ui ? `
6. Screenshot proof of what changed, with the tests passing (the main flow included):
${SCREENSHOT_STEPS}` : ''}${briefFile ? `
${ui ? 7 : 6}. Self-review your diff (\`git status\`, \`git diff\`) against gstack's pre-landing checklist in the brief ("Review Categories", "Fix-First Heuristic"), and fix every CRITICAL finding.` : ''}
Provisioning: you can't create services or keys in a growth build. If the change needs something only David can set up, ${provision === 'file' ? 'write one line to `.provision` at the repo root:' : 'run'} ${provision === 'file' ? '' : `${PROVISION} `}request "<what> for ${slug}: <why>"${provision === 'file' ? '' : ' (nothing else from the broker)'}, build behind an env var, and say so in GROWTH.md.
Install scripts are disabled (npm_config_ignore_scripts); choose packages that work without them, and prefer none.
Your final message: one line — tests passing or not, and what you changed.`;
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
  // A live product can still have roadmap milestones left. A go-live or growth build isn't on the roadmap,
  // so after one (merged or not) the next roadmap milestone is what's left to build.
  if (['building', 'live'].includes(state.stage) && ['merged', 'failed', 'closed'].includes(b.status)) {
    if (b.status !== 'merged' && P.isRoadmapBuild(b.milestone)) return { ok: true, milestone: b.milestone || 'M1' };
    const next = nextMilestone(roadmap, state.milestonesDone || []);
    return next ? { ok: true, milestone: next } : { ok: false, reason: 'every roadmap milestone is merged' };
  }
  return { ok: false, reason: `nothing to build at stage "${state.stage}"` };
}

/**
 * What an MVP run builds (pure): from the milestone a single build would start at, every remaining
 * roadmap milestone, at most `max`. {ok, milestone: 'MVP', milestones} or {ok: false, reason}.
 */
function mvpMilestones(state, roadmap = '', max = 6) {
  const t = manualBuildTarget(state, roadmap);
  if (!t.ok) return t;
  const all = milestones(roadmap);
  if (!all.length) return { ok: true, milestone: 'MVP', milestones: [t.milestone] };
  const done = new Set(state.milestonesDone || []);
  const from = Math.max(0, all.indexOf(t.milestone));
  const list = all.slice(from).filter((m) => !done.has(m)).slice(0, max);
  return list.length ? { ok: true, milestone: 'MVP', milestones: list } : { ok: false, reason: 'every roadmap milestone is merged' };
}

/** The plan's price text ("$9/month"), or '' without a plan. */
function priceOf(ideaDir) {
  try { const { validatePlan, priceText } = require('../lib/revenue'); const c = validatePlan(JSON.parse(fs.readFileSync(path.join(ideaDir, 'revenue.json'), 'utf8'))); return c.ok ? priceText(c.plan.price) : ''; } catch { return ''; }
}

/** "M1–M3" or "M2" (pure). */
const rangeText = (ms) => (ms.length > 1 ? `${ms[0]}–${ms[ms.length - 1]}` : ms[0] || '');

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
/**
 * `mvp: true` ("let it rip"): every remaining roadmap milestone (mvpMilestones), one after another in
 * one session, then one PR. Stops at the first milestone whose tests fail, that falls back off the
 * subscription (policy.build.mvp.stopOnFallback), or past policy.build.mvp.maxMinutes; the PR has
 * what's done and the next build starts where it stopped.
 */
/**
 * `growth: {experiment, task, brief}` (the growth loop's step 5d): one change to a live product
 * (growthPrompt), branch growth-<experiment id>, on policy.growth's model and effort with no free-pool
 * fallback, the brief in the build-input file; nothing on the roadmap is marked done.
 */
async function buildOne(slug, { push = true, milestone = 'M1', manual = false, note = '', mvp = false, golive = false, growth = null } = {}) {
  const ideaDir = path.join(DATA, 'ideas', slug);
  const state = P.readState(ideaDir);
  if (!state.repo) return { ok: false, slug, reason: 'no repo yet (stage must be "repo")' };
  const mvpPolicy = { maxMilestones: 6, maxMinutes: 240, stopOnFallback: true, ...(policy.build.mvp || {}) };
  let planned = [milestone];
  if (mvp) {
    const roadmap = fs.existsSync(path.join(ideaDir, 'ROADMAP.md')) ? fs.readFileSync(path.join(ideaDir, 'ROADMAP.md'), 'utf8') : '';
    const t = mvpMilestones(state, roadmap, mvpPolicy.maxMilestones);
    if (!t.ok) return { ok: false, slug, reason: t.reason };
    planned = t.milestones;
    milestone = 'MVP';
  }
  // Go-live: one launch-readiness run (goLivePrompt), branch go-live; nothing on the roadmap is marked done.
  if (golive) { planned = ['GOLIVE']; milestone = 'GOLIVE'; }
  if (growth) { planned = ['GROWTH']; milestone = 'GROWTH'; }
  const branch = golive ? 'go-live' : growth ? `growth-${growth.experiment.id}` : milestone.toLowerCase();
  const eng = growth
    ? { model: policy.growth?.model || 'sonnet', effort: policy.growth?.effort || null, timeoutMinutes: policy.growth?.timeoutMinutes ?? 40, fallbackModel: undefined, fallback: false }
    : { model: policy.build.model, effort: policy.build.effort, timeoutMinutes: policy.build.timeoutMinutes, fallbackModel: policy.build.claudeFallbackModel, fallback: policy.build.fallback !== 'none' };
  const growthLabel = growth ? require('../lib/growth').KINDS[growth.experiment.kind]?.label || growth.experiment.kind : null;
  const full = state.repo.replace('https://github.com/', '');
  const work = path.join(DATA, 'work', slug);
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(work), { recursive: true });
  sh('gh', ['repo', 'clone', full, work, '--', '-q'], ROOT);
  sh('git', ['checkout', '-q', '-b', branch], work);
  // The record has the review; the product repo gets a copy for the builder.
  for (const f of ['REVIEW.md', 'REVENUE.md']) if (fs.existsSync(path.join(ideaDir, f)) && !fs.existsSync(path.join(work, f))) fs.copyFileSync(path.join(ideaDir, f), path.join(work, f));

  const now = new Date();
  // The tier advisor rates roadmap milestones; a go-live or growth build has none to rate.
  const advice = golive || growth ? null : rateMilestone(ideaDir, slug, planned[0]);
  const engines = engineOrder(advice?.difficulty ?? null, policy.build.advisor || 'report');
  // A live product stays live while it's being improved (step 4a still follows its PR).
  const stageNow = state.stage === 'live' ? 'live' : 'building';
  // The last PR's fate (merged by the pipeline, left for David, reverted) belongs to that PR, not this
  // build: carried over, it read as "merged by the pipeline" on codespend's open go-live PR (2026-10-12).
  const prev = { ...(state.build || {}) };
  for (const k of ['mergedBy', 'mergedAt', 'held', 'reverted']) delete prev[k];
  P.writeState(ideaDir, { ...state, stage: stageNow, build: { ...prev, milestone, ...(mvp ? { planned } : {}), status: 'running', at: now.toISOString(), manual, ...(advice ? { advice } : {}) } }, now);
  // "Running now" on RepoHQ's Agents page comes from this event until the build's own ok/fail lands.
  emit({ component: 'build', event: milestone, status: 'start', subject: { idea: slug }, message: `${mvp ? `MVP (${rangeText(planned)})` : growth ? `Growth build (${growthLabel})` : milestone} started${manual ? ' (Start build now)' : ''} on ${eng.model || 'claude'}${eng.effort ? ` at ${eng.effort}` : ''}`,
    data: { milestone, manual: !!manual, model: eng.model || null, effort: eng.effort || null, timeoutMinutes: mvp ? mvpPolicy.maxMinutes : eng.timeoutMinutes, ...(mvp ? { planned } : {}), ...(growth ? { experiment: growth.experiment.id } : {}) } });
  const ownerNote = String(note || '').trim() || (state.ownerDecision?.decision === 'build' ? state.ownerDecision.note : '');
  const failBuild = (reason, data = {}) => {
    const s = P.writeState(ideaDir, { ...P.readState(ideaDir), stage: state.stage === 'live' ? 'live' : (state.milestonesDone || []).length ? 'building' : 'repo', build: { ...prev, milestone, ...(mvp ? { planned } : {}), status: 'failed', at: now.toISOString(), manual: !!manual, reason } });
    emit({ component: 'build', event: milestone, status: 'fail', subject: { idea: slug }, message: reason, durationMs: Date.now() - now.getTime(), data: { milestone, manual: !!manual, ...data } });
    return { ok: false, slug, milestone, reason, state: s };
  };

  let ws;
  try {
    const minutes = (mvp ? mvpPolicy.maxMinutes + policy.build.timeoutMinutes + 20 : eng.timeoutMinutes + 30) + SCREENSHOT_ROUND_MINUTES;
    const input = growth ? [growth.brief, buildInput(slug, `a growth change (${growthLabel})`) || ''].join('\n\n') : buildInput(slug, mvp ? `the MVP (${rangeText(planned)})` : milestone);
    ws = await openWorkspace({ slug, milestone, work, input, lifetimeMs: minutes * 60_000, fallback: eng.fallback, broker: !growth });
  } catch (e) {
    return failBuild(`couldn't start the build ${(policy.build.sandbox || 'docker') === 'host' ? 'on the host' : 'sandbox'}: ${String(e.message).slice(0, 300)}`);
  }
  try {
    const runOpts = { timeoutMs: eng.timeoutMinutes * 60_000, system: SYSTEM, env: { npm_config_ignore_scripts: 'true', CI: '1' },
      model: eng.model, effort: eng.effort, fallbackModel: eng.fallbackModel,
      fallback: eng.fallback }; // subscription first, the free pool only if it can't take the work (never for growth builds)
    const fellBackOf = (r) => r.engine === 'free' || (!!r.info.model && !!eng.model && !r.info.model.includes(eng.model));
    const deadline = now.getTime() + mvpPolicy.maxMinutes * 60_000;
    const steps = []; // one per milestone attempted: {milestone, ok, testsPassing, engine, model, fellBack}
    let run = null;
    let testsPassing = false;
    let stopped = null;
    for (const [k, m] of planned.entries()) {
      if (k > 0 && Date.now() > deadline) { stopped = `time budget (${mvpPolicy.maxMinutes} min) used before ${m}`; break; }
      const text = growth
        ? growthPrompt(slug, { exp: growth.experiment, task: growth.task, briefFile: ws.gstackFile, signalUrl: policy.signalUrl, provision: ws.kind === 'docker' ? 'file' : 'direct', ui: growth.experiment.kind !== 'instrumentation' })
        : golive
        ? goLivePrompt(slug, { price: priceOf(ideaDir), signalUrl: policy.signalUrl, gstackFile: ws.gstackFile, provision: ws.kind === 'docker' ? 'file' : 'direct', ownerNote })
        : prompt(slug, m, ownerNote, { gstackFile: ws.gstackFile, provision: ws.kind === 'docker' ? 'file' : 'direct', mvp: mvp ? { all: planned, index: k } : null });
      run = await ws.claude(text, { ...runOpts, engines });
      testsPassing = await ws.test();
      steps.push({ milestone: m, ok: run.ok, testsPassing, engine: run.engine, model: run.info.model ?? null, fellBack: fellBackOf(run) });
      if (!mvp || k === planned.length - 1) break;
      if (!run.ok) { stopped = `${m}: the builder stopped (${String(run.reason || '').slice(0, 120)})`; break; }
      if (!testsPassing) { stopped = `${m}: tests failing`; break; }
      if (mvpPolicy.stopOnFallback && fellBackOf(run)) { stopped = `${m} ran on ${run.engine === 'free' ? 'the free pool' : run.info.model}, not ${policy.build.model}: stopping so the rest gets the strongest model`; break; }
    }
    // The last milestone failing says so too, so the PR tells where the next build starts.
    const last = steps[steps.length - 1];
    if (mvp && !stopped && last && !(last.ok && last.testsPassing)) stopped = `${last.milestone}: ${last.ok ? 'tests failing' : 'the builder stopped'}`;
    const completed = steps.filter((x) => x.ok && x.testsPassing).map((x) => x.milestone);
    const engine = engineLabel(run, growth ? { model: eng.model, effort: eng.effort } : policy.build);
    const usage = { milestone, manual: !!manual, model: run.info.model ?? null, engine: run.engine, effort: run.engine === 'free' ? null : eng.effort || null, sandbox: ws.kind,
      fellBack: steps.some((x) => x.fellBack), ...(mvp ? { planned, completed, stopped } : {}), ...(run.primaryReason ? { primaryReason: String(run.primaryReason).slice(0, 200) } : {}) };
    let patch = await ws.patch();
    if (!patch.trim()) return failBuild(run.reason || 'no changes made', usage);

    // Screenshot proof: one reminder round, then the PR says what's missing rather than losing the build.
    const checkShots = async () => { const refs = screenshotRefs(await ws.readFile('README.md')); return screenshotProof(refs, await ws.fileSizes(refs)); };
    let shots = await checkShots();
    let shotsReminded = false;
    if (!shots.ok) {
      emit({ component: 'build', event: milestone, status: 'info', subject: { idea: slug }, message: `screenshot proof: ${shots.problem}, asking the builder for it` });
      await ws.claude(screenshotPrompt(shots.problem), { ...runOpts, timeoutMs: SCREENSHOT_ROUND_MINUTES * 60_000, engines: run.engine === 'free' ? ['free'] : ['claude', 'free'] });
      testsPassing = await ws.test();
      patch = await ws.patch();
      shots = await checkShots();
      shotsReminded = true;
    }
    usage.screenshots = shots.ok ? shots.files.length : 0;

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
      // A growth build may only file requests for David; it never creates a service or a key.
      const allowed = growth ? ok.filter((args) => args[0] === 'request') : ok;
      for (const args of allowed) {
        try { execFileSync(PROVISION, args, { stdio: 'pipe', timeout: 5 * 60_000 }); provisioned.push(`${args.join(' ')}: done`); } catch (e) { provisioned.push(`${args.join(' ')}: failed (${String(e.stderr || e.message).trim().split('\n').pop().slice(0, 160)})`); }
      }
      for (const args of ok.filter((a) => !allowed.includes(a))) provisioned.push(`${args.join(' ')}: refused (a growth build may only file requests)`);
      for (const line of rejected) provisioned.push(`${line}: refused (not a broker verb for ${slug})`);
      emit({ component: 'build', event: milestone, status: 'info', subject: { idea: slug }, message: `provisioning for ${slug}: ${provisioned.join('; ').slice(0, 600)}` });
    }

    await ws.stage(patch);
    const title = golive ? `Go live: ${slug} (launch-ready)` : growth ? `Growth: ${slug} (${growthLabel})` : mvp ? `MVP: ${slug} (${rangeText(completed.length ? completed : planned)})` : `${milestone}: ${slug}`;
    // As the owner's GitHub account (lib/author.js): Vercel only builds previews of a private repo's owner's commits.
    sh('git', [...authorArgs(commitAuthor({ exec: execFileSync })), 'commit', '-q', '-m', `${title} (tests ${testsPassing ? 'passing' : 'failing'})`], work);
    let prUrl = null;
    if (push) {
      sh('git', ['push', '-q', '-u', 'origin', branch], work);
      // Pinned to the commit, so the PR's images outlive the branch.
      const sha = sh('git', ['rev-parse', 'HEAD'], work);
      const gallery = shots.ok ? [shots.files.slice(0, 6).map((f) => `<img src="https://github.com/${full}/blob/${sha}/${f}?raw=true" alt="${f}" height="320">`).join(' '), ''] : [];
      const { valueText } = require('../lib/growth');
      const exp = growth?.experiment;
      const body = [
        `${golive ? `**${slug}**, made launch-ready (SEO basics, privacy and terms, payment link, visit beacon, Vercel project)` : growth ? `One growth change to **${slug}** (${growthLabel}), from the growth loop` : mvp ? `The MVP for **${slug}** (${planned.join(', ')} in one run)` : `${milestone} for **${slug}**`}, built by the idea pipeline${golive || growth ? '' : ', tests first'}. Engine: ${engine}. Built in ${ws.kind === 'docker' ? 'the factory\'s Docker sandbox' : 'host mode (on the Mac)'}.`, '',
        ...(exp ? [`**The experiment** (\`${exp.id}\`): ${exp.hypothesis}`,
          `- Metric: ${valueText(exp.metric, exp.baseline)} now; the target is ${valueText(exp.metric, exp.target)} within ${exp.windowDays} days of the merge.`,
          '- **Merging starts the experiment; closing this PR abandons it.** The pipeline judges it when the window ends.', ''] : []),
        ...(mvp ? [...steps.map((x) => `- ${x.milestone}: ${x.ok && x.testsPassing ? '✅ built, tests passing' : x.ok ? '❌ built, tests failing' : '❌ the builder stopped'} (${x.engine === 'free' ? 'free pool' : x.model || 'Claude'})`),
          ...planned.filter((m) => !steps.some((x) => x.milestone === m)).map((m) => `- ${m}: not started`),
          ...(stopped ? [`Stopped: ${stopped}. Merging marks ${completed.length ? completed.join(', ') : 'nothing'} done; the next build starts at the first one that isn't.`] : []), ''] : []),
        `Tests: ${testsPassing ? '✅ passing' : '❌ failing'} (\`npm test\` run by the pipeline after the build).`,
        `Secret scan: clean${repaired ? ' after one repair round' : ''}.`,
        `Screenshot proof: ${shots.ok ? `✅ ${shots.files.length} screenshots at the top of README.md${shotsReminded ? ' (after one reminder)' : ''}` : `❌ ${shots.problem}${shotsReminded ? ', even after one reminder' : ''}`}.`,
        ...gallery,
        ...(provisioned.length ? [`Provisioned through the credential broker: ${provisioned.join('; ')}.`] : []),
        run.reason ? `Builder note: ${run.reason}` : `Builder: ${run.info.result.slice(0, 300)}`, '',
        golive ? (fs.existsSync(path.join(work, 'LAUNCH-READY.md')) ? fs.readFileSync(path.join(work, 'LAUNCH-READY.md'), 'utf8').slice(0, 6000) : '_No LAUNCH-READY.md written._')
          : growth ? (fs.existsSync(path.join(work, 'GROWTH.md')) ? fs.readFileSync(path.join(work, 'GROWTH.md'), 'utf8').slice(-6000) : '_No GROWTH.md written._')
          : fs.existsSync(path.join(work, 'BUILD.md')) ? fs.readFileSync(path.join(work, 'BUILD.md'), 'utf8').slice(0, 6000) : '_No BUILD.md written._', '',
        `_Review it like any factory PR: merge if it does what the ${growth ? 'mission' : 'milestone'} says. Nothing here spends money._`,
      ].join('\n');
      prUrl = sh('gh', ['pr', 'create', '--draft', '--base', 'main', '--head', branch, '--title', title, '--body', body], work);
    }
    // On merge, the pipeline marks `milestones` done: the ones that completed, not every one attempted.
    const s = P.writeState(ideaDir, { ...P.readState(ideaDir), stage: stageNow, build: { ...prev, milestone, milestones: golive || growth ? [] : mvp ? completed : [milestone], ...(mvp ? { planned, stopped } : {}), ...(growth ? { experiment: growth.experiment.id, kind: growth.experiment.kind } : {}), ...(golive ? { beacon: 'funnel' } : {}), status: prUrl ? 'pr-open' : 'local', prUrl, testsPassing, engine: run.engine, model: run.info.model || null, effort: run.engine === 'free' ? null : eng.effort || null, manual: !!manual, sandbox: ws.kind, at: now.toISOString(), ...(advice ? { advice } : {}) } });
    emit({ component: 'build', event: milestone, status: testsPassing ? 'ok' : 'fail', subject: { idea: slug, pr: prUrl || undefined }, durationMs: Date.now() - now.getTime(), data: { ...usage, testsPassing, prUrl, repaired, shotsReminded },
      message: `${mvp ? `MVP (${completed.join(', ') || 'nothing complete'}${stopped ? `; stopped: ${stopped.slice(0, 120)}` : ''})` : milestone} ${prUrl ? `PR ${prUrl}` : 'built locally'}, tests ${testsPassing ? 'passing' : 'failing'}, engine ${run.engine}${advice ? `, advisor ${advice.difficulty}` : ''}` });
    return { ok: true, slug, milestone, prUrl, testsPassing, engine: run.engine, model: run.info.model, builderReason: run.reason, state: s, ...(mvp ? { planned, completed, stopped } : {}) };
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

/**
 * The local images at the top of a README (pure): those before its first "## " section that isn't the
 * screenshots one. Remote images and paths that leave the repo don't count as proof.
 */
function screenshotRefs(readme) {
  const refs = [];
  for (const line of String(readme || '').split('\n')) {
    const h = line.match(/^##\s+(.*)/);
    if (h && !/screenshot|demo|proof/i.test(h[1])) break;
    for (const m of line.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?[^)]*\)|<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
      const p = (m[1] || m[2]).replace(/^\.\//, '').split(/[?#]/)[0];
      if (/^[\w.-][\w./-]*\.(?:png|jpe?g|webp|gif)$/i.test(p) && !p.split('/').includes('..') && !refs.includes(p)) refs.push(p);
    }
  }
  return refs;
}

/** Whether README's screenshots prove anything (pure): `sizes` maps each ref to its size in the repo. */
function screenshotProof(refs, sizes = {}) {
  const missing = refs.filter((p) => !(sizes[p] > 0));
  if (!refs.length) return { ok: false, files: [], problem: 'no screenshots at the top of README.md' };
  if (missing.length) return { ok: false, files: refs, problem: `README.md shows screenshots that aren't in the repo (${missing.slice(0, 4).join(', ')})` };
  if (refs.length < 2) return { ok: false, files: refs, problem: 'only one screenshot at the top of README.md (desktop and phone are both needed)' };
  return { ok: true, files: refs, problem: null };
}

/** What the builder gets when the screenshot proof is missing (pure). */
function screenshotPrompt(problem) {
  return `The pipeline checked README.md for screenshot proof that the product works and found ${problem}. Add the proof now, and change the product only where a screenshot shows it broken:
${SCREENSHOT_STEPS}
Then run \`npm test\` again and keep it passing. Your final message: one line — how many screenshots and what they show.`;
}

/** The Claude subscription token for the sandbox (`claude setup-token`), from the keychain. Null if unset. */
function sandboxToken(service = policy.build.tokenService || 'idea-build-claude-token') {
  if (process.env.IDEA_BUILD_CLAUDE_TOKEN) return process.env.IDEA_BUILD_CLAUDE_TOKEN;
  try { return execFileSync('security', ['find-generic-password', '-s', service, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; } catch { return null; }
}

/**
 * Where the builder works: { kind, gstackFile, secrets, claude(prompt, opts), test(), patch(), readFile(rel), fileSizes(rels), provisionFile(), stage(patch), close() }.
 * docker (default): everything that runs code runs in the factory sandbox; host: the clone on this Mac.
 */
/**
 * `fallback: false` keeps the free pool out of the sandbox (growth builds); `broker: false` lets a host-mode
 * builder file broker requests only.
 */
async function openWorkspace({ slug, milestone, work, input, lifetimeMs, startSessionFn = startSession, token = sandboxToken, fallback = policy.build.fallback !== 'none', broker = true }) {
  if ((policy.build.sandbox || 'docker') === 'host') {
    const inputDir = path.join(DATA, 'work', '.build-input');
    const gstackFile = input ? path.join(inputDir, `${slug}-${milestone}.md`) : null;
    if (input) { fs.mkdirSync(inputDir, { recursive: true }); fs.writeFileSync(gstackFile, input); }
    return {
      kind: 'host', gstackFile, secrets: [],
      // The screenshot run uses the Mac's Chrome here (the sandbox has its own Chromium).
      claude: (text, opts) => claudeTask(text, { ...opts, env: { ...opts.env, ...(fs.existsSync(MAC_CHROME) ? { CHROMIUM_PATH: MAC_CHROME } : {}) }, cwd: work, tools: tools(work, gstackFile ? [gstackFile] : [], { broker }), addDirs: gstackFile ? [inputDir] : [] }),
      test: async () => spawnSync('npm', ['test', '--silent'], { cwd: work, encoding: 'utf8', timeout: 10 * 60_000, env: { ...process.env, CI: '1', npm_config_ignore_scripts: 'true' } }).status === 0,
      // Stage all, then reset node_modules: an :(exclude) pathspec on an ignored path makes git 2.5x exit 1.
      patch: async () => { sh('git', ['add', '-A', '--', '.'], work); sh('git', ['reset', '-q', '--', 'node_modules'], work); return execFileSync('git', ['diff', '--cached', '--binary'], { cwd: work, encoding: 'utf8', maxBuffer: 200 * 1024 * 1024 }); },
      readFile: async (rel) => { try { return fs.readFileSync(path.join(work, rel), 'utf8'); } catch { return ''; } },
      fileSizes: async (rels) => Object.fromEntries(rels.flatMap((p) => { try { return [[p, fs.lstatSync(path.join(work, p)).size]]; } catch { return []; } })),
      provisionFile: async () => null, // on the host the builder runs the broker itself
      stage: async () => {},
      close: async () => { if (gstackFile) fs.rmSync(gstackFile, { force: true }); },
    };
  }
  const oauthToken = token();
  if (!oauthToken) throw new Error(`no Claude subscription token for the sandbox: run \`claude setup-token\`, then \`security add-generic-password -U -s ${policy.build.tokenService || 'idea-build-claude-token'} -a "$USER" -w <token>\``);
  const sb = startSessionFn({ log: () => {} });
  try {
    const info = await sb.open(work, { allowHosts: ['api.anthropic.com'], allowModels: fallback ? [FREE_MODEL] : [], lifetimeMs });
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
      readFile: async (rel) => { const r = await sb.exec('cat', [rel], { timeoutMs: 30_000 }); return r.code === 0 ? r.output : ''; },
      // "<size> <path>" per file that exists; a missing one only writes to stderr.
      fileSizes: async (rels) => {
        if (!rels.length) return {};
        const r = await sb.exec('stat', ['-c', '%s %n', '--', ...rels], { timeoutMs: 30_000 });
        return Object.fromEntries(String(r.output).split('\n').map((l) => l.match(/^(\d+) (.+)$/)).filter(Boolean).map((m) => [m[2], Number(m[1])]));
      },
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

module.exports = { buildOne, goLivePrompt, growthPrompt, mvpMilestones, rangeText, tools, milestones, nextMilestone, prompt, milestoneText, engineOrder, manualBuildTarget, buildMessage, engineLabel, buildInput, extractSection, GSTACK_BUILD_SECTIONS, repairPrompt, openWorkspace, sandboxToken, provisionCommands, screenshotRefs, screenshotProof, screenshotPrompt };

if (require.main === module) {
  const slug = process.argv[2];
  if (!slug) { console.log(JSON.stringify({ ok: false, error: 'usage: idea-build.js <slug> [--no-push]' })); process.exit(1); }
  const mi = process.argv.indexOf('--milestone');
  buildOne(slug, { push: !process.argv.includes('--no-push'), milestone: mi > 0 ? process.argv[mi + 1] : 'M1' }).then((o) => {
    console.log(JSON.stringify({ ...o, state: undefined }));
    if (!o.ok) process.exitCode = 1;
  });
}
