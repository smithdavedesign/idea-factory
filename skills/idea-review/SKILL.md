---
name: idea-review
description: |
  Review a researched product idea with gstack's founder and engineering frameworks (office-hours
  Six Forcing Questions, premise challenge and alternatives; plan-ceo-review scope challenge in
  SCOPE REDUCTION mode; plan-eng-review feasibility), non-interactively, and decide: validate
  (worth a no-cost demand test) or pass. Writes REVIEW.md and review.json into the idea's record.
  Use for "review this idea", "is <idea> worth building", "/idea-review <slug>", or when the idea
  pipeline reviews new ideas. Works on ideas in /Users/davidsmith/idea-factory/ideas/<slug>/.
---

# Idea review (gstack, non-interactive)

You are reviewing one idea from the idea pipeline for David, a solo developer who wants products
people use and pay for, **with near-zero overhead and no financial risk**. Nobody is here to answer
questions: answer every question yourself from the evidence, and say how strong the evidence is.

## Inputs

When the pipeline runs you, it has already gathered the context and gstack sections into
`<idea folder>/.review-input.md`: read that file instead of running commands. By hand, use the
absolute paths below exactly as written; tool permissions match them literally (no `~`).

- `/Users/davidsmith/idea-factory/ideas/<slug>/`: `RESEARCH.md`, `PRD.md`, `ROADMAP.md` and `idea.json`. Read all of it.
- David's context: `/Users/davidsmith/idea-factory/bin/context interests` (what he reads and learns) and
  `/Users/davidsmith/idea-factory/bin/context search "<keywords>"` (his repos, ideas and docs). Use these to judge
  founder fit and overlap. They never include work or financial data.
- `/Users/davidsmith/idea-factory/policy.json`: the risk rules. MVPs run on free tiers; nothing costs money until it earns.

## The frameworks: read these sections from your installed gstack, then apply them

Read them from the files; don't work from memory. Skip their preambles, telemetry and AskUserQuestion
mechanics, because this review is non-interactive.

1. `/Users/davidsmith/.claude/skills/gstack/office-hours/SKILL.md`:
   - "Phase 2A: Startup Mode": Operating Principles, Response Posture, Anti-Sycophancy Rules, and
     **The Six Forcing Questions**.
     - Pre-product routing applies: Q1 Demand Reality, Q2 Status Quo and Q3 Desperate Specificity
       carry the most weight; also answer Q4 Narrowest Wedge and Q6 Future-Fit.
     - Q5 (observation) can't be answered before a product exists. Instead, say what M1 users should
       be watched doing.
   - "Phase 3: Premise Challenge": state the premises and whether the research supports each one.
   - "Phase 4: Alternatives Generation": at least two alternatives, including "extend an existing
     repo of David's" when context search shows one.
2. `/Users/davidsmith/.claude/skills/gstack/plan-ceo-review/SKILL.md` → "Step 0: Nuclear Scope Challenge" (0A
   premise, 0C-bis implementation alternatives) in **SCOPE REDUCTION** mode: what's the narrowest
   version worth testing?
3. `/Users/davidsmith/.claude/skills/gstack/plan-eng-review/SKILL.md` → "Step 0: Scope Challenge" and "1.
   Architecture review", applied to ROADMAP M1:
   - Can one person build it in a weekend?
   - Can it run at zero cost (Vercel Hobby, Neon free, no paid APIs or domains)?
   - Which single test would prove M1 works?

Be direct. Interest is not demand: waitlist signups are only a cheap filter, and the review must say
what stronger evidence would look like. Score honestly; most ideas should not pass.

## Verdict

- **validate**: worth a two-week, no-cost demand test (a landing page with a waitlist). Requires score ≥
  `policy.review.minScore`, an M1 buildable in a weekend, and `zeroCost: true`.
- **pass**: everything else. Say why in one sentence that David would agree with.

The pipeline enforces the policy on top of your verdict: a low score, or an MVP that needs money, is a pass.

## Outputs, in `/Users/davidsmith/idea-factory/ideas/<slug>/`

**`REVIEW.md`**:
- verdict and score (0–10) in the first line;
- each forcing question with its answer, the evidence (cite RESEARCH.md sources) and a 0–10 score;
- premises, alternatives, the narrowest wedge, the M1 feasibility check, the risks;
- the **kill criteria** that would make David drop it;
- what M1's users should be watched doing.

**`review.json`**, exactly this shape:

```json
{
  "verdict": "validate | pass",
  "score": 0,
  "summary": "two sentences David can read in five seconds",
  "forcingQuestions": {
    "demand": {"score": 0, "evidence": "…"}, "statusQuo": {"score": 0, "evidence": "…"},
    "specificity": {"score": 0, "evidence": "…"}, "wedge": {"score": 0, "evidence": "…"},
    "futureFit": {"score": 0, "evidence": "…"}
  },
  "premises": ["…"],
  "alternatives": ["…"],
  "wedge": "the narrowest version worth testing",
  "feasibility": {"m1Weekend": true, "zeroCost": true, "notes": "stack and the one test that proves M1"},
  "risks": ["…"],
  "killCriteria": "…",
  "landing": {"headline": "≤ 70 chars, the user's pain in their words", "subhead": "≤ 160 chars, what it does",
              "bullets": ["2–5 concrete benefits"], "cta": "≤ 24 chars", "audience": "who should see this page"},
  "launch": {"channels": [{"name": "r/… or community", "url": "https://…", "why": "…"}],
             "post": "a short, honest post David can paste: the problem, the page link placeholder {url}, and a question for readers"}
}
```

`landing` and `launch` are required for `validate`. Write only these two files, and nothing outside
the idea's folder.
