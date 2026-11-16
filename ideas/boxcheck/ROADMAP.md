# boxcheck — roadmap

Suggested stack: TypeScript + Vite static app (no server, so payroll data stays in the browser and hosting is $0); Papa Parse for CSV; Vitest for the calculation; Playwright for one upload flow; Vercel Hobby.

## M1 — Register in, premium out (one weekend)
Deliverables: CSV upload with column mapping, per employee per week premium calculation, annual totals per employee, results table, CSV export of the working.
Exit criteria (a test could run):
- A fixture with one employee at $20/hr working 52 hours in one week returns overtime hours 12 and premium 120.00.
- A week of exactly 40 hours returns premium 0.00.
- Two weeks (45 and 50 hours at $18.00) return premiums 45.00 and 90.00 and an annual total of 135.00.
- A fixture with 3 employees returns three separate totals that sum to the sum of the weekly premiums.
- A CSV with a missing hours value produces an error row naming the line number and does not crash.

## M2 — Compare and flag
Deliverables: compare column for the provider's TT figure; difference flag over $1; flags for bonus or differential pay lines, daily-overtime states, possibly exempt employees.
Exit criteria:
- Provider figure 135.00 vs computed 150.00 shows a flagged difference of 15.00.
- A row with a bonus pay line is flagged "regular rate needs review" and excluded from the total, which is listed separately.
- A row marked exempt is excluded and listed.

## M3 — Printable summary and demand test
Deliverables: printable one-page summary with working, a landing page with the $29 pay link or waitlist, outreach to bookkeeper communities.
Exit criteria:
- Print view renders all employees on pages with no clipped columns at A4 and Letter.
- Landing page loads under 2 seconds and logs an upload-started event with no payroll content.
