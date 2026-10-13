// pipeline.js — the idea lifecycle, pure: state records, review validation, landing pages and
// validation decisions. Side effects (Claude, Vercel, Neon, GitHub) live in bin/.
//
//   idea ──review (gstack frameworks)──▶ validate ──demand test──▶ build ──▶ repo ──M1 PR──▶ building ──▶ live
//     └──────────────▶ pass ◀──────────────┘ (no signal / review says no)
//
// RepoHQ reads ideas/<slug>/state.json (factory/context/ideas.ts) — keep the shape in step.
const fs = require('fs');
const path = require('path');

const STAGES = ['idea', 'validate', 'build', 'repo', 'building', 'live', 'pass'];
const DAY = 86_400_000;

function readState(dir) {
  const f = path.join(dir, 'state.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { stage: 'idea' };
}

function writeState(dir, state, now = new Date()) {
  if (!STAGES.includes(state.stage)) throw new Error(`unknown stage ${state.stage}`);
  const next = { ...state, updatedAt: now.toISOString() };
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(next, null, 2) + '\n');
  return next;
}

// ─── Review: gstack office-hours / CEO / eng frameworks applied to the research ────────────────

const QUESTIONS = ['demand', 'statusQuo', 'specificity', 'wedge', 'futureFit'];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * Validate the reviewer's review.json and apply the owner's policy on top of its verdict:
 * a score below policy.review.minScore, or an MVP that can't be run at $0, is a pass whatever the
 * reviewer said ("no huge financial risks").
 */
function validateReview(r, policy) {
  const errors = [];
  if (!r || typeof r !== 'object') return { ok: false, errors: ['review.json is not an object'] };
  if (!['validate', 'pass'].includes(r.verdict)) errors.push('verdict must be "validate" or "pass"');
  if (typeof r.score !== 'number' || r.score < 0 || r.score > 10) errors.push('score must be a number 0–10');
  if (typeof r.summary !== 'string' || r.summary.trim().length < 20) errors.push('summary missing');
  for (const q of QUESTIONS) {
    const a = r.forcingQuestions?.[q];
    if (!a || typeof a.score !== 'number' || typeof a.evidence !== 'string' || !a.evidence.trim()) errors.push(`forcingQuestions.${q} needs {score, evidence}`);
  }
  if (typeof r.feasibility?.zeroCost !== 'boolean' || typeof r.feasibility?.m1Weekend !== 'boolean') errors.push('feasibility needs zeroCost and m1Weekend booleans');
  const l = r.landing;
  if (r.verdict === 'validate') {
    if (!l || ![l.headline, l.subhead, l.cta].every((s) => typeof s === 'string' && s.trim())) errors.push('landing needs headline, subhead and cta');
    if (!Array.isArray(l?.bullets) || l.bullets.length < 2) errors.push('landing.bullets needs 2–5 items');
    if (!Array.isArray(r.launch?.channels) || !r.launch.channels.length || typeof r.launch?.post !== 'string') errors.push('launch needs channels and a post');
  }
  if (errors.length) return { ok: false, errors };
  const review = { ...r, score: clamp(r.score, 0, 10) };
  const overrides = [];
  if (review.verdict === 'validate' && review.score < policy.review.minScore) overrides.push(`score ${review.score} is below ${policy.review.minScore}`);
  if (review.verdict === 'validate' && !review.feasibility.zeroCost) overrides.push('the MVP needs spending (policy: $0 until it earns)');
  if (overrides.length) { review.verdict = 'pass'; review.policyOverride = overrides.join('; '); }
  return { ok: true, review };
}

// ─── Landing page: deterministic, escaped, no build step ───────────────────

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderLanding({ slug, landing, signalUrl }) {
  if (!/^(?=.{3,24}$)[a-z][a-z0-9]*(-[a-z0-9]+)?$/.test(slug)) throw new Error(`bad slug ${slug}`);
  const bullets = (landing.bullets || []).slice(0, 5).map((b) => `<li>${esc(b)}</li>`).join('');
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(landing.headline)}</title>
<meta name="description" content="${esc(landing.subhead)}">
<style>
:root{--bg:#fafaf9;--fg:#1c1917;--mu:#57534e;--ac:#2563eb;--card:#fff;--bd:#e7e5e4}
@media (prefers-color-scheme:dark){:root{--bg:#0c0a09;--fg:#f5f5f4;--mu:#a8a29e;--ac:#60a5fa;--card:#1c1917;--bd:#292524}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:640px;margin:0 auto;padding:72px 20px}
h1{font-size:clamp(28px,6vw,44px);line-height:1.15;margin:0 0 16px;letter-spacing:-.02em}
.sub{font-size:19px;color:var(--mu);margin:0 0 32px}
ul{padding-left:20px;margin:0 0 36px}li{margin:6px 0}
form{display:flex;gap:8px;flex-wrap:wrap;background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:12px}
input[type=email]{flex:1 1 220px;padding:12px 14px;border:1px solid var(--bd);border-radius:8px;font:inherit;background:var(--bg);color:var(--fg)}
button{padding:12px 18px;border:0;border-radius:8px;background:var(--ac);color:#fff;font:600 16px system-ui;cursor:pointer}
.hp{position:absolute;left:-9999px}.note{font-size:13px;color:var(--mu);margin-top:12px}#ok{display:none;font-weight:600}
</style></head>
<body><main>
<h1>${esc(landing.headline)}</h1>
<p class="sub">${esc(landing.subhead)}</p>
<ul>${bullets}</ul>
<form id="f" novalidate>
<input type="email" name="email" required placeholder="you@example.com" aria-label="Email">
<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
<button type="submit">${esc(landing.cta)}</button>
</form>
<p id="ok">Thanks — you're on the list. We'll email you once, when it's ready.</p>
<p class="note">Not built yet: this page checks whether people want it. One email when it launches, nothing else.</p>
</main>
<script>
(function(){var U=${JSON.stringify(signalUrl)},S=${JSON.stringify(slug)};
function send(b){try{return fetch(U,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b),keepalive:true})}catch(e){}}
send({slug:S,kind:'view',referrer:document.referrer||null});
document.getElementById('f').addEventListener('submit',function(e){e.preventDefault();var f=e.target;
var p=send({slug:S,kind:'signup',email:f.email.value,website:f.website.value});
(p||Promise.resolve()).then(function(){f.style.display='none';document.getElementById('ok').style.display='block'})});})();
</script>
</body></html>
`;
}

// ─── Validation decision: the demand test's verdict ────────────────────────

/**
 * signals: {views, uniqueVisitors, signups}. Returns {decision, reason} with decision in
 * 'wait' | 'build' | 'pass' | 'extend'. Not enough visitors is "untested", not "no demand":
 * extend once (and share the launch post), then pass.
 */
function decideValidation(state, signals, policy, now) {
  const v = policy.validation;
  const visitors = signals?.uniqueVisitors ?? 0;
  const signups = signals?.signups ?? 0;
  const rate = visitors ? signups / visitors : 0;
  const pct = (x) => `${Math.round(x * 100)}%`;
  if (signups >= v.buildEarly.minSignups && rate >= v.buildEarly.minSignupRate) {
    return { decision: 'build', reason: `${signups} signups from ${visitors} visitors (${pct(rate)}): strong early signal` };
  }
  if (now < new Date(state.validation.decideAfter)) return { decision: 'wait', reason: 'validation window still open' };
  if (visitors < v.minVisitorsToJudge) {
    if ((state.validation.extensions ?? 0) < v.maxExtensions) {
      return { decision: 'extend', reason: `only ${visitors} visitors (need ${v.minVisitorsToJudge} to judge): extended ${v.days} days — share the launch post` };
    }
    return { decision: 'pass', reason: `never reached ${v.minVisitorsToJudge} visitors (${visitors}): untested, parked` };
  }
  if (signups >= v.build.minSignups && rate >= v.build.minSignupRate) {
    return { decision: 'build', reason: `${signups} signups from ${visitors} visitors (${pct(rate)})` };
  }
  return { decision: 'pass', reason: `${signups} signups from ${visitors} visitors (${pct(rate)}): below ${v.build.minSignups} signups at ${pct(v.build.minSignupRate)}` };
}

function startValidation(now, policy) {
  return { startedAt: now.toISOString(), decideAfter: new Date(now.getTime() + policy.validation.days * DAY).toISOString(), extensions: 0 };
}

function extendValidation(validation, now, policy) {
  return { ...validation, decideAfter: new Date(now.getTime() + policy.validation.days * DAY).toISOString(), extensions: (validation.extensions ?? 0) + 1 };
}

/** Roadmap builds (M1, M2…, MVP) move an idea along its roadmap; go-live and growth builds don't (pure). */
function isRoadmapBuild(milestone) {
  return !['GOLIVE', 'GROWTH'].includes(milestone);
}

/**
 * Builds started in the last 7 days by the weekly slot (policy.build.maxPerWeek). Manual starts ("Start
 * build now") have their own cap, and so do go-live and growth builds.
 */
function buildsThisWeek(states, now) {
  return states.filter((s) => s.build?.at && !s.build.manual && isRoadmapBuild(s.build.milestone) && now - new Date(s.build.at) < 7 * DAY).length;
}

/**
 * Whether ideas that have never been built wait for their first build (pure). policy.build.startNew false
 * holds them until a focus product (policy.growth.focus) reaches policy.growth.minVisitorsPerWeek unique
 * visitors in its last 7 days (state.funnel). Ideas already being built carry on; "Start build now" is
 * never held. `entries` = [[slug, state], …].
 */
function newBuildsHeld(policy, entries) {
  if (policy.build?.startNew !== false) return false;
  const states = new Map(entries);
  const bar = policy.growth?.minVisitorsPerWeek ?? 50;
  return !(policy.growth?.focus || []).some((slug) => (states.get(slug)?.funnel?.d7?.visit ?? 0) >= bar);
}

module.exports = { STAGES, readState, writeState, validateReview, renderLanding, decideValidation, startValidation, extendValidation, buildsThisWeek, isRoadmapBuild, newBuildsHeld, esc, QUESTIONS };
