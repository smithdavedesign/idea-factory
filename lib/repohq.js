// RepoHQ's Ideas page (RepoHQ src/app/(app)/ideas): the pipeline mirrors each idea's record to
// RepoHQ's Neon tables every tick, and applies the decisions the owner makes there.
//
//   ideas           ← the record (idea.json, state.json, review.json, the markdown docs); written here only
//   idea_decisions  → Build / Validate / Pass from the page; the next tick applies them (bin/idea-pipeline.js applyDecision)
//   idea_pipeline   ← one heartbeat row: when the pipeline last ran, its errors, policy.json
//   idea_seeds      → new ideas typed on the page; moved into seeds.jsonl (the "idea: …" queue), then marked researched
//   idea_build_requests → "Start build now": pending → running → done | failed (cancelled on the page while pending)
//
// The tables are defined in RepoHQ's src/lib/db/schema.ts (applied with `npm run db:push` there).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DOC_FILES = { research: 'RESEARCH.md', prd: 'PRD.md', roadmap: 'ROADMAP.md', review: 'REVIEW.md', launch: 'LAUNCH.md', launchKit: 'LAUNCH-KIT.md', build: 'BUILD.md', revenue: 'REVENUE.md', learnings: 'LEARNINGS.md' };

const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null);
const hashOf = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 32);

/** One idea's row for RepoHQ's `ideas` table, from ideas/<slug>/ (pure apart from reading the folder). */
function ideaRecord(dir, slug) {
  const idea = readJson(path.join(dir, 'idea.json')) || {};
  const state = readJson(path.join(dir, 'state.json')) || {};
  const review = readJson(path.join(dir, 'review.json'));
  const docs = {};
  for (const [key, file] of Object.entries(DOC_FILES)) {
    const f = path.join(dir, file);
    if (fs.existsSync(f)) docs[key] = fs.readFileSync(f, 'utf8');
  }
  const content = { title: idea.title || slug, stage: state.stage || 'idea', idea, state, review, docs };
  return { slug, ...content, updatedAt: state.updatedAt || null, hash: hashOf(content) };
}

/** Postgres "relation does not exist": RepoHQ's schema hasn't been pushed. */
const isMissingTable = (e) => e && (e.code === '42P01' || /relation "idea_(decisions|pipeline|seeds|build_requests)"|relation "ideas"/.test(String(e.message)));
const explain = (e) => (isMissingTable(e) ? new Error('RepoHQ\'s idea tables are missing: run `npm run db:push` in RepoHQ') : e);

/** Upsert the ideas whose content changed since the last sync, and drop rows whose folder is gone. Returns the slugs written. */
async function syncIdeas(sql, records) {
  const existing = new Map((await sql`SELECT slug, hash FROM ideas`).map((r) => [r.slug, r.hash]));
  const written = [];
  for (const r of records) {
    if (existing.get(r.slug) === r.hash) continue;
    // ideas.notion_url is no longer written (no Notion since 2026-10-12); older rows keep theirs until RepoHQ drops the column.
    await sql`INSERT INTO ideas (slug, title, stage, idea, state, review, docs, hash, updated_at, synced_at)
      VALUES (${r.slug}, ${r.title}, ${r.stage}, ${JSON.stringify(r.idea)}::jsonb, ${JSON.stringify(r.state)}::jsonb,
              ${r.review === null ? null : JSON.stringify(r.review)}::jsonb, ${JSON.stringify(r.docs)}::jsonb,
              ${r.hash}, ${r.updatedAt}, now())
      ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, stage = EXCLUDED.stage, idea = EXCLUDED.idea, state = EXCLUDED.state,
        review = EXCLUDED.review, docs = EXCLUDED.docs, hash = EXCLUDED.hash,
        updated_at = EXCLUDED.updated_at, synced_at = now()`;
    written.push(r.slug);
  }
  const gone = [...existing.keys()].filter((slug) => !records.some((r) => r.slug === slug));
  if (gone.length) await sql`DELETE FROM ideas WHERE slug = ANY(${gone})`;
  return written;
}

/** Decisions waiting for the pipeline, oldest first. */
async function pendingDecisions(sql) {
  return sql`SELECT id, slug, decision, note, created_at FROM idea_decisions WHERE status = 'pending' ORDER BY created_at`;
}

/** Take a pending decision. False when the owner withdrew it in the meantime. */
async function claimDecision(sql, id, result) {
  const rows = await sql`UPDATE idea_decisions SET status = 'applied', result = ${result}, applied_at = now()
    WHERE id = ${id} AND status = 'pending' RETURNING id`;
  return rows.length > 0;
}

async function finishDecision(sql, id, status, result) {
  await sql`UPDATE idea_decisions SET status = ${status}, result = ${String(result).slice(0, 500)}, applied_at = now() WHERE id = ${id}`;
}

async function heartbeat(sql, { at, ok, errors, policy }) {
  await sql`INSERT INTO idea_pipeline (id, tick_at, ok, errors, policy)
    VALUES ('main', ${at}, ${ok}, ${JSON.stringify(errors.slice(0, 10))}::jsonb, ${JSON.stringify(policy)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET tick_at = EXCLUDED.tick_at, ok = EXCLUDED.ok, errors = EXCLUDED.errors, policy = EXCLUDED.policy`;
}

/**
 * New ideas from the page: each pending one goes into the research queue (`seed`, the same as
 * "idea: …" on Slack/WhatsApp), and a queued one is marked researched once its seed is done.
 * `seed(text)` → {id}; `seeds` is readSeeds(); `slugForSeed(id)` finds the idea it became.
 */
async function syncSeeds(sql, { seed, seeds, slugForSeed }) {
  const notes = [];
  for (const s of await sql`SELECT id, text FROM idea_seeds WHERE status = 'pending' ORDER BY created_at`) {
    let queued;
    try { queued = seed(s.text); } catch (e) {
      await sql`UPDATE idea_seeds SET status = 'failed', result = ${String(e.message).slice(0, 300)} WHERE id = ${s.id} AND status = 'pending'`;
      continue;
    }
    const rows = await sql`UPDATE idea_seeds SET status = 'queued', seed_id = ${queued.id}, queued_at = now() WHERE id = ${s.id} AND status = 'pending' RETURNING id`;
    if (rows.length) notes.push(`queued ${queued.id}`);
  }
  const done = new Map(seeds.filter((x) => x.status === 'done').map((x) => [x.id, x]));
  for (const s of await sql`SELECT id, seed_id FROM idea_seeds WHERE status = 'queued' AND seed_id IS NOT NULL`) {
    if (!done.has(s.seed_id)) continue;
    const slug = slugForSeed(s.seed_id);
    await sql`UPDATE idea_seeds SET status = 'researched', slug = ${slug}, researched_at = now() WHERE id = ${s.id}`;
    notes.push(`researched ${s.seed_id}${slug ? ` → ${slug}` : ''}`);
  }
  return notes;
}

/**
 * Every idea's demand and funnel counts from idea_signals (RepoHQ's signal endpoint), for lib/growth.js:
 * per kind, events and unique visitors (signups: distinct emails) in the last 7 days, the 7 before and all
 * time, plus "reach" (unique visitors across view and visit) and the last 7 days' referring sites.
 * Returns Map<slug, {kinds: {[kind]: {events, d7, prev7, all}}, referrers7d: [{host, visitors}]}>.
 */
async function funnelBySlug(sql) {
  const rows = await sql`SELECT slug, kind, count(*)::int AS events,
      count(DISTINCT CASE WHEN kind = 'signup' THEN email ELSE ip_hash END)::int AS all_time,
      count(DISTINCT CASE WHEN kind = 'signup' THEN email ELSE ip_hash END) FILTER (WHERE created_at > now() - interval '7 days')::int AS d7,
      count(DISTINCT CASE WHEN kind = 'signup' THEN email ELSE ip_hash END) FILTER (WHERE created_at <= now() - interval '7 days' AND created_at > now() - interval '14 days')::int AS prev7
    FROM idea_signals GROUP BY slug, kind
    UNION ALL
    SELECT slug, 'reach', count(*)::int, count(DISTINCT ip_hash)::int,
      count(DISTINCT ip_hash) FILTER (WHERE created_at > now() - interval '7 days')::int,
      count(DISTINCT ip_hash) FILTER (WHERE created_at <= now() - interval '7 days' AND created_at > now() - interval '14 days')::int
    FROM idea_signals WHERE kind IN ('view', 'visit') GROUP BY slug`;
  const refs = await sql`SELECT slug, coalesce(substring(referrer from '^https?://(?:www\\.)?([^/:?#]+)'), 'direct') AS host, count(DISTINCT ip_hash)::int AS visitors
    FROM idea_signals WHERE kind IN ('view', 'visit') AND created_at > now() - interval '7 days' GROUP BY 1, 2 ORDER BY 3 DESC, 2`;
  const out = new Map();
  const of = (slug) => out.get(slug) || out.set(slug, { kinds: {}, referrers7d: [] }).get(slug);
  for (const r of rows) of(r.slug).kinds[r.kind] = { events: r.events, d7: r.d7, prev7: r.prev7, all: r.all_time };
  for (const r of refs) of(r.slug).referrers7d.push({ host: r.host, visitors: r.visitors });
  return out;
}

/**
 * One idea's unique visitors per event kind between two instants (signups: distinct emails), plus "reach"
 * across view and visit: the before and after windows the growth loop's judge compares (lib/growth.js).
 */
async function funnelWindow(sql, slug, from, to) {
  const rows = await sql`SELECT kind, count(DISTINCT CASE WHEN kind = 'signup' THEN email ELSE ip_hash END)::int AS n
    FROM idea_signals WHERE slug = ${slug} AND created_at >= ${from} AND created_at < ${to} GROUP BY kind
    UNION ALL
    SELECT 'reach', count(DISTINCT ip_hash)::int FROM idea_signals
    WHERE slug = ${slug} AND kind IN ('view', 'visit') AND created_at >= ${from} AND created_at < ${to}`;
  const out = { view: 0, visit: 0, reach: 0, signup: 0, activate: 0, checkout: 0 };
  for (const r of rows) out[r.kind] = r.n;
  return out;
}

/** "Start build now" requests waiting for the pipeline, oldest first. */
async function pendingBuildRequests(sql) {
  return sql`SELECT id, slug, milestone, note, created_at FROM idea_build_requests WHERE status = 'pending' ORDER BY created_at, id`;
}

/** Manual builds started in the last `hours` (the policy.build.manualPerDay window). */
async function manualStartsSince(sql, hours = 24) {
  const [r] = await sql`SELECT count(*)::int AS n FROM idea_build_requests WHERE started_at > now() - make_interval(hours => ${hours})`;
  return r?.n ?? 0;
}

/** Start a pending request. False when the owner withdrew it in the meantime. */
async function claimBuildRequest(sql, id, milestone) {
  const rows = await sql`UPDATE idea_build_requests SET status = 'running', milestone = ${milestone}, started_at = now(), result = ${`building ${milestone}`}
    WHERE id = ${id} AND status = 'pending' RETURNING id`;
  return rows.length > 0;
}

/** Say why a request is still waiting (over the daily cap, another build running). */
async function noteBuildRequest(sql, id, result) {
  await sql`UPDATE idea_build_requests SET result = ${String(result).slice(0, 500)} WHERE id = ${id} AND status = 'pending'`;
}

async function finishBuildRequest(sql, id, status, { result = '', prUrl = null, engine = null } = {}) {
  await sql`UPDATE idea_build_requests SET status = ${status}, result = ${String(result).slice(0, 500)}, pr_url = ${prUrl}, engine = ${engine}, finished_at = now() WHERE id = ${id}`;
}

/** A build the weekly slot ran settles any request still waiting for that idea. */
async function settleBuildRequests(sql, slug, { ok, result, prUrl = null }) {
  await sql`UPDATE idea_build_requests SET status = ${ok ? 'done' : 'failed'}, result = ${String(result).slice(0, 500)}, pr_url = ${prUrl}, finished_at = now()
    WHERE slug = ${slug} AND status = 'pending'`;
}

module.exports = { funnelBySlug, funnelWindow, settleBuildRequests, pendingBuildRequests, manualStartsSince, claimBuildRequest, noteBuildRequest, finishBuildRequest, syncSeeds, DOC_FILES, ideaRecord, hashOf, isMissingTable, explain, syncIdeas, pendingDecisions, claimDecision, finishDecision, heartbeat };
