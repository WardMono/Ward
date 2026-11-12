# Security checklist

Copy into the report or into `SECURITY-REVIEW.md`. Fill Status and Evidence. Do not delete rows. Add notes under a row if needed.

Status is `PASS`, `FAIL`, or `N/A` with a reason (`N/A` only when this phase has not built that piece yet). `N/A` is not a pass for a Phase 11 or Phase 12 review of a finished app.

## Key hierarchy (§4.2–4.3)

| Item | Status | Evidence |
|---|---|---|
| VK is 32 random bytes from libsodium, created once | | |
| KEK is Argon2id via `crypto_pwhash`, params stored in the header | | |
| Params are at or above INTERACTIVE, target recorded from the dev machine | | |
| Wrap is XChaCha20-Poly1305 with a fresh 24-byte nonce | | |
| Associated data binds format version and KDF params | | |
| Tampering with those fields fails unwrap | | |
| No separate password hash is stored | | |
| Recovery key is 32 random bytes, shown once, Base32 grouped | | |
| RKEK is BLAKE2b with a domain-separation context | | |
| Password change rewraps VK and does not re-encrypt the DB | | |
| Recovery unlock requires a new master password and a new recovery key | | |
| `Math.random` is absent from security paths | | |

## Files and session (§4.4–4.5)

| Item | Status | Evidence |
|---|---|---|
| Header write is temp file, fsync, rename | | |
| Previous header kept as `.bak` until the next successful unlock | | |
| DB opens with the raw VK, not a passphrase KDF | | |
| Wrong key fails closed | | |
| WAL/SHM plaintext finding is written in DB-NOTES.md | | |
| Lock drops the VK with memzero, closes the DB, emits `session:locked` | | |
| Renderer stores that hold vault data clear on that event | | |
| Idle, minimize, OS lock, suspend, and quit lock as settings say | | |
| Throttle starts after 3 failures and matches the delays in §4.5 | | |
| UI says the throttle is not offline-attack protection | | |

## Clipboard, logs, memory (§4.6, §4.8, §4.9)

| Item | Status | Evidence |
|---|---|---|
| Copy of a secret happens in main | | |
| Clear happens only if the clipboard still holds that value | | |
| Windows clipboard-history limitation is implemented or documented in Settings | | |
| Logger allowlist: channel, code, duration only | | |
| Test shows the fixture password never appears in captured logs | | |
| User-facing errors have no stack and no secret | | |
| List and get payloads omit the password | | |
| Reveal path auto-hides; lock hides it immediately | | |

## Electron (§4.7)

| Item | Status | Evidence |
|---|---|---|
| contextIsolation true | | |
| nodeIntegration false | | |
| sandbox true | | |
| webSecurity true | | |
| allowRunningInsecureContent false | | |
| enableRemoteModule absent | | |
| webviewTag false | | |
| Preload exposes only the typed API | | |
| No generic invoke/send passthrough | | |
| Production CSP matches §4.7 | | |
| Dev CSP relaxation is behind isDev | | |
| will-navigate denies | | |
| setWindowOpenHandler denies | | |
| External open is https only, after confirm | | |
| Permission requests denied | | |
| No eval / new Function | | |
| No unsanitized dangerouslySetInnerHTML | | |
| No remote script, font, or image | | |
| DevTools disabled in production | | |
| Single instance lock | | |
| Content protection setting, default on | | |
| No auto-updater | | |
| No source maps in the installer | | |

## Product surfaces that leak

| Item | Status | Evidence |
|---|---|---|
| FTS does not index passwords | | |
| CSV import sanitizes HTML and formula prefixes | | |
| Markdown render is inert for script, javascript: links, and remote images | | |
| Backup checksum detects a one-byte tamper | | |
| Failed restore leaves the original vault intact | | |
| Zero outbound network (Phase 12; earlier phases N/A if not built) | | |
