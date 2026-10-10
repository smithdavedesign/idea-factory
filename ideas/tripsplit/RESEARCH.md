# Offline-first Group Trip Expense Splitter

## Summary
Groups traveling together often face intermittent or no internet connectivity, making cloud-dependent expense apps unreliable. Existing solutions either require accounts, fail to handle multi-currency splits cleanly, or lack true offline-first capabilities. Users need an app that works entirely offline, allows anyone to participate without installing the app, tracks multiple currencies separately, and settles up with minimal transactions upon reconnection.

## Evidence of the Problem
- TripLedger's marketing highlights "Group trips, settled. The whole ledger fits in your pocket" and addresses pain points like forgotten expenses and currency confusion on trips【https://blacknwhitestudio.com/tripledger/】.
- Deudin explicitly states: "Trips are where expense apps fail: no roaming on the mountain, half the group never installed anything, and three currencies in one weekend"【https://deudin.app/for/trips/】.
- Kitty notes: "Group travel and shared-living expenses routinely devolve into tangled IOUs tracked in a chat thread or a messy notes app"【https://allthingsn.com/apps/kitty/】.
- SpndX emphasizes offline-first tracking and multi-currency support for travel spending【https://www.spndx.app/】.

## Competitors & Alternatives
| Name       | Price          | Gap                                                                 |
|------------|----------------|---------------------------------------------------------------------|
| Splitwise  | Freemium       | Requires accounts, cloud-dependent, limits free tier, aggressive upsells |
| TripLedger | Free/ads       | Offline-first but requires all members to install app for full sync   |
| Deudin     | Unknown        | Offline-first, allows non-installers via invite link, per-currency tracking |
| Kitty      | Free (iOS)     | Offline-first, no account, but iOS-only and limited to Apple ecosystem |
| SpndX      | Free           | Offline-first, multi-currency, but focused on personal/shared money, not trip-centric features like itineraries |
| Splitie    | Freemium       | Offline-first, no account, but lacks multi-currency and trip planning |

## Technical Notes
- Use a local-first database (e.g., SQLite or Realm) on device for offline operation.
- Sync mechanism: queue changes when offline, replicate when online (conflict-free replicated data type or operational transformation).
- Multi-currency: store amounts with original currency and optionally converted amounts using historical rates; settle per currency.
- Non-account participation: generate invite links for non-users to claim their profile via browser, storing data locally on organizer's device until they install app.
- Settlement algorithm: implement greedy debt simplification to minimize number of transfers.
- Tech stack: Consider React Native or Flutter for cross-platform, or Swift/Kotlin native for performance.

## Risks & Open Questions
- How to handle conflicts when multiple devices edit the same expense offline? Need a conflict resolution strategy.
- Battery drain from constant sync attempts when intermittently online.
- Ensuring data privacy when stored solely on organizer's device without encryption.
- Legal considerations for financial apps in different jurisdictions (though this is a simple splitter, not a bank).
- User acquisition: how to convince groups to adopt a new app when they might already use Splitwise or spreadsheets.

## Sources
- https://blacknwhitestudio.com/tripledger/
- https://deudin.app/for/trips/
- https://allthingsn.com/apps/kitty/
- https://www.spndx.app/
- https://www.splitie.app/