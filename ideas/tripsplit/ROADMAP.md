# Offline-first Group Trip Expense Splitter

## M1: Core expense logging and settlement (Weekend achievable)
**Deliverables:**
- Single-currency trip creation (name, dates, destination).
- Add members by name.
- Log expenses: payer, amount, split mode (equal/custom shares/weighted).
- View running balances per member.
- Settle up: calculate minimal transfers to zero balances.
- Local data storage (SQLite or equivalent).
**Exit criterion:** 
- Can log 10 expenses offline, settle up, and see correct balances.
- Unit tests for settlement algorithm pass.

## M2: Multi-currency support
**Deliverables:**
- Set base currency per trip; log expenses in any currency.
- Store original currency and amount; optionally convert to base using fixed rate (or historical).
- View balances per currency.
- Settle up per currency (independent settlements).
**Exit criterion:**
- Successfully log expenses in USD, EUR, and JPY, settle up, and see correct per-currency transfers.
- Exchange rate handling does not corrupt base currency totals.

## M3: Invite links and non-account participation
**Deliverables:**
- Generate invite link (QR code and short URL) for trip.
- Non-users can open link in browser, see trip details, and claim their profile by name.
- Claimed profiles sync back to organizer's device when online.
- Organizer can see which members have claimed vs. pending.
**Exit criterion:**
- A non-user can join a trip via link, view expenses, and have their name appear in the settlup view.
- Data persists across app restarts for the organizer.

## M4: Optional cloud sync and backup
**Deliverables:**
- Toggle to enable/disable cloud sync (disabled by default).
- Encrypted backup to user's chosen cloud provider (e.g., iCloud, Google Drive) or local encrypted file.
- Restore from backup.
**Exit criterion:**
- Backup and restore functions without data loss.
- Sync works when toggled on and device goes online/offline.

## M5: Polish and release
**Deliverables:**
- UI/UX improvements based on feedback.
- Help tooltips and onboarding flow.
- Performance optimization for large expense lists.
- App store listings (Google Play, App Store) with privacy details.
- Beta testing with 5+ groups on actual trips.
**Exit criterion:**
- App store submission ready.
- Positive feedback from beta testers on usability and reliability.

## Suggested stack
- **React Native** (expo) for cross-platform development with near-native performance and access to device features.
- **SQLite** via `react-native-sqlite-storage` for local-first data storage with offline guarantees.
- **Redux Toolkit** for state management and predictable updates.
- **React Navigation** for smooth screen transitions.
- **Expo SecureStore** for any sensitive tokens (if sync enabled).
- **Why:** Enables one codebase for iOS/Android, fast iteration, and strong community support. SQLite provides true offline persistence. Redux ensures state consistency across async operations.