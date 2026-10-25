# Deductwise — PRD

## Problem
When a tenant moves out, a small landlord must itemize deductions from the security deposit and return the rest by a state deadline (14–60 days). Missing the deadline, skipping receipts or charging full replacement cost instead of a prorated share can void the right to withhold and bring double or triple damages plus fees (see RESEARCH.md: verticalrent, landlordstudio). Today they use a free generic template, a lawyer, or guesswork.

## Target user
A self-managing landlord with 1–10 units who handles perhaps 1–4 move-outs a year, has no property manager, and wants to keep a fair part of the deposit without losing a small-claims case. Secondary: small property managers with a few doors.

## Competitors & gap
Landlord Studio (free template), Pendo Rental (free inspections), ProofMi ($4.99–$14.99/mo photo evidence), RentCheck, Tenwell, TurboTenant/Avail suites, attorney letters, ChatGPT. None found combines a state-aware deadline and itemization-rule check, useful-life proration, and a photo/receipt evidence appendix in one per-move-out packet. The gap is correctness and defensibility, not the letter itself. Free substitutes are the main threat.

## MVP scope
- State picker with deadline, itemization and receipt rules, interest rule and penalty multiplier for the launch states (CA, TX, FL, NY, WA, plus a "not yet covered" fallback).
- Move-out form: deposit, move-out date, forwarding-address date, tenant details.
- Line-item builder: description, repair cost, photo upload, receipt upload, item age at move-in, useful life preset (carpet, paint, flooring, appliances).
- Proration calculator: replacement cost × remaining life ÷ useful life, capped at actual cost, with a plain explanation per line.
- Deadline countdown with emailed reminders at 7 and 2 days before the deadline.
- PDF output: itemized statement, refund amount, and evidence appendix (photos, receipts), with statute reference and "last verified" date.
- Pay per packet ($19) with the PDF preview free; no account needed beyond an email link.

## Non-goals
- Legal advice, tenant disputes, or court filings.
- Lease generation, screening, rent collection or full property management.
- Inspection photo capture app (accept uploads only).
- All 50 states at launch; commercial leases; international.

## Success metrics
- Accuracy: for each launch state, 100% of test cases match a hand-checked deadline and penalty rule table.
- Demand test: 5% of landing-page visitors from landlord communities join a waitlist or start a packet; 10 paid packets within 60 days of launch counts as a go (a threshold chosen to be cheap to hit, not a forecast).
- Completion: 70% of started packets reach a PDF.
- Quality: under 1 in 20 users report a wrong state rule in the first 100 packets.

## Open questions
- Will landlords pay $19 when free templates exist? Test price and framing ("cost of missing a deadline is 2–3x the deposit").
- How to keep the statute table correct and who is liable if it is wrong.
- Is per-move-out or an annual plan the better fit, given only 1–4 move-outs a year?
- Which community and search phrases reach landlords at move-out time?
