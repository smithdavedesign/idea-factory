// RepoHQ's Ideas page (RepoHQ src/app/(app)/ideas): the pipeline mirrors each idea's record to
// RepoHQ's Neon tables every tick, and applies the decisions the owner makes there.
//
//   ideas           ← the record (idea.json, state.json, review.json, the markdown docs); written here only
//   idea_decisions  → Build / Validate / Pass from the page; applied here by setting the Notion Status
//   idea_pipeline   ← one heartbeat row: when the pipeline last ran, its errors, policy.json
//   idea_seeds      → new ideas typed on the page; moved into seeds.jsonl (the "idea: …" queue), then marked researched
//
// The tables are defined in RepoHQ's src/lib/db/schema.ts (applied with `npm run db:push` there).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DOC_FILES = { research: 'RESEARCH.md', prd: 'PRD.md', roadmap: 'ROADMAP.md', review: 'REVIEW.md', launch: 'LAUNCH.md', build: 'BUILD.md' };
/** A decision on the page → the Notion Status the owner would have set. */
const DECISION_STATUS = { build: 'Build', validate: 'Validate', pass: 'Pass' };

const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null);
const hashOf = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 32);

/** One idea's row for RepoHQ's `ideas` table, from ideas/<slug>/ (pure apart from reading the folder). */
function ideaRecord(dir, slug, notionUrl = null) {
  const idea = readJson(path.join(dir, 'idea.json')) || {};
  const state = readJson(path.join(dir, 'state.json')) || {};
  const review = readJson(path.join(dir, 'review.json'));
  const docs = {};
  for (const [key, file] of Object.entries(DOC_FILES)) {
    const f = path.join(dir, file);
    if (fs.existsSync(f)) docs[key] = fs.readFileSync(f, 'utf8');
  }
  const content = { title: idea.title || slug, stage: state.stage || 'idea', idea, state, review, docs, notionUrl: notionUrl || null };
  return { slug, ...content, updatedAt: state.updatedAt || null, hash: hashOf(content) };
}

/** Postgres "relation does not exist": RepoHQ's schema hasn't been pushed. */
const isMissingTable = (e) => e && (e.code === '42P01' || /relation "idea_(decisions|pipeline|seeds)"|relation "ideas"/.test(String(e.message)));
const explain = (e) => (isMissingTable(e) ? new Error('RepoHQ\'s idea tables are missing: run `npm run db:push` in RepoHQ') : e);

/** Upsert the ideas whose content changed since the last sync, and drop rows whose folder is gone. Returns the slugs written. */
async function syncIdeas(sql, records) {
  const existing = new Map((await sql`SELECT slug, hash FROM ideas`).map((r) => [r.slug, r.hash]));
  const written = [];
  for (const r of records) {
    if (existing.get(r.slug) === r.hash) continue;
    await sql`INSERT INTO ideas (slug, title, stage, idea, state, review, docs, notion_url, hash, updated_at, synced_at)
      VALUES (${r.slug}, ${r.title}, ${r.stage}, ${JSON.stringify(r.idea)}::jsonb, ${JSON.stringify(r.state)}::jsonb,
              ${r.review === null ? null : JSON.stringify(r.review)}::jsonb, ${JSON.stringify(r.docs)}::jsonb, ${r.notionUrl},
              ${r.hash}, ${r.updatedAt}, now())
      ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, stage = EXCLUDED.stage, idea = EXCLUDED.idea, state = EXCLUDED.state,
        review = EXCLUDED.review, docs = EXCLUDED.docs, notion_url = EXCLUDED.notion_url, hash = EXCLUDED.hash,
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

module.exports = { syncSeeds, DOC_FILES, DECISION_STATUS, ideaRecord, hashOf, isMissingTable, explain, syncIdeas, pendingDecisions, claimDecision, finishDecision, heartbeat };
