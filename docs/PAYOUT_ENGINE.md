# Payout Engine

The payout engine tracks winner payout plans after auction or lucky draw.

## Modes

- `FULL`
- `PARTIAL`
- `INSTALLMENTS`
- `CUSTOM`

## Rules

- Total, paid, pending, and status are calculated in `PayoutEngine`.
- Reversal requires a reason.
- Payment records should update finance through `payoutService`.

## Known Limits

External bank payout APIs are not connected.
