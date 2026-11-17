# Phase 0 Verification Report

## Summary
Phase 0 is in the tree: hardened Electron shell, local tokens and showcase, and the three spikes. The gate passes. This re-run measured the window, the CSP block, and a fresh spike. Phase 1 is not started.

## Requirement IDs
- Phase 0 has no feature IDs. Deliverables from §8:
- Scaffold, tooling, section 3.2 stubs — met — `package.json` scripts, `tests/unit/package-name.test.ts`, `tests/unit/folder-structure.test.ts`
- Hardened window, CSP, navigation guard, preload `getVersion` only — met — `src/main/window.ts`, `src/main/security/csp.ts`, `tests/unit/hardening.test.ts`, live check below
- Tailwind, local fonts, `tokens.css`, showcase — met — `src/renderer/src/styles/tokens.css`, `src/renderer/src/App.tsx`, live font check
- Spike A, Spike B, Spike C, `SPIKE-REPORT.md` — met — `npm run spike` exit 0, packaged `Ward.exe` stayed up

## Files created / modified
- `src/main/window.ts`, `src/main/index.ts`, `src/main/launch-target.ts` — hardened window, single instance, packaged launch ignores the dev server
- `src/main/security/csp.ts`, `navigation-guard.ts`, `permissions.ts`, `web-preferences.ts` — CSP, navigation, permissions, webPreferences
- `src/main/ipc/guard.ts`, `src/main/ipc/register.ts`, `src/shared/ipc-contract.ts`, `src/preload/index.ts`, `src/preload/index.d.ts` — `app:getVersion` only
- `src/renderer/src/styles/tokens.css`, `globals.css`, `design/theme.ts`, `App.tsx`, `main.tsx`, `index.html` — tokens and showcase
- `src/renderer/src/assets/main.css` — deleted (template CSS)
- `src/main/db/open.ts`, `scripts/spike.mjs`, `SPIKE-REPORT.md` — cipher driver and spikes
- `electron.vite.config.ts`, `package.json`, `package-lock.json` — Tailwind, fonts, spike script, no inlined fonts
- `tests/unit/hardening.test.ts`, `tests/unit/tokens.test.ts` — gate tests
- `PROGRESS.md` — step checkboxes
- `docs/gates/phase-0.md` — this report

## Commands run
- `npm run typecheck` → PASS (exit 0)
- `npm run lint` → PASS (exit 0)
- `npm test` → 13 passed / 0 failed (4 files, Vitest 5.1.0). coverage: not run
- `npm run dev` → launched OK. Renderer at `http://localhost:5173/`. No preload or CSP error. Content protection hides the window from screenshots, so the page was read over the DevTools port.
- `npm run spike` → PASS (exit 0). `PASS db`, `PASS aead`, `PASS spike`.
- Packaged `dist/win-unpacked/Ward.exe` → process stayed up (pid 28032), then was closed. Stderr had no error.
- `node .cursor/skills/ward-security-review/scripts/scan.mjs` → exit 1, 1 high. Judged harmless. See Secrets and hardening.

## Gate checklist
Copied from Ward-PRD.md §8 Phase 0. One line each. No item dropped.

- [x] `npm run typecheck`, `lint`, `test` pass with zero errors. — PASS — typecheck exit 0, lint exit 0, 13 passed / 0 failed
- [x] `npm run dev` opens a window showing the token showcase with correct fonts, offline (disable network and confirm). — PASS — page text contained "Token showcase. The vault is not built yet." `document.fonts.check` was true for `Inter Variable` and `JetBrains Mono Variable` (`document.fonts.status` `loaded`). Computed fonts were `"Inter Variable", sans-serif` and `"JetBrains Mono Variable", ui-monospace, monospace`. Resource hosts before the probe were only `localhost:5173`. Chromium network emulation was then set offline: `navigator.onLine` was false, the showcase text was still there, and the heading font was still Inter Variable. The Windows adapter was not disabled.
- [x] Hardening: renderer has no `require`/`process`; `window.ward` has only `getVersion`; navigating or `window.open` is blocked (test or documented manual check). — PASS — live page: `typeof require` and `typeof process` were `undefined`; `Object.keys(window.ward)` was `["getVersion"]`. `window.open('https://example.com/ward-nav-probe')` returned null. `location.assign` to that URL left the page on `http://localhost:5173/`. Same results on the packaged `file://` page. Unit test `navigation is blocked and new windows are denied`. Unit test `the preload exposes only getVersion`.
- [x] CSP blocks an injected remote script (manual check recorded). — PASS — injected `https://example.com/ward-csp-probe.js`. Dev console: `Loading the script 'https://example.com/ward-csp-probe.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline'"`. `securitypolicyviolation` fired with `script-src-elem`, `disposition: enforce`. The packaged page blocked the same URL the same way. The script did not load.
- [x] Spike A: wrong key fails; the raw DB file contains no plaintext marker. — PASS — `npm run spike` printed `PASS db` (exit 0). `scripts/spike.mjs` opens with `cipher='sqlcipher'` and `PRAGMA key = "x'<64 hex>'"`, throws on the wrong key, and checks the file for the marker and a SQLite header. `SPIKE-REPORT.md` records that result.
- [x] Spike B: round trip passes; KDF timings recorded. — PASS — this run: `KDF_INTERACTIVE 135 ms ops 2 mem 67108864`, `KDF_MODERATE 790 ms ops 3 mem 268435456`, `PASS aead`. `SPIKE-REPORT.md` records the earlier run: 107 ms and 642 ms. Both MODERATE results sit inside the 0.7–1.2 s band.
- [x] Spike C: packaged build launches and loads native modules. — PASS — `dist/ward-1.0.0-setup.exe` and `dist/win-unpacked/Ward.exe` exist. `dist/win-unpacked/resources/app.asar.unpacked/node_modules/better-sqlite3-multiple-ciphers/prebuilds/win32-x64.node` exists. `Ward.exe` stayed running and painted the showcase from `file://`. `loadCipherDriver()` runs before the window, so a missing addon would have exited.
- [x] `SPIKE-REPORT.md` exists and states clearly whether the DB-encryption decision (2.2) holds or needs the fallback. — PASS — the Decision section says 2.2 holds and no fallback.

## Secrets and hardening
- Scan: 1 high, `generic-ipc` at `src/preload/index.ts:9`. The channel is the constant `APP_GET_VERSION`, not a string the renderer chooses. The scanner note says a fixed channel is fine. Not a defect.
- No master password, recovery key, vault key, or entry secret is in this report. The spike fixture stays in `scripts/spike.mjs` and is not repeated here.

## Deviations from the PRD
- Dev CSP adds `script-src 'unsafe-inline'` and replaces `connect-src 'none'` with localhost and `127.0.0.1` http/ws. Production returns the section 4.7 string unchanged (`src/main/security/csp.ts`). Needed for the Vite React preamble. Approved during step 0.4.
- Zod is not installed. `app:getVersion` checks the sender and rejects a payload that is not `undefined`. Schemas wait for Phase 3.
- `setTheme` writes `data-theme` only. The circular reveal in 7.5.1 is Phase 4.
- Light status colors are darker than the named dark-theme status colors so the pairs meet WCAG AA. Recorded in step 0.5. `tests/unit/tokens.test.ts` (`text and accent pairs meet WCAG AA`).
- `electron-builder.yml` is still the template: `appId` `app.ward.desktop`, `npmRebuild: false`, NSIS `oneClick` true, signing skipped. App id and the installer sketch wait for the identity steps. Spike C still passed on the published prebuild.

## Library versions pinned / API differences
- electron@44.11.1 — matches the installed runtime
- electron-vite@6.0.0 — matches
- electron-builder@26.18.0 — matches; signing skipped; `npmRebuild: false`
- react@19.3.1, react-dom@19.3.1 — matches
- vite@8.3.8 — matches; Tailwind peer accepts Vite 8
- typescript@5.9.3 — matches
- tailwindcss@4.3.5, @tailwindcss/vite@4.3.5 — https://tailwindcss.com/docs/installation/using-vite — `@theme inline` so utilities follow the CSS variables
- @fontsource-variable/inter@5.3.0, @fontsource-variable/jetbrains-mono@5.3.0 — local files, no CDN
- better-sqlite3-multiple-ciphers@13.2.0 — raw key is `PRAGMA key = "x'<hex>'"` after `cipher='sqlcipher'`, not `key(Buffer)`. Default cipher is sqleet; the spike sets sqlcipher. Decision 2.2 holds.
- libsodium-wrappers-sumo@0.8.4 — https://doc.libsodium.org/password_hashing/default_phf — `crypto_pwhash` Argon2id; encrypt argument order is message, additional data, secret nonce, public nonce, key
- vitest@5.1.0, eslint@9.39.5, eslint-plugin-security@4.2.1, prettier@3.10.1 — matches
- @playwright/test@1.65.0 — installed, no specs, browsers not downloaded

## Known issues / risks
- KDF times moved between runs (INTERACTIVE 107 then 135 ms, MODERATE 642 then 790 ms). MODERATE stayed inside 0.7–1.2 s. Phase 1 should start from MODERATE. Do not go below INTERACTIVE.
- The security scan exits 1 on the fixed `getVersion` channel. That is the scanner's only high hit.
- Installer is unsigned and still the template NSIS config. Not a Phase 0 gate failure. Identity and installer work is later.
- `app.ward.desktop` is still the app id. Do not change it until the identity questions are answered.
- Content protection blocks screenshots. A visual check has to use the DevTools port or a machine where capture is allowed.

## Not done
- Phase 1 crypto module, vault header, and any feature UI
- Zod schemas and the rest of the IPC channels
- Theme circular reveal
- App-identity AI-2 (icon kit is not in the repo)
- PRD 7.10 installer settings
- Playwright browser download and e2e specs
- coverage: not run
- The Windows network adapter was not switched off

## Suggested git
- branch: phase-0
- tag (do not create unless asked): phase-0-done
- commit message draft: Record the Phase 0 shell, local tokens, and encryption spikes.

## Verdict
PASS

## Awaiting
Waiting for Miguel to sign off. Next command after sign-off: GO PHASE 1.
