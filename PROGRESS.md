# Ward progress

Updated: 2026-11-13

## Now

Phase 0, step 0.2 is done. Next build command: `GO 0.3`.

App-identity step AI-1 is recorded in `docs/reports/app-identity/step-AI-1.md`. Next identity command waits for `GO` on AI-2. The Ward icon kit is not in the repo yet.

## Phase 0 — Foundation and spikes

- [x] **0.1 Scaffold.** `electron-vite` React + TypeScript via `npm create @quick-start/electron@1.0.31 -- --template react-ts --skip`. Package name `ward`. Product name Ward. App id `app.ward.desktop`. `electron-updater` was not added. The template auto-update publish URL was removed. The demo page (logo, docs link, ping IPC) was replaced with a quiet placeholder.
- [x] **0.2 Tooling.** Strict TypeScript is on, including `noImplicitAny` (the Electron toolkit base turns that flag off). ESLint uses `eslint-plugin-security` 4.2.1. Prettier was already pinned. Vitest 5.1.0 runs `npm test`. Playwright 1.65.0 is installed and `npm run test:e2e` is wired with no specs yet. `npm run package` builds a Windows installer. Browser binaries for Playwright were not downloaded. Electron mode does not need them.
- [ ] **0.3 Folder structure.** Stubs from section 3.2: crypto, db, session, ipc, services, shared schemas, renderer features.
- [ ] **0.4 Hardening.** The template is not the Ward shell yet. `sandbox` is `false`. The preload exposes `@electron-toolkit/preload`'s `electron` API, which is a generic bridge. External links open with no confirm. DevTools are not locked down for production. CSP is the template meta tag, not the production header from section 4.7.
- [ ] **0.5 Tokens.** Tailwind, local Inter and JetBrains Mono, `tokens.css`, and a token showcase. The placeholder screen uses plain CSS until then.
- [ ] **0.6 Spikes.** Encrypted database, libsodium Argon2id + AEAD, and a packaged build. Results go in `SPIKE-REPORT.md`.

## Phases 1–12

Not started. A phase starts only after the previous gate is accepted and you type `GO PHASE N`.
