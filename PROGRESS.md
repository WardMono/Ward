# Ward progress

Updated: 2026-11-18

## Now

Phase 0 gate passed (`docs/gates/phase-0.md`). Phase 1 is in progress. Next command: `GO 1.3`. Do not start Phase 2.

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
- [ ] **1.3 Recovery key.**
- [ ] **1.4 Vault header:** create, unlock, rewrap, rotate, atomic read/write.
- [ ] **1.5 Remaining Phase 1 tests** if 1.2–1.4 did not cover every deliverable case.

## Phases 2–12

Not started. A phase starts only after the previous gate is accepted and you type `GO PHASE N`.
