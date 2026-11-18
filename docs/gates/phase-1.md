# Phase 1 Verification Report

## Summary
The crypto core is in the tree: Argon2id, XChaCha20-Poly1305, the recovery key, and the vault header. The gate passes. Line coverage for `src/main/crypto` is 93.83%. Phase 2 is not started.

## Requirement IDs
Phase 1 has no feature IDs. The §8 deliverables are met:
- `createVault`, `unlockWithPassword`, `unlockWithRecovery`, `rewrapPassword`, `rotateRecovery` — met — `src/main/crypto/vault-header.ts`, `tests/unit/vault-header.test.ts`
- Header Zod schema, version check, atomic read/write, `.bak` — met — `vaultHeaderSchema`, `writeVaultHeader`, `readVaultHeader`, `clearHeaderBackup`
- Recovery key encode/decode and RKEK — met — `src/main/crypto/recovery-key.ts`
- Named unit cases (round trip, wrong credential, tamper, nonces, version, typos, no secrets in errors, wipe) — met — the tests named in the checklist

## Files created / modified
- `src/main/crypto/sodium.ts` — init, random bytes, wipe
- `src/main/crypto/kdf.ts` — Argon2id at MODERATE
- `src/main/crypto/aead.ts` — XChaCha20-Poly1305 wrap and unwrap
- `src/main/crypto/recovery-key.ts` — Crockford Base32 and the RKEK
- `src/main/crypto/vault-header.ts` — create, unlock, rewrap, rotate, atomic header IO
- `tests/unit/kdf.test.ts`, `aead.test.ts`, `recovery-key.test.ts`, `vault-header.test.ts` — the Phase 1 cases
- `package.json`, `package-lock.json` — `zod` 4.6.7 and `@vitest/coverage-v8` 5.1.0
- `PROGRESS.md` — step checkboxes
- `docs/gates/phase-1.md` — this report

## Commands run
- `npm run typecheck` → PASS (exit 0)
- `npm run lint` → PASS (exit 0)
- `npm test` → 29 passed / 0 failed
- `npm run dev` → not required
- `npx vitest run --coverage --coverage.provider=v8 --coverage.include=src/main/crypto/**/*.ts --coverage.reporter=text` → PASS — Lines 93.83% (213/227)
- `rg -n "Math.random|console.log" src/main/crypto` → no matches
- `node .cursor/skills/ward-security-review/scripts/scan.mjs` → exit 1, 1 high. Judged harmless. See Secrets and hardening.

## Gate checklist
Copied from Ward-PRD.md §8 Phase 1. One line each. No item dropped.

- [x] All unit tests pass, including every tamper and wrong-credential case. — PASS — `npm test`, 29 passed / 0 failed. Tamper and `WRONG_PASSWORD` cases are in `tamper, a bad version, and a recovery typo fail closed`, `a new password rewraps the same vault key`, and `rotating the recovery key leaves the password wrap alone`.
- [x] Coverage for `crypto/` ≥ 90% lines. — PASS — v8 line coverage for `src/main/crypto/**/*.ts` is 93.83% (213/227). Per file: `aead.ts` 89.47%, `kdf.ts` 94.11%, `recovery-key.ts` 98.48%, `vault-header.ts` 91.22%. The directory total is the figure the gate asks for.
- [x] Grep confirms no `Math.random`, no `console.log` in `crypto/`. — PASS — `rg` found no matches under `src/main/crypto`.
- [x] A test proves the same password yields different headers (random salt/nonces) and both unlock correctly. — PASS — `the same password makes two different headers and both unlock`. Salts differ, password nonces differ, and the two wraps inside one header use different nonces. Both headers unlock.
- [x] Changing the password re-wraps the VK without changing it (the old DB would still open). — PASS — `a new password rewraps the same vault key` compares the vault key bytes and they match. Phase 1 has no database, so a SQLite file was not opened. The key bytes are the same value a later database open would use.

## Secrets and hardening
- Scan: 1 high, `generic-ipc` at `src/preload/index.ts:9`. The channel is the constant `APP_GET_VERSION`. The scanner says a fixed channel is fine. Not a defect.
- No master password, recovery key, vault key, or entry secret is in this report.

## Deviations from the PRD
- The sumo wrapper returns `OPSLIMIT_MAX` and `MEMLIMIT_MAX` as negative int32 values. They are read with `>>> 0`. Parameters are not lowered. Floor stays INTERACTIVE. Default stays MODERATE.
- Associated data includes `format` and `createdAt` as well as version and KDF params, so changing those fields fails unlock.
- A password change keeps the salt. The recovery wrap is not rewritten, because `rewrapPassword` does not receive the recovery key.
- Recovery display is Crockford Base32. The check symbol is always written and a body without it still decodes. The BLAKE2b key is `ward.recovery.rkek.v1`.
- `@vitest/coverage-v8` 5.1.0 was installed for this measurement. It is a dev dependency. The PRD names Vitest and the gate requires the line count; it does not name this package.

## Library versions pinned / API differences
- libsodium-wrappers-sumo@0.8.4 — https://doc.libsodium.org/password_hashing/default_phf and https://doc.libsodium.org/secret-key_cryptography/aead/chacha20-poly1305/xchacha20-poly1305_construction — `crypto_pwhash` and `crypto_aead_xchacha20poly1305_ietf_encrypt`. JS argument order differs from the C snippets. Behavior matches.
- zod@4.6.7 — https://zod.dev/api — `z.strictObject`, `z.literal`, `z.iso.datetime`, `z.int`, `safeParse`. Matches the current Zod 4 docs.
- @vitest/coverage-v8@5.1.0 — https://vitest.dev/guide/coverage.html — `vitest run --coverage` with the v8 provider. Same version as Vitest 5.1.0.
- better-sqlite3-multiple-ciphers@13.2.0 — not used in this phase. The database open is Phase 2.

## Known issues / risks
- `aead.ts` line coverage is 89.47%. The directory total is 93.83%.
- KDF time moves between runs. MODERATE stayed inside 0.7–1.2 s on the spike machine. Phase 1 stores those params in the header.
- The installer and app id work from Phase 0 is unchanged.

## Not done
- Phase 2 database, migrations, and repositories
- IPC schemas, session, and UI
- A SQLite open with the rewrapped vault key
- coverage HTML was written under `coverage/`, which is gitignored

## Suggested git
- branch: phase-1
- tag (do not create unless asked): phase-1-done
- commit message draft: Record the Phase 1 crypto core and the vault header.

## Verdict
PASS

## Awaiting
Waiting for Miguel to sign off. Next command after sign-off: GO PHASE 2.
