# Payment Mode Configuration

Payment modes are controlled by `paymentModeService`.

## Supported Modes

Cash, bank transfer, UPI, QR, cheque, wallet, card, and other.

## Rules

- UI should call service validation instead of hardcoding allowed modes.
- Disabled modes must block collections/finance posting.
- Organizer settings are tenant scoped.
