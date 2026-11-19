# Ward progress

Updated: 2026-11-19

## Now

Phase 2 is in progress. Step 2.2 (migrations) is done. Next command: `GO 2.3`.

App-identity step AI-1 is recorded in `docs/reports/app-identity/step-AI-1.md`. Next identity command waits for `GO` on AI-2. The Ward icon kit is not in the repo yet.

## Phase 0 — Foundation and spikes

- [x] **0.1 Scaffold.** `electron-vite` React + TypeScript via `npm create @quick-start/electron@1.0.31 -- --template react-ts --skip`. Package name `ward`. Product name Ward. App id `app.ward.desktop`. `electron-updater` was not added. The template auto-update publish URL was removed. The demo page (logo, docs link, ping IPC) was replaced with a quiet placeholder.
- [x] **0.2 Tooling.** Strict TypeScript is on, including `noImplicitAny` (the Electron toolkit base turns that flag off). ESLint uses `eslint-plugin-security` 4.2.1. Prettier was already pinned. Vitest 5.1.0 runs `npm test`. Playwright 1.65.0 is installed and `npm run test:e2e` is wired with no specs yet. `npm run package` builds a Windows installer. Browser binaries for Playwright were not downloaded. Electron mode does not need them.
- [x] **0.3 Folder structure.** Empty stubs for section 3.2. No SQL, no IPC handlers, no window hardening, and no token values. The app still starts from `src/main/index.ts`.
- [x] **0.4 Hardening.** Sandbox on, preload is only `window.ward.getVersion`, navigation and new windows are denied, permissions are denied, content protection is on, production DevTools are off, and the production CSP is the section 4.7 string. Zod and the rest of the IPC channels wait for Phase 3.
- [x] **0.5 Tokens.** Tailwind 4.3.5, local Inter and JetBrains Mono, `tokens.css` for section 7.2, and a token showcase. Light status colors are darker than the dark-theme values so they still meet WCAG AA.
- [x] **0.6 Spikes.** SQLCipher raw-key round trip passed. Argon2id INTERACTIVE 107 ms, MODERATE 642 ms (gate re-run: 135 ms and 790 ms). AEAD round trip passed. `dist/ward-1.0.0-setup.exe` built and `Ward.exe` loaded the native addon. Details are in `SPIKE-REPORT.md`.

## Phase 1 — Crypto core and vault header

- [x] **1.1 Sodium and KDF.** `initSodium`, `randomBytes`, `wipe`, and Argon2id `deriveKek`. New vaults use MODERATE (ops 3, 256 MiB). Params below INTERACTIVE are rejected. The password string is not wiped; the UTF-8 copy is.
- [x] **1.2 AEAD wrap and unwrap.** XChaCha20-Poly1305 with a fresh 24-byte nonce. Associated data is required. A bad unwrap throws `Unwrap failed.` and does not include the message.
- [x] **1.3 Recovery key.** 32 random bytes, Crockford Base32 in groups of 4, mod-37 check symbol. `I/L/O` aliases are accepted. A bad check symbol is rejected. The RKEK is BLAKE2b keyed with `ward.recovery.rkek.v1`.
- [x] **1.4 Vault header.** `createVault`, password and recovery unlock, `rewrapPassword`, `rotateRecovery`, Zod schema, and atomic write with `.bak`. Associated data is format, version, `createdAt`, and the KDF params. A password change keeps the salt so the recovery wrap stays valid. The vault key does not change.
- [x] **1.5 Gap check.** The Phase 1 cases were already covered. One assertion was added: inside one header, the password nonce and the recovery nonce differ. No `Math.random` and no `console.log` in `crypto/`.

## Phase 2 — Encrypted database, migrations, repositories

- [x] **2.1 Encrypted open.** `openVault` sets `cipher='sqlcipher'`, applies the raw 32-byte vault key as `PRAGMA key = "x'<64 hex>'"`, turns foreign keys on, and checks the cipher with a `sqlite_master` read. A bad key length is `INVALID_INPUT`. A wrong key or a failed read is `IO_ERROR` with a fixed message. `loadCipherDriver()` still runs at startup.
- [x] **2.2 Migrations.** `migrate()` applies `0001_init.sql` inside a transaction and sets `user_version` to 1. A second run leaves the version and the rows unchanged. A higher `user_version` is `UNSUPPORTED_VERSION`. No FTS tables.
- [ ] **2.3 FTS5.** Search tables and triggers. Passwords are not indexed.
- [ ] **2.4 Repositories.** Folders, entries and history trim, notes, tasks, income, settings, search, and money helpers.
- [ ] **2.5 WAL/SHM.** Finding and mitigation in `DB-NOTES.md`, plus any deliverable tests still open.

## Phases 3–12

Not started. A phase starts only after the previous gate is accepted and you type `GO PHASE N`.
