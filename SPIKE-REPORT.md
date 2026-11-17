# Spike report

Date: 2026-11-17. Runtime: Electron 44.11.1 on Windows.

## Decision

The whole-database encryption choice in PRD 2.2 holds. `better-sqlite3-multiple-ciphers` 13.2.0 opens a SQLCipher database with a raw 32-byte key, rejects a wrong key, and the file on disk does not contain the plaintext marker or a SQLite header. No fallback.

## Versions

| Package | Version | License |
|---|---|---|
| better-sqlite3-multiple-ciphers | 13.2.0 | MIT |
| libsodium-wrappers-sumo | 0.8.4 | ISC |
| tailwindcss | 4.3.5 | MIT |
| @tailwindcss/vite | 4.3.5 | MIT |
| @fontsource-variable/inter | 5.3.0 | OFL-1.1 |
| @fontsource-variable/jetbrains-mono | 5.3.0 | OFL-1.1 |

## Spike A — database

Command: `npm run spike` (`electron scripts/spike.mjs`). Output: `PASS db`.

The database is opened with `cipher='sqlcipher'` and `PRAGMA key = "x'<64 hex chars>'"`. The SQLite3MultipleCiphers pragma docs say that form is raw 32-byte key material and does not run the passphrase KDF. A wrong key throws on the first read. The raw file does not contain the marker string and does not start with `SQLite format 3`.

The library's default cipher is sqleet. This spike sets `sqlcipher` because PRD 2.2 asks for a SQLCipher-compatible cipher.

## Spike B — crypto

Same command. Output:

```text
KDF_INTERACTIVE 107 ms ops 2 mem 67108864
KDF_MODERATE 642 ms ops 3 mem 268435456
PASS aead
```

Argon2id is `crypto_pwhash` with `crypto_pwhash_ALG_ARGON2ID13`. The wrap is `crypto_aead_xchacha20poly1305_ietf_encrypt` and decrypt, with a null secret nonce and a random 24-byte public nonce.

INTERACTIVE is 64 MiB and finished in 107 ms on this machine. That is under the 0.7–1.2 s unlock band in PRD 4.3. MODERATE is 256 MiB and finished in 642 ms, which is inside that band. Phase 1 should start from the MODERATE limits and store them in the header. Do not go below INTERACTIVE.

## Spike C — packaging

Command: `npm run package`. Exit 0.

- Installer: `dist/ward-1.0.0-setup.exe`
- Unpacked app: `dist/win-unpacked/Ward.exe`
- Native addon unpacked at `dist/win-unpacked/resources/app.asar.unpacked/node_modules/better-sqlite3-multiple-ciphers/prebuilds/win32-x64.node`
- `Ward.exe` stayed running. The main process calls `loadCipherDriver()` before the window, so a missing addon would have exited.
- `electron-builder.yml` has `npmRebuild: false`. The published prebuild loaded under Electron 44.11.1. It was not recompiled on this machine.
- The installer is the electron-vite template NSIS config (`oneClick=true`). The PRD 7.10 installer settings are a later step. The log says signing is skipped.

## Docs

- Tailwind Vite install: https://tailwindcss.com/docs/installation/using-vite — `@tailwindcss/vite` plugin and `@import "tailwindcss"`. Peer accepts Vite 8. No conflict.
- Tailwind theme: https://tailwindcss.com/docs/theme — `@theme inline` so utilities keep pointing at the CSS variables.
- Fontsource Inter: npm package, import `@fontsource-variable/inter`. Files are in the package. No network at runtime.
- better-sqlite3-multiple-ciphers README and `docs/api.md`: `pragma`, `key(Buffer)`. Raw key form is the `x'hex'` pragma, not `key(Buffer)`, which the API page shows with a password buffer.
- SQLite3MultipleCiphers SQL pragmas: https://utelle.github.io/SQLite3MultipleCiphers/docs/configuration/config_sql_pragmas/ — raw key example.
- libsodium pwhash: https://doc.libsodium.org/password_hashing/default_phf — `crypto_pwhash`, `ALG_ARGON2ID13`, INTERACTIVE and MODERATE limits.
- libsodium-wrappers-sumo 0.8.4 types: encrypt argument order is message, additional data, secret nonce, public nonce, key.
