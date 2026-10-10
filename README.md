# idea-factory

The idea pipeline's home and **record**. Every researched idea lives here in full, in `ideas/<slug>/`:

| File | Content |
|---|---|
| `RESEARCH.md` | Summary, evidence of the problem, competitors (name, price, gap), technical notes, risks, sources |
| `PRD.md` | Problem, target user, competitors & gap, MVP scope, non-goals, success metrics, open questions |
| `ROADMAP.md` | Milestones; M1 buildable in a weekend, exit criteria written as testable checks |
| `idea.json` | Title, repo name, one-liner, closest existing repo (`overlaps`), tags, effort, confidence, sources |

Git is the record because it never truncates, keeps history, and agents read it natively. The
Notion **Idea Board** is where David decides (`Idea` → `Build` / `Pass`); each page carries the same
full text and links back here. `Build` creates a private product repo, a copy of the idea's folder.

## Flow

```
idea ──gstack review──▶ validate ──14-day $0 demand test──▶ build ──▶ repo ──M1 PR (tests first)──▶ building ──▶ live (MRR)
  └─────────────────▶ pass ◀──── no signal / review says no / David says no
```

| Step | Code | Runs |
|---|---|---|
| Research | `bin/idea-research.js` (Claude Pro) → `bin/idea-publish.js publish`; scout (free models) as fallback | OpenClaw cron 09:00 |
| Review | `bin/idea-review.js` + `skills/idea-review/SKILL.md`: the gstack frameworks, non-interactive | daily, after 09:30 |
| Demand test | `lib/pipeline.js` `renderLanding` → `pages/<slug>/` (Vercel `idea-pages`); signals in RepoHQ `idea_signals`; `decideValidation` | landing page daily; decisions every tick |
| Build | `bin/idea-publish.js promote` (repo), `bin/idea-build.js` (M1, tests first, draft PR) | every tick / daily, ≤ 1 a week |
| Revenue | MRR and lifecycle from RepoHQ → `state.json`, Notion, the morning email | every tick |

Everything runs from `bin/idea-pipeline.js tick` (launchd `com.user.idea-pipeline`, every 15 min). The rules are in **`policy.json`**:
- $0 spend;
- review score ≥ 6;
- a 14-day validation window, at least 50 visitors to judge;
- build at ≥ 5 signups and ≥ 5% conversion;
- at most one build a week.

David's Status in Notion always wins: Pass, Build or Live.

Each idea's lifecycle is in `ideas/<slug>/state.json`, which RepoHQ reads. The review is in `REVIEW.md` / `review.json`, and the launch post in `LAUNCH.md`.

## Commands

```bash
node bin/idea-publish.js list                  # ideas + portfolio (for dedupe)
node bin/idea-publish.js seed "<text>"         # queue an idea for the next research run
node bin/idea-publish.js publish drafts/<slug> # store + record
node bin/idea-publish.js promote [--dry-run]   # repos for "Build" rows
node bin/idea-publish.js sync-page <slug>      # rebuild the Notion page from ideas/<slug>/ (after editing docs)
node bin/idea-publish.js verify-page <slug>    # read the page back; fails if any text is missing
node bin/idea-research.js [--check]            # one research run on Claude Pro (--check: login only)
node bin/idea-review.js <slug> | --pending     # gstack review → REVIEW.md, review.json, stage
node bin/idea-build.js <slug> [--no-push]      # M1, tests first, draft PR
node bin/idea-pipeline.js tick [--daily]       # the whole lifecycle (what launchd runs)
bin/context search "<q>" | interests | overview  # the owner's context (public + personal only)
npm test                                       # Markdown → Notion limits (lossless conversion)
npm run test:live                              # stress page through the real Notion API, then trashed
```

Big picture: RepoHQ `docs/system-overview.md`. Design and policy: RepoHQ `docs/idea-factory.md` and `docs/personal-context.md`.
