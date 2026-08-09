# Batch 3 automated-operation audit

Audit date: 2026-08-09
Search terms: auction, winner, winning, lucky, draw, random, lottery, bid, bidding, discount, dividend, prized, payout, rotation, turn, selection, recipient.

The repository-wide scan produced 514 lexical file matches. Most are ordinary UI words such as selection/return, or historical accounting/reporting references. The relevant operational surfaces are classified below before behavior changes.

| Classification | Relevant code | Audit conclusion |
|---|---|---|
| A. SAFE_ACCOUNTING | `CollectionEngine`, `LedgerEngine`, immutable/member ledgers, `FinanceRepository`, `ReportsRepository`, receipt services, expense services, month closing, reconciliation, historical dividend/payout report readers | Values are aggregated or displayed after persistence. Preserve behavior and historical reads. A legacy word alone does not make these unsafe. |
| B. MANUAL_RECORD | `domain/groupManager/manualRecords.js`, `manualRecordsService.js`, `ManualRecords.jsx`, new manual/distribution repositories | Organizer-entered recipient and amount are source data. No selection/ranking algorithm. Keep unchanged except routing coexistence. |
| C. AUTOMATED_DECISION | `AuctionEngine.calculateAuction`, `AuctionEngine.buildAuctionPreview`, `AuctionEngine.buildWinnerResult`, `LuckyDrawEngine.selectWinner`, `LuckyDrawEngine.buildResult`, `WinnerEligibilityEngine.getEligibleMembers`, `chitAuctionEngine.calculateAuctionFinancials`, `selectAuctionLuckyWinner`, `chitLuckyDraw.selectTransparentWinner`, auction/lucky service confirmation paths, winner confirmation, winner-derived payout plan creation | Must fail closed with `REGISTERED_OPERATIONS_DISABLED` in default mode. No silent fallback. |
| D. LEGACY_UI | `pages/chits/Auctions.jsx`, `LuckyDraw.jsx`, `Payouts.jsx`, `Dividends.jsx` and their CSS/config presentation helpers | Preserve files. Do not render when registered operations are disabled. Existing history remains in storage but executable UI is hidden. |
| E. LEGACY_SERVICE | `auctionService.js`, `luckyDrawService.js`, `winnerService.js`, winner-dependent parts of `payoutService.js`, `winnerLifecyclePersistence.js` | Read-only list functions remain available for history/reports. Preview/confirm/create/cancel execution entry points require the registered-operations guard. Low-level persistence stays compatible for historical readers. |
| F. LEGACY_REPOSITORY | Auction, LuckyDraw, Winner, Payout and Dividend repositories in local/Supabase implementations; production mapping adapters | Preserve schemas and read access. Repositories do not decide outcomes and are not deleted or destructively migrated. New automated writes are blocked above this layer. |
| G. LEGACY_ROUTE | `/chits/auctions`, `/chits/lucky-draw`, `/chits/payouts`, `/chits/dividends` | Guard both navigation and direct URLs. Disabled access redirects to `/chits/manual-records` with a neutral message state. |
| H. REGISTERED_OPERATIONS_FEATURE_BANK | All C-G automated execution surfaces, legacy pages, validators, entities, repositories, migrations 001-009, tests and docs | Logical feature bank only; no risky physical move. Activation requires platform configuration plus platform-owner/reserved permission authorization. |

## Read/write boundary

Historical auction, winner, lucky-draw, dividend and payout records remain readable by existing reports and reconciliation code. No existing database table, column, record or migration is changed in Batch 3. Executable operation entry points are guarded independently of UI visibility.

## Explicitly safe lexical matches

Generic form selection controls, random IDs/nonces, array rotation/layout, report labels, receipt numbers, imports, tests, documentation and ordinary `return` statements are not operational decision features. They require no guard.
