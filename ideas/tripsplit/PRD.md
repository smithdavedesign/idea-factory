# Offline-first Group Trip Expense Splitter

## Problem
Group travelers struggle to track shared expenses reliably when internet connectivity is unavailable or spotty. Existing apps either require constant connectivity, force all participants to install the app and create accounts, or fail to handle multiple currencies cleanly, leading to IOU chaos, mistrust, and tedious settlement after the trip.

## Target user
- Organizers of group trips (friends, family, tours) who want a simple, fair way to split costs without chasing people for payments.
- Travelers who dislike installing apps just for a trip and prefer to participate via a link or minimal friction.
- Groups traveling internationally or across borders where multiple currencies are involved.

## Competitors & gap
- Splitwise: Requires accounts, cloud-dependent, freemium limits. Gap: Works fully offline, no accounts needed.
- TripLedger: Offline-first but requires app install for all members to sync. Gap: Allows non-installers to participate via invite link.
- Deudin: Offline-first, per-currency tracking, non-installer support. Gap: May lack trip planning features (itinerary, checklists) and cross-platform availability.
- Kitty: Offline-first, no account, iOS-only. Gap: Cross-platform (Android/Web) and trip-centric features.
- SpndX: Offline-first, multi-currency, but geared toward personal/shared money, not trip-specific workflows.
- Splitie: Offline-first, no account, but lacks multi-currency and settlement optimization.

Our app combines: true offline-first operation, no-account participation via invite links, per-currency tracking, trip planning basics (dates, members), and minimal-settlement engine.

## MVP scope
- Create a trip with name, dates, destination, and base currency.
- Add members by name (no account required) or via invite link.
- Log expenses: payer, amount, currency, date, split mode (equal, custom shares, or weighted), and optional notes.
- Support multiple currencies per trip; store original currency and optionally converted amounts.
- View running balances per member per currency.
- Settle up: generate minimal set of transfers to zero balances per currency.
- Data stored locally on device; optional cloud sync (disabled by default) for backup.
- Share trip via invite link (browser-based) for non-users to view balances and claim their profile.
- Simple UI: trip overview, expense list, settle-up screen.

## Non-goals
- No social feed or chat within the app.
- No bank integration or payment processing.
- No AI-powered expense categorization.
- No complex trip booking (flights, hotels).
- No multi-device real-time collaboration (sync is eventual consistency).

## Success metrics
- Ability to log at least 50 expenses offline without data loss.
- Settlement algorithm reduces IOUs to the theoretical minimum transfers (verified via unit tests).
- 90% of users can create a trip and log an expense within 2 minutes of first opening the app (measured via usability testing).
- Zero crashes or data corruption when toggling offline/online states 100 times in testing.
- Positive feedback from at least 5 beta testers who used the app on an actual trip with spotty connectivity.

## Open questions
- What is the best conflict resolution strategy for offline edits? (Last-write-wins vs. merging)
- Should we implement end-to-end encryption for data stored on the organizer's device?
- How to handle exchange rate fluctuations for multi-currency settling? Use fixed rates at time of expense or allow re-settling with updated rates?
- What is the optimal way to share trip invites? (QR code, short link, or both)
- Should we include a basic itinerary or checklist feature, or keep it strictly to expenses?