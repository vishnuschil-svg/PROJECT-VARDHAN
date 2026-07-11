# Communication Center

Communication jobs are created through `communicationService`.

## Channels

Manual share and WhatsApp fallback are supported locally. External SMS, email, and WhatsApp APIs are not connected.

## Rules

- Duplicate sends are prevented by `dedupeKey`.
- No fake provider success is returned.
- Manual fallback returns a share link and `MANUAL_ACTION_REQUIRED` status.
