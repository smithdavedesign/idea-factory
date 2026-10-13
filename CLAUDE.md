# idea-factory

The idea half of David's system: research → gstack review → $0 demand test → M1 build → revenue.
**Big picture first:** `/Users/davidsmith/Documents/Repos/Github-HQ/RepoHQ/docs/system-overview.md`
(or the `portfolio-context` skill, or the `repohq` MCP tool `get_system_overview`).

- `ideas/<slug>/` is the record. Never delete or shorten it. `state.json` is the lifecycle, and RepoHQ reads it.
- Rules:
  - **$0** (`policy.json`);
  - Claude only on the **Pro subscription** through `lib/claude.js`, never API credit;
  - the pipeline merges its own PRs once tests and every check are green, and reverts what breaks (`policy.autonomy`, `lib/autonomy.js`; David's call on 2026-10-12). He reviews what was done in the morning email. Interactive sessions merge their own PRs too, once CI is green (2026-10-13, "full send");
  - his Notion Status always wins;
  - no work or financial data (the `bin/context` wrapper enforces public + personal).
- Tests: `npm test` (lossless Notion conversion, decision rules, landing-page escaping, Claude guards). Run them before committing.
- If you change how the pipeline works, update RepoHQ `docs/idea-factory.md` (and the scorecard in `docs/system-overview.md`).
- Log what the pipeline does with `lib/events.js` (`emit({component, event, status, message})`). It goes to the shared system log (RepoHQ `docs/logging.md`), and `status: 'fail'` alerts Slack #team-agents. Don't log quiet runs.
