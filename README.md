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
research (Claude Code on the Pro subscription; free-model scout as fallback)
  → drafts/<slug>/ → bin/idea-publish.js publish
      → ideas/<slug>/ committed + pushed here (the record)
      → Notion row, Status "Idea", full research/PRD/roadmap in the page
David: Status "Build"  → bin/idea-publish.js promote (launchd, every 15 min) → private repo <slug>, topic "idea"
```

## Commands

```bash
node bin/idea-publish.js list                  # ideas + portfolio (for dedupe)
node bin/idea-publish.js seed "<text>"         # queue an idea for the next research run
node bin/idea-publish.js publish drafts/<slug> # store + record
node bin/idea-publish.js promote [--dry-run]   # repos for "Build" rows
node bin/idea-publish.js sync-page <slug>      # rebuild the Notion page from ideas/<slug>/ (after editing docs)
node bin/idea-publish.js verify-page <slug>    # read the page back; fails if any text is missing
bin/idea-research.sh                           # one research run (Claude Code, Pro subscription)
npm test                                       # Markdown → Notion limits (lossless conversion)
npm run test:live                              # stress page through the real Notion API, then trashed
```

Design and policy: RepoHQ `docs/idea-factory.md` and `docs/personal-context.md`.
