# idea-factory

**Visual map:** [smithdavedesign System Map](https://claude.ai/artifact/SdinhSGDxFhgMbWZsSPPso), covering architecture, the idea flow and each repo's code stack. It's a private snapshot from 2026-10-11. RepoHQ `docs/system-overview.md` and `docs/idea-factory.md` are the source of truth.

The idea pipeline's home and **record**. Every researched idea lives here in full, in `ideas/<slug>/`:

| File | Content |
|---|---|
| `RESEARCH.md` | Summary, evidence of the problem, competitors (name, price, gap), technical notes, risks, sources |
| `PRD.md` | Problem, target user, competitors & gap, MVP scope, non-goals, success metrics, open questions |
| `ROADMAP.md` | Milestones; M1 buildable in a weekend, exit criteria written as testable checks |
| `idea.json` | Title, repo name, one-liner, closest existing repo (`overlaps`), tags (one each for vibe, audience, money and where the first users come from, `ai`, topics: SKILL.md; RepoHQ's Ideas page filters on them), effort, confidence, sources |

Git is the record because it never truncates, keeps history, and agents read it natively. David
decides on RepoHQ's **Ideas page** (policy.repohqUrl + `/ideas`; on the Mac behind Tailscale since 2026-10-31): Approve build, Demand test first
or Pass. The pipeline applies each decision on its next tick (`applyDecision` in `bin/idea-pipeline.js`).
`Build` creates a private product repo, a copy of the idea's folder, and starts M1 on the same tick.
There is no Notion board since 2026-10-12: the Ideas page is the board.

## Flow

```
idea ──gstack review──▶ validate ──14-day $0 demand test──▶ build ──▶ repo ──M1 PR (tests first)──▶ building ──▶ live (MRR)
  └─────────────────▶ pass ◀──── no signal / review says no / David says no
```

| Step | Code | Runs |
|---|---|---|
| Research | `bin/idea-research.js` (Claude Pro) → `bin/idea-publish.js publish`; scout (free models) as fallback | OpenClaw cron 09:00 |
| Your ideas | `idea: …` on Slack or WhatsApp, or the Ideas page's New idea box → `seeds.jsonl` (with its `source`). The next tick researches and reviews it on Claude Pro and sends the verdict back there (`lib/seeds.js`, `policy.research.seeded`: ≤ 10 a day, none 08:30–09:45, no free-model fallback) | every tick |
| Review | `bin/idea-review.js` + `skills/idea-review/SKILL.md`: the gstack frameworks, non-interactive | daily, after 09:30 |
| Demand test | `lib/pipeline.js` `renderLanding` → `pages/<slug>/` (Vercel `idea-pages`); signals in RepoHQ `idea_signals`; `decideValidation` | landing page daily; decisions every tick |
| Launch | `skills/launch/SKILL.md`: David runs `/launch <slug>` for verified channels and posts (`LAUNCH-KIT.md`), then `/launch <slug> posted` to log each post (`launch-log.json`) | by hand, while validating |
| Build | `bin/idea-publish.js promote` (repo), `bin/idea-build.js` (one milestone: a gstack plan-eng-review plan, tests first, code, gstack's review checklist on its own diff, draft PR). Claude Code `--model opus --effort xhigh`; Sonnet if Opus is unavailable; the free pool only when the subscription can't take it; no local model. **Runs in RepoHQ's factory Docker sandbox** (`lib/sandbox.js`; subscription token `idea-build-claude-token` from `claude setup-token`); the host applies the patch after a **secret scan** and commits it as `idea-factory` with the owner's GitHub noreply address (`lib/author.js`: Vercel's free plan only builds previews of a private repo's owner's commits) (`lib/secret-scan.js`, one repair round, else no PR) and runs `.provision` through the credential broker. **Screenshot proof:** the build ends with `npm run screenshots` (Playwright on the sandbox's Chromium, desktop and phone) and the screenshots at the top of the repo's README; one reminder round if they're missing, and the PR shows them or says they're missing | **Let it rip** (`policy.build.mode: "mvp"`, the default): approving a build builds the whole roadmap in one sandbox session and opens one PR, stopping at the first milestone whose tests fail or that falls back off Opus, or after 4 hours; merged PRs are picked up every tick. Builds start every tick / daily, ≤ 1 a week; **Start build now** on RepoHQ's Ideas page (`idea_build_requests`) skips the weekly slot, ≤ 2 a day |
| Go live | Once an MVP is complete, `bin/idea-build.js` (`buildOne({ golive })`, `lib/golive.js`) makes it launch-ready in the sandbox: SEO basics (titles, meta descriptions, a share image, sitemap, robots.txt, JSON-LD), privacy and terms pages, a Buy button on `STRIPE_PAYMENT_LINK` (the build files a request for the link: the price is David's call, and the broker's `provision stripe <repo> <price> --live` makes it with the live key he stored; tiebreak, $5 once, 2026-10-13), a beacon to RepoHQ (`visit`, `activate`, `checkout`; nothing from bots, previews or the owner's browser), and a Vercel project through the broker, with the README's screenshots refreshed; one PR, "Go live". After it merges, the production URL (a Ready deployment's public domain, never a team alias behind Vercel's login) becomes the repo's homepage and the live site is audited every 6 hours (checklist step "launchReady") | by itself after an MVP, ≤ 1 a day; **Get it launch-ready** on RepoHQ's Ideas page any time after M1 |
| Grow | For each focus product (`policy.growth.focus`), step 5d (`lib/growth.js`) reads the funnel and picks one mission by rule. The missions: a funnel beacon, a launch kit (`bin/idea-growth.js`, posts David publishes, only `LAUNCH-KIT.md` written), search pages, a first screen, or a paid-offer placement. A growth build (`buildOne({ growth })`) is one change, as a draft PR "Growth: …", on Sonnet with no free pool (its sandbox allows no models at all). Each mission is an experiment with a baseline, target and window in `state.growth`; a merged PR starts it (RepoHQ `docs/growth-loop-prd.md`) | from 10:00, one a day per product, ≤ 2 a day, ≤ 2 growth builds a week, never while a growth PR or an unposted kit waits for David |
| Judge | When an experiment's window ends, `lib/growth.js` `judge` compares it with the window before (`lib/repohq.js` `funnelWindow`): visitors a week against the target, or a share of visitors (with at least 30 in the window; extended once, then inconclusive). Keep, iterate, or revert (30% or more worse on a first screen or paid offer). The result is a line in the product's `LEARNINGS.md`; a kept experiment is proposed under `PLAYBOOK.md` "## Proposed" for David to promote | every tick, for focus products |
| Autonomy | `lib/autonomy.js`, `policy.autonomy` (David's call on 2026-10-12: agents merge everything, he reviews each morning). The pipeline merges its own PRs (growth, go-live, milestones) once its tests passed and every check is green (CI, GitGuardian, the Vercel preview), with no conflicts. A failed growth PR is closed and its mission tried again the next day; a failed roadmap build, or a PR touching a protected path (`.github/workflows/`), waits for David. A merge that breaks the live site's launch checks within a day, or an experiment the judge finds clearly worse, is reverted by a revert PR the pipeline merges, and Slack is told | every tick |
| Road to revenue | Once M1 is merged, `bin/idea-revenue.js` writes `REVENUE.md` + `revenue.json` on Claude Pro with gstack's startup frameworks: who pays, the price, what must exist before charging, where to launch, the first ten users. Every tick turns it into the launch checklist (`state.launch`, `lib/revenue.js`): plan → MVP → live → legal pages → price → Stripe → launch posts → first user → first dollar, each step owned by an agent or David and checked automatically where it can be (RepoHQ's repo row, a live-URL probe, the repo tree, `launch-log.json`, signups, MRR). Build queues go to the idea closest to its first dollar | every tick; plans ≤ 2 a day |
| Revenue | MRR and lifecycle from RepoHQ → `state.json`, the Ideas page, the morning email | every tick |

Everything runs from `bin/idea-pipeline.js tick` (launchd `com.user.idea-pipeline`, every 15 min). The rules are in **`policy.json`**:
- agents never spend (`maxMonthlySpendUsd` 0). David may put up to `ownerBudget.perProductUsd` ($300) into moving a product forward: agents propose the spend and what it should buy, and he approves and pays;
- ideas you send researched right away, at most 10 a day (one per tick, so a batch clears the same night);
- no new ideas from the daily 09:00 discovery run while new builds are held (`research.discovery`). Ideas you send are still researched;
- review score ≥ 6;
- a 14-day validation window, at least 50 visitors to judge;
- build at ≥ 5 signups and ≥ 5% conversion;
- builds run side by side in their own processes (`bin/idea-build-job.js`, `lib/build-slots.js`): up to 3 at once, each only while Docker has 2 GB to spare and the Mac 10% of its memory free (`build.concurrency`), with no daily or weekly cap (David, 2026-10-13). Start build now takes a free slot on the next tick; builds the pipeline starts itself (go-lives, first builds, the rest of a started MVP, growth builds) keep one slot free for those, and wait a day after a failure. Each build's output is in `.builds/<slug>.log` while it runs;
- while `build.startNew` is false (since 2026-10-12), an idea that has never been built waits for its first build until a focus product (`growth.focus`) has 50 visitors a week. Ideas already being built carry on, and Start build now still works ([growth loop](https://github.com/smithdavedesign/Github-HQ/blob/main/docs/growth-loop-prd.md)).

David's decision on the Ideas page always wins over a verdict: Build, Demand test or Pass.

**RepoHQ sync** (`lib/repohq.js`): every tick mirrors each changed idea (idea.json, state.json, review.json, the markdown) to RepoHQ's `ideas` table and writes a heartbeat to `idea_pipeline`. It also applies the pending `idea_decisions` rows, and moves ideas typed in the page's New idea box (`idea_seeds`) into `seeds.jsonl`, the same research queue as `idea: …` on Slack/WhatsApp. The tables are defined in RepoHQ (`src/lib/db/schema.ts`, `npm run db:push`).

Each idea's lifecycle is in `ideas/<slug>/state.json`, which RepoHQ reads. The review is in `REVIEW.md` / `review.json`, and the launch post in `LAUNCH.md`. The `launch` skill adds `LAUNCH-KIT.md` and `launch-log.json`.

## Logs

The pipeline, research, review and build write to the shared system log (`lib/events.js` → `~/.system-events/events.jsonl`). RepoHQ's collector ships it and alerts Slack #team-agents on failures. See RepoHQ `docs/logging.md`.

## Commands

```bash
node bin/idea-publish.js list                  # ideas + portfolio (for dedupe)
node bin/idea-publish.js seed "<text>"         # queue an idea for the next research run
node bin/idea-publish.js publish drafts/<slug> # validate + commit ideas/<slug>/ (the record)
node bin/idea-publish.js promote [--dry-run]   # repos for ideas at stage "build"
node bin/idea-research.js [--check]            # one research run on Claude Pro (--check: login only)
node bin/idea-review.js <slug> | --pending     # gstack review → REVIEW.md, review.json, stage
node bin/idea-build.js <slug> [--no-push]      # M1, tests first, draft PR
node bin/idea-pipeline.js tick [--daily]       # the whole lifecycle (what launchd runs)
bin/context search "<q>" | interests | overview  # the owner's context (public + personal only)
npm test                                       # decision rules, landing-page escaping, Claude guards, the tick
```

Big picture: RepoHQ `docs/system-overview.md`. Design and policy: RepoHQ `docs/idea-factory.md` and `docs/personal-context.md`.
