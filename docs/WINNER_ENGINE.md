# Winner Engine

`WinnerResult` is shared by auction, lucky draw, company, foreman and manual winner modes.

Confirmed winners update `MemberChitState`:

- `isWinnerLocked = true`
- `liftMonth`
- `liftEffectiveMonth`
- `winnerType`

Future eligibility uses this state.
