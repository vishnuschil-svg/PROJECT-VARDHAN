# OCR and vision integration boundary

The browser must never call an OCR vendor directly or contain provider credentials. `VITE_OCR_PROXY_URL` identifies a same-origin authenticated server or gateway endpoint; it is not a provider URL or secret.

The proxy contract is:

- `POST multipart/form-data`, field `document`.
- Accepted content: JPEG, PNG, WebP, or PDF, at most 15 MB.
- Authentication: application session/JWT. The server derives tenant and data scope from the verified identity and must reject cross-tenant metadata supplied by clients.
- Response: JSON containing `{ "text": "..." }`. Confidence and provider metadata may be included, but the browser treats them as advisory evidence.
- Provider credentials, retry policy, malware scanning, data-retention controls, regional routing, and vendor audit logging remain server-side deployment responsibilities.

If the proxy is absent, times out, rejects the file, or returns an invalid response, manual capture remains available. OCR output is only raw evidence: `generateBusinessUnderstanding` converts it to `DraftBusinessModel`, immediately calls `ValidationService`, and creation remains blocked until validation, DSL mapping, simulation, deterministic rules, and owner confirmation all succeed.
