# Auction Engine

Auction flow now uses:

- `WinnerEligibilityEngine`
- `AuctionEngine.buildAuctionPreview`
- `AuctionValidator`
- `auctionService.confirmAuctionWinner`
- `WinnerRepository`
- `MemberStateRepository`

Confirmed auction winner creates winner state, payout obligation, report row, activity and notification in local/demo mode.
