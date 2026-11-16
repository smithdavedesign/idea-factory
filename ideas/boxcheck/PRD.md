# boxcheck — PRD

## Problem
From tax year 2026, employers must report each employee's qualified overtime, the half-time premium only, in W-2 Box 12 code TT. Employees can generally deduct only what is reported there, and a wrong figure needs a W-2c to fix (RESEARCH.md, Evidence). Small employers on spreadsheets, low-end payroll or unusual pay structures have no independent way to check the number before W-2s go out.

## Target user
The owner or outside bookkeeper of a 5–50 employee hourly business (restaurant, shop, clinic, trades) who produces W-2s from a payroll register and wants to know the TT figure per employee is right. Secondary: a bookkeeper who does payroll for 5–20 such clients.

## Competitors & gap
Payroll providers compute TT inside their own systems; free calculators estimate the worker's deduction; W-2 filing vendors file what they are given (RESEARCH.md, Competitors). The gap is a provider-independent recomputation from the register with line-by-line working, run in the browser so payroll data stays local.

## MVP scope
- Upload a payroll register CSV (employee, workweek start, hours, regular rate or pay lines) and map columns.
- Per employee per workweek: overtime hours over 40, regular rate, premium = hours × 0.5 × rate.
- Annual total per employee, labelled as the suggested Box 12 code TT value.
- Compare mode: add a column of the provider's TT figure and flag differences above $1.
- Flag rows it cannot decide (bonuses, shift differentials, daily or double-time state rules, possibly exempt employees) instead of guessing.
- Line-by-line working table exportable as CSV and a printable one-page summary.
- All processing in the browser; no upload to a server.

## Non-goals
- Filing W-2s or W-2cs, running payroll, or withholding changes.
- Tax or legal advice, state-specific overtime law engines.
- Employee-side deduction estimates (free tools already do this).
- Accounts, login or stored payroll data.

## Success metrics
- Test: 20 of 20 hand-made fixture registers produce premiums matching a hand-calculated answer to the cent.
- Demand test: at least 5 of 30 contacted bookkeepers or owners upload a real register within 3 weeks; at least 3 say they would pay $29 (kill if fewer).
- Compare mode flags a seeded error in at least 9 of 10 sample registers.
- Page converts at least 3% of visitors from bookkeeper and small-business communities to an upload (a guess to be checked).

## Open questions
- How do providers actually compute TT for bonuses and differentials, and will they match the tool?
- Is there a free incumbent register-based checker I missed?
- Is $29 per business per year the right price, and is the bookkeeper plan the real buyer?
- Exact penalty amounts and filing dates, which need confirming on IRS pages.
