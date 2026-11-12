# Ward — Product Requirements & Agent Build Guide

**Version:** 1.0 · **Date:** 2026-11-12 · **Owner:** Miguel · **Audience:** the Cursor agent (and Miguel)

> Ward is a private, local-first desktop app that combines a password vault with a personal "Life OS": notes, tasks, folders, favorites, income records, backups, and recovery. Everything lives on the user's machine, encrypted. No accounts, no cloud, no telemetry.

---

## 0. How the agent must use this document

Read this whole file before writing any code. Then follow these rules for the entire project.

### 0.1 Operating protocol (non-negotiable)

1. **One phase at a time.** Build only the phase the user explicitly starts ("GO PHASE N"). Never begin the next phase on your own, even if the current one looks finished.
2. **Plan first.** At the start of each phase, output: (a) a plan of at most 10 lines, (b) the exact list of files you will create or modify, (c) any assumption you are making. Then build.
3. **Verify before claiming done.** At the end of each phase, run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run dev` (launch the app). Output a **Verification Report** (template in Appendix B). A phase is done only when every item in its **Gate** passes. If something fails, fix it or report it honestly. Never write "should work".
4. **Full files only.** When you create or change a file, output the complete file contents, ready to copy and paste. No "...rest unchanged" placeholders, no partial snippets.
5. **No drip-feeding, no over-explaining.** Be direct. Report what changed and what the gate results are. Skip lectures.
6. **Ask only when needed.** If something is genuinely ambiguous and a wrong guess would be costly, ask. Batch all questions into one message (maximum 3). If this document already answers it, do not ask.
7. **Library verification rule.** Before using any library, check its current official documentation. Pin exact versions in `package.json` after installing. This document names libraries and approaches but does not guarantee exact APIs. **If the library's current docs conflict with this document, the docs win for API details, and this document wins for product behavior and security design.** Flag the conflict in your plan.
8. **Never invent cryptography.** Use only the primitives and flows in Section 4. If you think a change is needed, stop and ask.
9. **Scope discipline.** Anything listed under Non-goals (1.4) is out of scope. Do not add features, dependencies, or network calls that this document does not call for.
10. **Never log, print, or persist secrets** (master password, recovery key, vault key, entry passwords, decrypted note bodies) anywhere: console, files, crash reports, test snapshots, error messages.

### 0.2 Document precedence

Section 4 (Security) > Section 5 (Data model) > Section 6 (Features) > Section 7 (Design) > Section 8 (Phases). If two sections conflict, follow the earlier one and flag the conflict.

### 0.3 Assumptions (change these before Phase 0 if wrong)

- **Primary OS:** Windows 10/11. Code must stay cross-platform (no Windows-only APIs outside clearly isolated files), and macOS/Linux builds come later.
- **Package manager:** npm.
- **Shell:** Electron (not Tauri). Reason: matches the existing React/Node skill set.
- **DB encryption:** whole-database encryption via SQLCipher-compatible SQLite, with a Phase 0 spike proving it works. Fallback if the spike fails is in 2.2.
- **Default currency:** PHP (₱), configurable.
- **Language:** TypeScript with `strict: true` everywhere.

### 0.4 Process

Ward is built in phase-gated increments. This document is the up-front spec. Each phase is a mini-cycle: plan, build, test, gate, Miguel's sign-off.

| SDLC stage | Where it lives |
|---|---|
| Planning | §1–2 |
| Requirements | §6, with IDs and acceptance criteria |
| Design | §3–5 and §7 |
| Build | Phases 0–11 |
| Test | That phase's gate, plus §9 |
| Deploy | Phase 12 |
| Maintain | A post-v1 backlog for Ward 1.1 |

**Step stops.** Do one numbered item from that phase's Prompt in §8, then stop. `GO PHASE N` runs the next unfinished step of phase N only. `GATE` runs `/ward-phase-gate` and produces the Verification Report (Appendix B). The next phase starts only when Miguel types `GO PHASE N+1`.

**Conflict.** If this section and §0.1, or a phase Prompt in §8, disagree on stop granularity, this section wins: stop after every numbered step, not only at the end of the phase. Section 4 still wins on security, cryptography, and the threat model. The precedence in §0.2 is unchanged.

**Git.** One branch per phase. After Miguel accepts the gate, the tag name is `phase-N-done`. The agent suggests the tag and a commit message. It does not create the tag, the commit, or a push unless Miguel asks in that message.

**Shape of the build.** Phases 0–3 are bottom-up: shell, crypto, database, session. Phase 4 is the design system. Phases 5–10 are vertical slices; each feature works end to end when its gate passes. Phase 11 is the security center and settings. Phase 12 ships.

The commands that carry this process live in `.cursor/skills/`. The always-on persona is `.cursor/rules/ward-persona.mdc`. The always-on technical rules are `.cursor/rules/ward.mdc`.

---

## 1. Product

### 1.1 Summary

Ward replaces a scattered setup (browser-saved passwords, loose notes, scattered to-do apps, a spreadsheet of freelance income) with one local, encrypted workspace that opens fast, works offline, and never sends data anywhere.

### 1.2 User

A single user: a student and freelancer who is technically capable, keyboard-friendly, privacy-conscious, and the only person using the device profile. No multi-user, no sharing, no sync in v1.

### 1.3 Goals (v1)

1. Securely store and retrieve credentials with fast copy, reveal, search, and generation.
2. Keep notes, tasks, and income records in the same encrypted vault, with shared folders, favorites, search, and trash.
3. Make backups and recovery safe and obvious, because local-first means the user is the only safety net.
4. Feel premium: calm, fast, keyboard-first, with purposeful motion that never gets in the way.
5. Be honest about security: clear locked/unlocked states, no false promises in the UI copy.

### 1.4 Non-goals (v1)

- Cloud sync, accounts, or any network feature (including breach-check APIs, update pings, analytics, crash reporting).
- Browser extension or autofill.
- Mobile app.
- Multi-user or sharing.
- TOTP/2FA code generation, passkeys, file attachments.
- Rich-text/WYSIWYG notes (Markdown only).
- Recurring tasks, calendar integration, invoicing/PDF generation, tax features.
- Custom cryptography of any kind.

### 1.5 Product principles

1. **Local and private by default.** If a feature needs the network, it is out of scope.
2. **Safe by default, fast by default.** The secure path is the easy path.
3. **Never lose the user's data.** Destructive actions are soft (trash) or confirmed, and restore is tested.
4. **Keyboard first, mouse friendly.** Every action reachable by keyboard.
5. **Quiet design.** Motion and color communicate state, they do not decorate.

### 1.6 Success criteria

- Cold start to lock screen under 2 seconds on a mid-range laptop.
- Unlock (including KDF) feels deliberate but under 1.5 seconds on the dev machine.
- Search results appear within 100 ms for 5,000 entries.
- Restore from a backup on a fresh install recovers 100% of data (tested).
- Zero network requests at runtime (verified in Phase 12).

---

## 2. Decisions

### 2.1 Stack (defaults)

| Area | Choice | Notes |
|---|---|---|
| Shell | Electron | Hardened per 4.7 |
| Scaffold | `electron-vite` (React + TS template) | Verify the current create command in its docs |
| UI | React 18+, Vite, Tailwind CSS | |
| Animation | Framer Motion (`motion`) | Bundled via npm, no CDN |
| State | Zustand | Renderer UI state only |
| Validation | Zod | Shared schemas for IPC and forms |
| Forms | React Hook Form + `@hookform/resolvers` | |
| DB | `better-sqlite3-multiple-ciphers` | Whole-DB encryption, see 2.2 |
| Crypto | `libsodium-wrappers-sumo` | KDF + AEAD key wrapping only |
| Password strength | `@zxcvbn-ts/core` + language packs | Local only |
| IDs | ULID (`ulid`) | Sortable, text |
| Dates | `date-fns` | |
| Primitives | Radix UI (via shadcn/ui patterns) | Dialog, Dropdown, Tooltip, Tabs, etc. |
| Command palette | `cmdk` | |
| Drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Tasks, folders |
| Tables | `@tanstack/react-table` | Income |
| Charts | Recharts | Income dashboard |
| Icons | `lucide-react` | |
| Fonts | `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` | Bundled locally, no Google Fonts |
| Markdown | `react-markdown` + `remark-gfm`, sanitized | Notes preview |
| Unit tests | Vitest | |
| E2E | Playwright (Electron mode) | |
| Packaging | `electron-builder` | |
| Lint/format | ESLint + Prettier + `eslint-plugin-security` | |

### 2.2 Database encryption: decision and fallback

**Chosen:** the whole SQLite file is encrypted with a random 256-bit **Vault Key (VK)**. Benefits: all columns are protected (including titles and metadata), and SQL search works while unlocked.

**Phase 0 spike must prove:** `better-sqlite3-multiple-ciphers` builds and runs under the pinned Electron version on Windows, opens an encrypted DB with a raw key, rejects a wrong key, and survives `electron-builder` packaging (native module unpacked from asar).

**Fallback (only if the spike fails and the user approves):** plain `better-sqlite3` with **field-level encryption** of sensitive columns (password, notes body, titles, income amounts) using XChaCha20-Poly1305 and a per-row random nonce. This loses SQL search over encrypted columns, so search would run in memory after unlock. Do not switch without asking.

### 2.3 Rejected options (do not reintroduce)

- Python/FastAPI backend: a local-first app has no server.
- CDN-loaded scripts or fonts: the app must work offline and a strict CSP blocks them.
- Storing the master password or VK on disk, in `localStorage`, or in the OS keychain (v1).
- `Math.random` for anything security-related.

---

## 3. Architecture

### 3.1 Process model

- **Main process** owns: crypto, the encrypted DB, vault session state, clipboard, file dialogs, backup/restore, auto-lock timers, power events. It is the only place plaintext secrets and the VK exist.
- **Preload script** exposes a minimal, typed `window.ward` API using `contextBridge`. No raw `ipcRenderer`, no Node APIs.
- **Renderer** is a pure UI. It holds view state only, and receives decrypted data only for the item(s) currently displayed. It never receives the VK, the master password after submission, or the recovery key except at the single moment it is displayed once.

### 3.2 Repository structure

```
ward/
├─ PRD.md                      (this file, renamed)
├─ .cursor/rules/ward.mdc     (Appendix A)
├─ package.json
├─ electron.vite.config.ts
├─ electron-builder.yml
├─ tsconfig.json / tsconfig.node.json / tsconfig.web.json
├─ src/
│  ├─ main/
│  │  ├─ index.ts              (app lifecycle, window creation)
│  │  ├─ window.ts             (BrowserWindow + hardening)
│  │  ├─ security/
│  │  │  ├─ csp.ts
│  │  │  └─ navigation-guard.ts
│  │  ├─ crypto/
│  │  │  ├─ sodium.ts          (init + helpers)
│  │  │  ├─ kdf.ts             (Argon2id)
│  │  │  ├─ aead.ts            (wrap/unwrap)
│  │  │  ├─ recovery-key.ts
│  │  │  └─ vault-header.ts    (read/write/validate header)
│  │  ├─ db/
│  │  │  ├─ open.ts            (encrypted open/close)
│  │  │  ├─ migrations/        (0001_init.sql, ...)
│  │  │  ├─ migrate.ts
│  │  │  └─ repos/             (entries, folders, notes, tasks, income, settings, search)
│  │  ├─ session/
│  │  │  ├─ session.ts         (state machine, holds VK)
│  │  │  ├─ auto-lock.ts
│  │  │  └─ throttle.ts        (failed-attempt delay)
│  │  ├─ ipc/
│  │  │  ├─ register.ts        (registers all handlers)
│  │  │  ├─ guard.ts           (requires unlocked, validates sender)
│  │  │  └─ handlers/*.ts
│  │  ├─ services/             (clipboard, backup, import-csv, security-audit, generator)
│  │  ├─ prefs.ts              (ui-prefs.json: theme, motion, window bounds; readable while locked)
│  │  └─ paths.ts              (userData locations)
│  ├─ preload/
│  │  └─ index.ts
│  ├─ shared/
│  │  ├─ ipc-contract.ts       (channel names + Zod schemas + result type)
│  │  ├─ schemas/              (entry, note, task, income, settings...)
│  │  └─ types.ts
│  └─ renderer/
│     ├─ index.html
│     └─ src/
│        ├─ main.tsx / App.tsx
│        ├─ styles/ (tokens.css, globals.css)
│        ├─ design/ (motion.ts, tokens.ts, theme.ts, primitives/)
│        ├─ stores/ (session.ts, ui.ts, ...)
│        ├─ features/
│        │  ├─ lock/ onboarding/ vault/ notes/ tasks/ income/
│        │  ├─ dashboard/ favorites/ trash/ security-center/
│        │  ├─ backup/ settings/ search/ palette/
│        └─ lib/ (ipc client wrapper, format, a11y helpers)
└─ tests/
   ├─ unit/ (crypto, db, repos)
   └─ e2e/
```

### 3.3 Layering rules

1. Renderer → `window.ward` → IPC → handler → service/repo → DB. **Never skip a layer.**
2. Handlers validate input with Zod (from `shared/`), call services/repos, and return a typed result.
3. Repos are the only code that runs SQL. Always parameterized statements, never string-built SQL.
4. Renderer components never call `window.ward` directly. They use typed hooks/queries in `lib/`.
5. `shared/` has no Node or DOM imports.

### 3.4 IPC contract

All calls are request/response using `ipcRenderer.invoke` / `ipcMain.handle`. Every response is:

```ts
type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: { code: ErrorCode; message: string } };
type Result<T> = Ok<T> | Err;
```

`ErrorCode` is a closed union (e.g. `LOCKED`, `INVALID_INPUT`, `WRONG_PASSWORD`, `NOT_FOUND`, `THROTTLED`, `CORRUPT_VAULT`, `UNSUPPORTED_VERSION`, `IO_ERROR`, `INTERNAL`). Messages are safe to display and **never** contain secrets or stack traces.

Each handler: (1) checks the sender frame is the app's own window, (2) validates the payload with Zod, (3) if the channel is not in the allowlist for the locked state, rejects with `LOCKED`, (4) executes.

**Channels allowed while locked:** `vault:status`, `vault:create`, `vault:unlock`, `vault:unlockWithRecovery`, `app:getVersion`, `prefs:get`, `prefs:set`. Everything else requires an unlocked session. (`prefs:*` covers only non-sensitive UI preferences: theme, reduced motion, window bounds, sidebar state. They live in `ui-prefs.json`, not the encrypted DB, so the lock screen can render in the user's theme.)

**Channel list (namespace:action):**

- `vault:status | create | unlock | unlockWithRecovery | lock | changePassword | rotateRecoveryKey | verifyPassword`
- `folders:list | create | update | delete | reorder`
- `entries:list | get | create | update | trash | restore | purge | setFavorite | revealSecret | copySecret | history | generatePassword | analyzePassword`
- `notes:list | get | create | update | trash | restore | purge | setFavorite | setPinned`
- `tasks:list | create | update | setStatus | reorder | trash | restore | purge | setFavorite`
- `income:list | create | update | trash | restore | purge | summary`
- `search:query`
- `trash:list | emptyExpired | emptyAll`
- `settings:get | set` (encrypted DB settings, unlocked only)
- `prefs:get | set` (plain `ui-prefs.json`, allowed while locked)
- `backup:create | list | restore | verify | chooseFolder`
- `import:csvPreview | csvCommit`
- `security:audit`
- Main → renderer events: `session:locked` (reason), `clipboard:cleared`, `backup:completed`.

**Secrets rule:** list endpoints never return passwords. `entries:get` returns the entry with `password: null` plus `hasPassword: true`. The password is returned only by `entries:revealSecret` (renderer auto-hides after 15 s) or copied **inside the main process** by `entries:copySecret`, so it never has to enter the renderer to be copied.

---

## 4. Security specification

### 4.1 Threat model

**In scope (we defend against):**
- Someone obtaining the vault files (stolen laptop, backup drive, cloud-synced folder) without the master password: must get ciphertext only.
- Casual access to an unlocked-but-idle machine: auto-lock limits the window.
- Malicious content rendering in the UI (XSS via imported CSV, notes Markdown, URLs): sanitize, strict CSP, no remote content.
- Renderer compromise: the renderer cannot reach Node, the filesystem, or the VK.
- Accidental data loss: backups, soft delete, safe restore.

**Out of scope (state this honestly in the UI/README):**
- Malware or a keylogger running as the same OS user.
- Memory forensics on a running, unlocked session. JS cannot guarantee memory zeroization.
- A weak master password: the app guides but cannot force strength.
- Physical coercion.

### 4.2 Key hierarchy

```
Master Password ──Argon2id(salt, params)──► KEK (32 bytes)
Recovery Key (256-bit random) ─────────────► RKEK (32 bytes, via BLAKE2b/generichash with context)
Vault Key (VK, 32 random bytes) — encrypts the database
   ├─ wrapped by KEK   → stored in header as wrappedByPassword
   └─ wrapped by RKEK  → stored in header as wrappedByRecovery
```

- VK is generated once at vault creation with a CSPRNG and never changes unless the user explicitly runs "Re-encrypt vault" (post-v1).
- **Changing the master password** = derive new KEK, re-wrap VK. The DB is not re-encrypted.
- **Recovery** = unwrap VK with RKEK, then immediately require setting a new master password.
- A wrong password/key makes AEAD unwrap fail. That failure is the verification, so no separate password hash is stored.

### 4.3 Primitives and parameters

| Purpose | Primitive | Parameters |
|---|---|---|
| Password → KEK | Argon2id (libsodium `crypto_pwhash`, ALG ARGON2ID13) | 16-byte random salt; start at libsodium `MODERATE` limits (about 256 MiB memory), tune so unlock takes about 0.7–1.2 s on the dev machine; **store params in header** so they can be raised later. Never go below `INTERACTIVE`. |
| Key wrapping | XChaCha20-Poly1305 IETF AEAD (libsodium) | Fresh random 24-byte nonce per wrap; header JSON fields (version, kdf params) bound as associated data |
| Recovery key | 32 random bytes | Displayed as Base32 (Crockford or RFC 4648) in groups of 4, e.g. `ABCD-EFGH-…`; shown **once** |
| Recovery key → RKEK | `crypto_generichash` (BLAKE2b) with a fixed context string | Domain-separated from other uses |
| DB at rest | SQLCipher-compatible cipher via `better-sqlite3-multiple-ciphers` | Raw 256-bit VK supplied as a key, no passphrase KDF at the DB layer |
| Randomness | `sodium.randombytes_buf` in main; `crypto.getRandomValues` only for non-secret UI uses | Never `Math.random` |

> If libsodium or the cipher library changes these names/constants, follow current docs and report the difference. Do not weaken the parameters to make something work.

### 4.4 Files on disk

Located under Electron `app.getPath('userData')/vault/` (configurable path is post-v1):

- `vault.header.json` — **unencrypted**, integrity-protected by AEAD associated data:

```json
{
  "format": "ward-vault",
  "formatVersion": 1,
  "createdAt": "ISO-8601",
  "kdf": { "alg": "argon2id13", "salt": "<base64>", "opslimit": 0, "memlimit": 0 },
  "wrappedByPassword": { "nonce": "<base64>", "ciphertext": "<base64>" },
  "wrappedByRecovery": { "nonce": "<base64>", "ciphertext": "<base64>" }
}
```

- `ward.db` — encrypted SQLite database.
- `ward.db-wal` / `-shm` — handled per cipher library guidance (verify they are protected, or use `journal_mode` that avoids leaking plaintext; document the result of this check in Phase 2).
- Writes to the header are **atomic** (write temp file, fsync, rename). Keep `vault.header.json.bak` of the previous version after password changes until the next successful unlock.

### 4.5 Session state machine (main process)

States: `NO_VAULT → LOCKED → UNLOCKED → LOCKED`.

- `UNLOCKED` holds the VK in a `Buffer` and an open DB handle. `LOCKED` holds neither.
- **Lock triggers:** user action; idle timeout (default 5 min, options 1/5/15/30/never-not-recommended); window minimized (setting, default on); OS `lock-screen` and `suspend` events via `powerMonitor`; app quit.
- **On lock:** cancel clipboard timer (and clear clipboard if it still holds our value), close DB, `sodium.memzero` the VK buffer, drop references, emit `session:locked` to the renderer, which must clear all stores holding vault data and revoke any object URLs.
- **Idle detection:** based on renderer-reported user activity (throttled pings) plus main-side timer. A hidden/minimized window counts as idle.
- **Wrong password throttling:** after 3 consecutive failures, enforce an escalating delay (2 s, 5 s, 15 s, 30 s, capped at 60 s), tracked in memory and reset on success. Be clear in the UI: this slows UI guessing only; real protection against offline attacks is the Argon2id cost and password strength.

### 4.6 Clipboard handling

- Copy happens in main via Electron `clipboard`. Remember a hash of what was copied.
- After 30 s (setting: 10/30/60/never), if the clipboard still equals the copied value, clear it. If the user copied something else meanwhile, do not touch it.
- On Windows, mark clipboard data to be excluded from clipboard history/cloud sync where the platform allows (verify via current Electron docs or a small native-free approach; if not possible, document the limitation in Settings).
- UI shows a countdown ring on the copy button while the timer runs.

### 4.7 Electron hardening checklist

All must be true and covered by an automated test or a documented manual check:

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, `allowRunningInsecureContent: false`, `enableRemoteModule` absent, `webviewTag: false`.
- Preload exposes only the typed API; no generic `send`/`invoke` passthrough.
- Strict CSP (set via response headers or meta in production): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`. Dev mode may relax for HMR only, behind an `isDev` check.
- `will-navigate` and `setWindowOpenHandler` deny everything. External links open via a validated, allowlisted `shell.openExternal` path (only `https:` URLs, after a confirm dialog), never automatically.
- Permission requests (camera, mic, geolocation, notifications, etc.) denied by default.
- No `eval`, no `new Function`, no `dangerouslySetInnerHTML` without sanitizer, no remote `<script>`.
- DevTools disabled in production builds.
- Single instance lock (`app.requestSingleInstanceLock`).
- Screen capture protection: `win.setContentProtection(true)` as a setting (default on) so screenshots and capture tools show blank content where the OS supports it.
- Auto-updater: **not included in v1**.
- Production build has no source maps shipped with the installer.

### 4.8 Logging and errors

- Use a tiny logger that **allowlists fields**. Never log payloads of IPC calls. Log only channel name, result code, and duration.
- Error messages shown to the user are generic and actionable. Internal errors map to `INTERNAL`.
- Tests assert that known secret strings never appear in captured log output.

### 4.9 Honest memory handling

Hold secrets in `Buffer`/`Uint8Array` where possible and `memzero` them when done. Do not promise perfect zeroization, since JS strings are immutable. Minimize lifetimes: the revealed password string exists in the renderer only while shown.

### 4.10 Generator and strength rules

- Random password generator runs in **main** using libsodium randomness with rejection sampling (no modulo bias). Length 8–128 (default 20), toggles: lowercase, uppercase, digits, symbols, exclude ambiguous (`O0Il1`).
- Passphrase mode: bundled offline word list (verify the license of whichever list is chosen, e.g. EFF long list), 4–10 words, separator option.
- Strength meter uses `@zxcvbn-ts`, computed in the renderer **on the value being typed**, never persisted. Entry audit (reused/weak) runs in main.

---

## 5. Data model

SQLite, migrations in `src/main/db/migrations/NNNN_name.sql`, applied in order inside a transaction, tracked by `PRAGMA user_version`. Foreign keys ON. All timestamps are ISO-8601 UTC strings. IDs are ULIDs. Money is **integer minor units** (centavos), never floats.

```sql
-- 0001_init.sql
CREATE TABLE folders (
  id           TEXT PRIMARY KEY,
  parent_id    TEXT REFERENCES folders(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT,              -- token name, e.g. 'indigo'
  icon         TEXT,              -- lucide icon name
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE entries (            -- password vault items
  id                   TEXT PRIMARY KEY,
  folder_id            TEXT REFERENCES folders(id) ON DELETE SET NULL,
  title                TEXT NOT NULL,
  username             TEXT,
  password             TEXT,
  url                  TEXT,
  notes                TEXT,
  favorite             INTEGER NOT NULL DEFAULT 0,
  password_changed_at  TEXT,
  last_used_at         TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  deleted_at           TEXT
);
CREATE INDEX idx_entries_folder ON entries(folder_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_entries_fav ON entries(favorite) WHERE deleted_at IS NULL;

CREATE TABLE entry_history (      -- previous passwords, max 10 per entry
  id          TEXT PRIMARY KEY,
  entry_id    TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  password    TEXT NOT NULL,
  changed_at  TEXT NOT NULL
);

CREATE TABLE notes (
  id          TEXT PRIMARY KEY,
  folder_id   TEXT REFERENCES folders(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  body_md     TEXT NOT NULL DEFAULT '',
  pinned      INTEGER NOT NULL DEFAULT 0,
  favorite    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT
);

CREATE TABLE tasks (
  id            TEXT PRIMARY KEY,
  folder_id     TEXT REFERENCES folders(id) ON DELETE SET NULL,
  parent_id     TEXT REFERENCES tasks(id) ON DELETE CASCADE,  -- subtasks, one level only
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL CHECK (status IN ('todo','doing','done')) DEFAULT 'todo',
  priority      TEXT NOT NULL CHECK (priority IN ('low','medium','high')) DEFAULT 'medium',
  due_at        TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  favorite      INTEGER NOT NULL DEFAULT 0,
  completed_at  TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT
);

CREATE TABLE income (
  id            TEXT PRIMARY KEY,
  folder_id     TEXT REFERENCES folders(id) ON DELETE SET NULL,
  received_on   TEXT NOT NULL,             -- YYYY-MM-DD
  client        TEXT NOT NULL,
  description   TEXT,
  amount_minor  INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency      TEXT NOT NULL DEFAULT 'PHP',
  category      TEXT,
  status        TEXT NOT NULL CHECK (status IN ('pending','paid')) DEFAULT 'paid',
  reference     TEXT,
  notes         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT
);
CREATE INDEX idx_income_date ON income(received_on) WHERE deleted_at IS NULL;

CREATE TABLE settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL            -- JSON-encoded
);
```

**Search:** an FTS5 virtual table over entries(title, username, url), notes(title, body_md), tasks(title, description), income(client, description), kept in sync via triggers (or rebuilt on demand). Entry **passwords are never indexed**. Verify FTS5 is compiled into the chosen SQLite build in Phase 2.

**Trash:** soft delete via `deleted_at`; items purge automatically after 30 days (setting) on unlock, or manually.

**Entry history:** on password change, insert the old password into `entry_history` and trim to the latest 10.

---

## 6. Feature specifications

Each requirement has an ID. Acceptance criteria (AC) are testable.

### 6.1 Onboarding and vault creation (ONB)

- **ONB-1** First launch with no vault shows a welcome screen: what Ward is, that data stays local, and that **losing both the master password and the recovery key means permanent data loss**.
- **ONB-2** Create master password: min 12 characters enforced, live zxcvbn meter, confirm field, show/hide toggle. Block scores below 3 with a clear reason; allow override only after an explicit "I understand" checkbox for score 2.
- **ONB-3** Generate and display the recovery key once. Require the user to (a) copy or save it (print/save-as-text options), and (b) confirm by re-entering 2 random groups. Cannot proceed until confirmed.
- **ONB-4** Vault files created atomically. On any failure, no partial vault is left behind.
- **AC:** Creating a vault, quitting, and relaunching shows the lock screen; the correct password unlocks; a wrong one shows a generic error and throttling after 3 failures.

### 6.2 Lock screen (LOCK)

- **LOCK-1** Single centered password field, unlock button, "Use recovery key" link. Autofocus. Enter submits.
- **LOCK-2** Shows generic error on failure ("That password didn't work"), never indicating whether the header or the password failed. Shows throttle countdown when active.
- **LOCK-3** Shows `CORRUPT_VAULT` / `UNSUPPORTED_VERSION` states with a "Restore from backup" action.
- **LOCK-4** Recovery flow: enter recovery key → on success must set a new master password → new recovery key is issued and displayed (same rules as ONB-3).

### 6.3 Vault / passwords (VAULT)

- **VAULT-1** List with title, username, URL host, favorite star, folder chip. Virtualized if over 200 rows.
- **VAULT-2** Detail pane shows fields; password masked as `••••••••••••` (fixed width, no length leak). Actions: Reveal (auto-hide 15 s), Copy username, Copy password (clipboard timer), Open URL (confirm), Edit, Favorite, Move to folder, Delete (to trash), History.
- **VAULT-3** Create/Edit form: title (required), username, password with generator popover and strength meter, URL (validated, `https:`/`http:` only), notes, folder. Unsaved-changes guard.
- **VAULT-4** Generator: all options in 4.10, live preview, "Regenerate", "Use this password". Remember last-used options in settings.
- **VAULT-5** Password history: shows up to 10 previous passwords (masked, reveal/copy on demand) with timestamps.
- **VAULT-6** Duplicate-URL warning on create (non-blocking).
- **VAULT-7** `last_used_at` updated on copy/reveal.
- **AC:** Round trip create → lock → unlock → entry exists with identical password; passwords never appear in list payloads (test asserts this at the IPC layer).

### 6.4 Folders (FOLD)

- **FOLD-1** Nested folders (max depth 3), color + icon from tokens. Folders are shared across item types: one folder can contain entries, notes, tasks, and income.
- **FOLD-2** Create, rename, recolor, reorder (drag), delete. Deleting a folder moves its items to "Unfiled" (confirm dialog states the count).
- **FOLD-3** Sidebar shows counts per folder. "Unfiled" is a built-in virtual view.

### 6.5 Notes (NOTE)

- **NOTE-1** Markdown editor (plain textarea/CodeMirror-lite, monospace option) with live preview toggle and split view. Sanitized rendering (no raw HTML, links get `rel=noreferrer`, no images from remote URLs).
- **NOTE-2** Pin, favorite, move to folder, trash. Autosave debounced at 800 ms with a quiet "Saved" indicator.
- **NOTE-3** Word/character count, last-edited time.
- **AC:** A note containing `<script>alert(1)</script>` renders as inert text.

### 6.6 Tasks (TASK)

- **TASK-1** Views: List, Board (todo/doing/done columns), and Today/Upcoming filters.
- **TASK-2** Quick-add input (Enter to add) with natural shortcuts for priority (`!`, `!!`, `!!!`) and due date typed via a picker (no NLP in v1).
- **TASK-3** Subtasks (one level), progress indicator on the parent.
- **TASK-4** Drag to reorder and move across board columns. Keyboard alternative for moving items must exist.
- **TASK-5** Overdue styling (color + icon, never color alone). Completing a task sets `completed_at` and animates per 7.5.
- **TASK-6** Favorite, folder assignment, trash.

### 6.7 Income (INC)

- **INC-1** Table with date, client, description, category, status, amount. Sort, filter (date range, client, status, category), column visibility.
- **INC-2** Add/edit via side sheet. Amount input accepts `1,234.50`, stores integer centavos. Validation rejects negatives and more than 2 decimals.
- **INC-3** Summary strip: this month, last month, year-to-date, pending total. Chart: monthly totals for the last 12 months; breakdown by client (top 5) and category.
- **INC-4** Export filtered view to CSV (plaintext, with a warning dialog, since it leaves the encrypted vault).
- **AC:** 1,000 rows scroll smoothly; totals match a hand-computed fixture in tests; no floating point drift (e.g. 0.1 + 0.2 cases covered).

### 6.8 Favorites, Dashboard, Search, Trash

- **FAV-1** Favorites view aggregates favorited items across all modules, grouped by type.
- **DASH-1** Dashboard ("Today"): greeting, tasks due today/overdue, pinned notes, recently used entries, income this month, security score summary, backup status (days since last backup, warning when over 14).
- **SRCH-1** Global search (Ctrl/Cmd+F focuses the in-view search, Ctrl/Cmd+K opens the palette). Results grouped by type, keyboard navigable, highlighted matches, under 100 ms for 5,000 items.
- **TRASH-1** Trash lists all soft-deleted items with deletion date, restore, purge. "Empty trash" requires typing the word `DELETE`.

### 6.9 Security center (SEC)

- **SEC-1** Local audit only: weak passwords (zxcvbn score below 3), reused passwords (hash comparison in main, never display other items' passwords), old passwords (not changed in over 180 days), entries missing a password.
- **SEC-2** Each finding links to the entry and shows a fix action.
- **SEC-3** Shows an overall score and explains how it's computed. No network checks.

### 6.10 Backup, recovery, import (BAK)

- **BAK-1** Manual backup: creates a single `.ward-backup` file = magic bytes + format version + the encrypted DB (via SQLite online backup into a temp file) + the current header + SHA-256 checksum of the payload. Backups are already encrypted, so they need the master password or recovery key from the time of backup.
- **BAK-2** Auto-backup: after lock or on a schedule (daily/weekly/off) into a user-chosen folder, keep the last N (default 10), prune older ones, show last success time and failures.
- **BAK-3** Verify backup: checks structure and checksum without needing the password; optional full verify by entering the password.
- **BAK-4** Restore: pick file → verify → ask for that backup's password/recovery key → create a **safety backup of the current vault** → replace atomically → require relock. A failed restore must leave the original vault intact.
- **BAK-5** CSV import (Chrome and Bitwarden formats): preview with column mapping, duplicates flagged, sanitize all fields, commit in one transaction, summary of imported/skipped. Warn the user to delete the CSV afterward.
- **BAK-6** Change master password (requires current password) and rotate recovery key (requires current password).
- **AC:** Restore into a brand-new profile on a second run recovers every entity count exactly; tampering with one byte of a backup is detected by verify.

### 6.11 Settings (SET)

Auto-lock timeout, lock on minimize, lock on system lock/sleep, clipboard clear delay, content protection, theme (dark/light/system, animated per 7.5.1; stored in `ui-prefs.json`, not the DB, so the lock screen can use it), reduce motion (system/on/off; same storage), default currency, backup schedule/location/retention, trash retention, generator defaults, "About & privacy" screen stating plainly what is and isn't protected (mirror 4.1).

### 6.12 Command palette (CMD)

Ctrl/Cmd+K. Actions: new entry/note/task/income, go to any view or folder, lock now, toggle theme, search entries/notes/tasks, run backup, open settings. Fuzzy match, recent actions on top, full keyboard operation.

---

## 7. Design system and UX

> Written to be implemented literally. Where a value is given, use it. Where it says "judgment", apply the principles in 7.1.

### 7.1 Design direction

**Concept: "the quiet vault."** A calm, dense-but-breathable productivity tool. Deep ink background, one restrained indigo accent, generous contrast, hairline borders instead of heavy shadows. Information hierarchy is led by typography and spacing, not boxes. Motion is physical (springs, short durations) and always explains a change of state.

Design principles:
1. **Clarity over decoration.** If an element doesn't help a task or convey state, remove it.
2. **Density with air.** Rows are compact (44 px), but groups are separated by space, not lines.
3. **State is always visible.** Locked/unlocked, saved/unsaved, copied/clearing-in-Ns.
4. **Secrets feel guarded.** Masked by default, revealed deliberately, auto-hidden.
5. **Consistency through tokens.** No raw hex or magic numbers in components.

### 7.2 Tokens

Implement as CSS variables in `styles/tokens.css`, mapped into the Tailwind theme. Dark is the default.

**Color: dark**

| Token | Value | Use |
|---|---|---|
| `--bg-base` | `#0B0D12` | App background |
| `--bg-surface` | `#11141B` | Sidebar, panes |
| `--bg-elevated` | `#171B24` | Cards, popovers, inputs |
| `--bg-hover` | `#1D222D` | Row/control hover |
| `--bg-active` | `#252B38` | Pressed / selected row |
| `--border-subtle` | `#232937` | Hairlines |
| `--border-strong` | `#323A4B` | Inputs, focus-adjacent |
| `--text-primary` | `#E8EBF2` | Body, titles |
| `--text-secondary` | `#A3ABBD` | Labels, metadata |
| `--text-muted` | `#7A8398` | Placeholders, hints (≥4.5:1 on base) |
| `--accent` | `#7C8CFF` | Primary actions, focus ring, selection |
| `--accent-hover` | `#96A3FF` | |
| `--accent-pressed` | `#6272F0` | |
| `--on-accent` | `#0B0D12` | Text on accent |
| `--success` | `#3DDC97` | Saved, paid, strong |
| `--warning` | `#F5B94B` | Pending, aging, medium |
| `--danger` | `#FF6B6B` | Delete, weak, overdue |
| `--focus-ring` | `#7C8CFF` | 2 px, 2 px offset |

**Color: light** (secondary, same token names): base `#F6F7FA`, surface `#FFFFFF`, elevated `#FFFFFF` with `--border-subtle #E3E6EE`, text-primary `#12151C`, text-secondary `#4A5265`, text-muted `#667085`, accent `#4F5FE8`, on-accent `#FFFFFF`. **Verify every pairing meets WCAG AA with a contrast checker and adjust if not.**

**Theming mechanism:** the active theme is `data-theme="dark|light"` on `<html>` (plus `color-scheme`). Light tokens are overrides under `:root[data-theme="light"]`. Components consume tokens only, so a theme flip is one attribute change. The user preference (`dark | light | system`) is stored in `ui-prefs.json`; `system` resolves via `prefers-color-scheme`. The change itself is animated as a circular reveal, specified in 7.5.1.

**Folder/label palette:** indigo, violet, pink, rose, orange, amber, lime, emerald, teal, sky, slate. Each has a 500 value for dots/icons and a 12%-alpha tint for chips. Color is never the only signal.

**Typography** (bundled fonts): UI = Inter Variable; secrets, IDs, amounts in tables = JetBrains Mono Variable with `font-variant-numeric: tabular-nums` where relevant.

| Style | Size / line height | Weight |
|---|---|---|
| Caption | 12 / 16 | 500 |
| UI (default) | 13 / 18 | 400–500 |
| Body | 14 / 20 | 400 |
| Subtitle | 16 / 24 | 600 |
| Title | 20 / 28 | 600 |
| Display (lock/welcome) | 28 / 36 | 600 |

Letter-spacing: `-0.01em` on Title and Display. Titles use `text-wrap: balance`.

**Spacing:** 4 px base. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. **Radii:** 6 (inputs, chips), 10 (cards, rows), 14 (modals, sheets), 999 (pills). **Elevation:** `elev-1` = `0 1px 0 rgba(0,0,0,.4)`; `elev-2` (popover) = `0 8px 24px -8px rgba(0,0,0,.5)`; `elev-3` (modal) = `0 24px 64px -16px rgba(0,0,0,.6)`, plus a 1 px `--border-subtle` ring on all raised surfaces because shadows are weak on dark.

### 7.3 Layout

- **Min window:** 960 × 620. Default 1200 × 780. Remember size/position.
- **Shell:** three regions.
  - **Sidebar** 240 px (collapsible to 64 px icon rail, state persisted): vault status/lock button at top, primary nav (Dashboard, Vault, Notes, Tasks, Income, Favorites), Folders tree (with counts), Security center, Trash, Settings pinned bottom.
  - **List pane** 340–420 px (resizable with a 6 px drag handle, snap at 380): search field + filters + list.
  - **Detail pane**: flexible, max readable width 720 px centered for forms/notes.
- **Tasks Board** and **Income table** use the list+detail area as one wide canvas, with a right-side sheet (420 px) for editing.
- **Title bar:** native title bar for v1 (custom frameless is post-v1 polish).
- **Responsive rule:** under 1100 px wide, the detail pane becomes an overlay sheet; under 1000 px, the sidebar auto-collapses.

### 7.4 Component inventory (build as primitives in `design/primitives/`)

Button (primary, secondary, ghost, danger; sm/md; loading), IconButton (with required `aria-label` + tooltip), Input, PasswordInput (mask, reveal, strength bar, generator trigger), Textarea, Select/Combobox, Checkbox, Switch, Segmented control, Tabs, Chip/Badge, Avatar-initial tile (entry favicon substitute: first letter on color from a hash of the title; **no remote favicon fetching**), Tooltip, Popover, Dropdown menu, Dialog, Sheet, Toast, Confirm dialog (with typed confirmation variant), EmptyState, Skeleton, Kbd, ListRow (selectable, roving tabindex), SectionHeader, ProgressRing (clipboard timer), CopyButton (state machine below), StrengthMeter, DatePicker, CurrencyInput.

**CopyButton states:** idle → copying (instant) → copied (icon morphs to a check, label "Copied", success color) → clearing (progress ring around the icon counts down) → idle. Announce "Copied. Clipboard clears in 30 seconds" via a polite live region. Never announce the secret.

### 7.5 Motion specification

Library: Framer Motion. Put all values in `design/motion.ts` and import from there. No ad-hoc durations in components.

```ts
export const dur = { instant: 0.08, fast: 0.15, base: 0.22, slow: 0.32 } as const;
export const ease = {
  standard: [0.2, 0, 0, 1],      // most movements
  decelerate: [0, 0, 0, 1],      // entering
  accelerate: [0.3, 0, 1, 1],    // exiting
} as const;
export const spring = {
  snappy: { type: "spring", stiffness: 420, damping: 34, mass: 0.9 },
  gentle: { type: "spring", stiffness: 260, damping: 28 },
} as const;
```

| Interaction | Behavior | Timing |
|---|---|---|
| Route/view change | Content crossfade + 6 px upward translate on the incoming pane; outgoing fades only | `dur.base`, `ease.decelerate` in / `dur.fast` out |
| Theme switch | Circular reveal from the toggle: dark → light **expands**, light → dark **collapses** back into the toggle, with a small anticipation dot first. Full spec in 7.5.1 | 560 ms total |
| Lock ↔ App | Unlock: lock card scales 1 → 0.97 and fades, app shell fades/rises from 8 px; field shakes (±6 px, 3 oscillations) on wrong password | `dur.slow`; shake 280 ms |
| List item enter | Staggered fade/translate (y 6 → 0), stagger 18 ms, **cap at first 8 items**, no stagger on subsequent updates | `dur.base` |
| List selection | Selection background slides via `layoutId` between rows | `spring.snappy` |
| Detail pane swap | Crossfade with 4 px shift, no layout jump (reserve height with skeleton) | `dur.fast` |
| Dialog | Backdrop fade; panel scale 0.98 → 1 + fade | `dur.base` / exit `dur.fast` |
| Sheet | Slide from right 24 px + fade | `spring.gentle` |
| Toast | Slide up 12 px + fade; auto-dismiss 4 s; pause on hover/focus | `dur.base` |
| Password reveal | Masked dots crossfade to monospace text (same width box, no reflow); auto-hide shows a thin 15 s progress line under the field | `dur.fast` |
| Copy feedback | See CopyButton; icon morph with `AnimatePresence mode="wait"` | `dur.fast` |
| Task complete | Checkbox path draws (pathLength 0 → 1), title strikethrough wipes left-to-right, row collapses after 600 ms delay with height animation | 180 ms + 220 ms |
| Drag and drop | Dragged item lifts (scale 1.02, `elev-2`), drop placeholder expands with `layout`; others reflow with springs | `spring.snappy` |
| Folder expand | Height auto-animate + chevron rotate 90° | `dur.base` |
| Skeleton/loading | Shimmer 1.2 s linear loop, only after 200 ms of waiting (avoid flash) | |
| Chart | Bars grow from baseline on first render only | 400 ms, `ease.decelerate` |
| Empty state | Icon gently floats (±3 px, 4 s loop) | respect reduce motion |

**Rules:**
- Animate `transform` and `opacity` only (plus `height` for collapses via Framer's layout/auto). Never animate `width/height/top/left` directly in lists.
- Durations stay between 80 and 320 ms for UI feedback. Nothing blocks input.
- **Reduced motion:** honor the OS `prefers-reduced-motion` and the Settings override via `MotionConfig reducedMotion`. In reduced mode, replace translate/scale/stagger with simple opacity fades of ≤120 ms and remove loops (shimmer becomes static, floating icons stop).
- Use `AnimatePresence` for mount/unmount, `layout`/`layoutId` for reordering and shared elements, and `LazyMotion` with `domAnimation` to keep the bundle lean.
- **Optional GSAP/Lottie:** allowed **only** for the lock-screen "vault door" moment and empty-state illustrations, and only if installed via npm and bundled (no CDN). Skip them until Phase 12 unless a clear need appears.

### 7.5.1 Theme switch: circular reveal (signature motion)

**Intent.** Switching between dark and light is a physical event, not a color fade. A small circle appears at the toggle, nudges slightly toward the middle of the window, then grows until the new theme floods the whole window. Switching back plays the same motion in reverse: the current theme collapses into a circle that shrinks back into the toggle.

**Direction mapping** (lights on = expand, lights off = collapse; flip `expand` in code if the user prefers the opposite):

| Switch | Effect | Layer being clipped |
|---|---|---|
| Dark → Light | **Expand:** the new (light) view is revealed through a growing circle | `::view-transition-new(root)` grows 0 → full |
| Light → Dark | **Reverse expand (collapse):** the old (light) view is clipped by a shrinking circle, revealing dark underneath | `::view-transition-old(root)` shrinks full → 0 |

**Timeline** (total 560 ms):

| Phase | Time | Motion |
|---|---|---|
| Anticipation ("little moving") | 0–80 ms | Circle appears at the toggle's center, radius 0 → 14 px, while its center nudges 10 px toward the window center. Ease-out. |
| Growth | 80–560 ms | Radius 14 px → distance to the farthest window corner, centered on the nudged point. Easing `cubic-bezier(0.65, 0, 0.2, 1)`: slow start, fast middle, soft landing. |
| Collapse (reverse) | mirrored | Radius full → 14 px over the first 480 ms with the time-reversed easing `cubic-bezier(0.8, 0, 0.35, 1)`, then 14 → 0 px into the toggle over the last 80 ms. |

**Toggle button (concurrent, 220 ms).** The sun and moon icons swap with `AnimatePresence mode="wait"`: the outgoing icon rotates 0 → 90° and fades, the incoming rotates from -90° → 0° with `spring.snappy`. The button shows a pressed state (scale 0.94) on click and is `aria-disabled` while a switch is running. Label: "Switch to light theme" / "Switch to dark theme".

**Origin.** The center of the ThemeToggle button, measured with `getBoundingClientRect()` at click time. The toggle exists in the sidebar footer (or the icon rail when collapsed) and in the bottom-right corner of the lock screen. The `Ctrl/Cmd+Shift+L` shortcut and the palette action use the registered ThemeToggle's rect as the origin. A `system` theme change from the OS uses the window center.

**Implementation approach.** Use the View Transitions API (`document.startViewTransition`) plus the Web Animations API on the `::view-transition-*` pseudo-elements. No CSS transitions on colors. Verify the pinned Electron's Chromium supports it (Chromium 111 or newer); if `startViewTransition` is missing, apply the theme instantly.

`src/renderer/src/design/theme.ts` (the only place that changes the theme):

```ts
export type ThemePref = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

const DURATION_MS = 560;
const DOT_RADIUS = 14;
const NUDGE_PX = 10;
const ANTICIPATION = 80 / DURATION_MS; // 0.143
const EASE_GROW = "cubic-bezier(0.65, 0, 0.2, 1)";
const EASE_SHRINK = "cubic-bezier(0.8, 0, 0.35, 1)";

let busy = false;

export function resolveTheme(pref: ThemePref, systemIsDark: boolean): ResolvedTheme {
  return pref === "system" ? (systemIsDark ? "dark" : "light") : pref;
}

function applyTheme(next: ResolvedTheme): void {
  const root = document.documentElement;
  root.dataset.theme = next;
  root.style.colorScheme = next;
}

export async function setTheme(
  next: ResolvedTheme,
  origin?: { x: number; y: number },
  reducedMotion = false,
): Promise<void> {
  const root = document.documentElement;
  if (root.dataset.theme === next || busy) return;

  const supported = typeof document.startViewTransition === "function";
  if (!supported) {
    applyTheme(next);
    return;
  }

  busy = true;
  root.classList.add("theme-switching"); // disables CSS transitions during the swap

  try {
    // Reduced motion, or no origin: short crossfade, no circle.
    if (reducedMotion || !origin) {
      root.classList.add("theme-fade");
      const t = document.startViewTransition(() => applyTheme(next));
      await t.finished;
      return;
    }

    const expand = next === "light"; // lights on = expand, lights off = collapse
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = cx - origin.x;
    const dy = cy - origin.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = origin.x + (dx / len) * NUDGE_PX; // nudged center ("little moving")
    const py = origin.y + (dy / len) * NUDGE_PX;
    const maxR = Math.hypot(
      Math.max(px, window.innerWidth - px),
      Math.max(py, window.innerHeight - py),
    );

    const zero = `circle(0px at ${origin.x}px ${origin.y}px)`;
    const dot = `circle(${DOT_RADIUS}px at ${px}px ${py}px)`;
    const full = `circle(${maxR}px at ${px}px ${py}px)`;

    root.classList.add("theme-circle");
    root.classList.toggle("theme-collapse", !expand);

    const transition = document.startViewTransition(() => applyTheme(next));
    await transition.ready;

    const keyframes = expand
      ? [
          { clipPath: zero, offset: 0, easing: "cubic-bezier(0.2, 0, 0, 1)" },
          { clipPath: dot, offset: ANTICIPATION, easing: EASE_GROW },
          { clipPath: full, offset: 1 },
        ]
      : [
          { clipPath: full, offset: 0, easing: EASE_SHRINK },
          { clipPath: dot, offset: 1 - ANTICIPATION, easing: "cubic-bezier(0.8, 0, 0.2, 1)" },
          { clipPath: zero, offset: 1 },
        ];

    root.animate(keyframes, {
      duration: DURATION_MS,
      easing: "linear",
      fill: "both",
      pseudoElement: expand ? "::view-transition-new(root)" : "::view-transition-old(root)",
    });

    await transition.finished;
  } finally {
    root.classList.remove("theme-switching", "theme-circle", "theme-collapse", "theme-fade");
    busy = false;
  }
}
```

Add to `styles/globals.css`:

```css
/* Circular reveal: we drive the animation from JS, so disable the default crossfade. */
:root.theme-circle::view-transition-old(root),
:root.theme-circle::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
/* Expand (dark → light): new view on top, clipped by the growing circle. */
:root.theme-circle::view-transition-old(root) { z-index: 1; }
:root.theme-circle::view-transition-new(root) { z-index: 2; }
/* Collapse (light → dark): old view on top, clipped by the shrinking circle. */
:root.theme-circle.theme-collapse::view-transition-old(root) { z-index: 3; }
:root.theme-circle.theme-collapse::view-transition-new(root) { z-index: 1; }

/* Reduced motion: plain 120 ms crossfade. */
:root.theme-fade::view-transition-old(root),
:root.theme-fade::view-transition-new(root) { animation-duration: 120ms; }

/* Freeze CSS transitions while the theme attribute flips so the snapshot is clean. */
:root.theme-switching *,
:root.theme-switching *::before,
:root.theme-switching *::after { transition: none !important; }
```

**No flash on launch.** The main process reads `ui-prefs.json` synchronously before creating the window, resolves `system` using `nativeTheme.shouldUseDarkColors`, sets the `BrowserWindow` `backgroundColor` to the resolved `--bg-base`, and passes the theme to the renderer through `webPreferences.additionalArguments`. The preload exposes it as `window.ward.boot.theme`, and an **external** `theme-boot.js` (CSP forbids inline scripts) loaded in `<head>` sets `data-theme` before first paint. Also set `nativeTheme.themeSource` to the preference so native chrome matches.

**Rules**
1. Only `setTheme()` may change `data-theme`. Never toggle it elsewhere and never add color or background CSS transitions that would fight the snapshot.
2. The page is a frozen snapshot while the transition runs, so keep it at 560 ms or less. The `busy` guard ignores toggles during a switch (spamming the button must never stack or glitch the animation).
3. Reduced motion (OS setting or in-app override): crossfade only, 120 ms, no circle, no anticipation dot.
4. The transition must work on the lock screen and with modals/popovers open (they are included in the snapshot).
5. After a successful switch, persist the preference with `prefs:set`.

**Acceptance criteria**
- **THEME-1:** Dark → Light grows a circle from the toggle and ends with the full light theme; Light → Dark shrinks the light view back into the toggle, leaving dark.
- **THEME-2:** The 80 ms anticipation dot with the slight nudge is visible; the growth feels smooth with no stutter at 60 fps on the dev machine.
- **THEME-3:** Spamming the toggle 10 times quickly produces no stacked animations, flicker, or stuck mid-state.
- **THEME-4:** The same works from the sidebar toggle, the icon rail, the lock screen, `Ctrl/Cmd+Shift+L`, and the palette.
- **THEME-5:** Reduced motion gives a 120 ms crossfade; unsupported `startViewTransition` gives an instant swap.
- **THEME-6:** Relaunching shows the saved theme from the first frame (no white or black flash), including on the lock screen.

### 7.6 States (every screen and list must implement all)

Loading (skeleton, after 200 ms), Empty (illustration/icon + one-sentence purpose + primary action), Populated, No search results (with query echo and "clear filters"), Error (what happened, what to try, retry button), Locked, Offline is not applicable. Destructive actions show confirm dialogs naming the object and the consequence.

### 7.7 Accessibility

- WCAG 2.1 AA contrast; visible focus ring on every interactive element (2 px, offset 2 px, `--focus-ring`); never `outline: none` without a replacement.
- Full keyboard operation. Lists use roving tabindex with arrow keys, Home/End; menus/dialogs use Radix focus management; Esc closes the topmost layer; focus returns to the trigger on close.
- Semantic landmarks (`nav`, `main`, `aside`), headings in order, `aria-label` on icon-only buttons, `aria-live="polite"` for toasts and copy confirmations, `aria-busy` while loading.
- Hit targets at least 32 × 32 px (44 px for touch-like controls on the board).
- Status is never color-only: pair with icon or text.
- Secrets are never placed in `aria-label`, `title`, or live regions.

### 7.8 Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Ctrl/Cmd+K | Command palette |
| Ctrl/Cmd+L | Lock now |
| Ctrl/Cmd+Shift+L | Toggle theme (circular reveal) |
| Ctrl/Cmd+N | New item in the current module |
| Ctrl/Cmd+F | Focus the list search |
| Ctrl/Cmd+Shift+C | Copy password of the selected entry |
| Ctrl/Cmd+Shift+U | Copy username of the selected entry |
| Ctrl/Cmd+E | Edit selected |
| Ctrl/Cmd+S | Save form |
| Ctrl/Cmd+, | Settings |
| Ctrl/Cmd+1…6 | Jump to Dashboard/Vault/Notes/Tasks/Income/Favorites |
| Esc | Close layer / clear search |
| ↑ ↓ | Move selection in lists |

Show shortcuts in tooltips and in a "Keyboard shortcuts" help dialog (`?`).

### 7.9 Copy and tone

Plain, calm, specific. "Copied. Clipboard clears in 30 s." not "Success!". Errors say what happened and what to do. Security copy is honest, never absolute ("encrypted on this device", never "unhackable").

---

## 8. Phased build plan

**Workflow for every phase:** the user types `GO PHASE N` → the agent does the next unfinished numbered step in that phase's Prompt, then stops (§0.4). The user replies `GO` or `GO N.M` for the next step. When the prompt steps are done, the user types `GATE` → the agent posts the Verification Report → **stops**. The user verifies and replies `GO PHASE N+1`.

For each phase below: **Goal**, **Depends on**, **Deliverables**, a **Prompt** the user can paste into Cursor, and a **Gate** (all items must pass).

### Prerequisites (before Phase 0)

This is not a numbered phase. Phases stay 0–12.

Already in the repo before any scaffold:

- This file, `Ward-PRD.md`, at the repo root. The tree sketch in §3.2 calls it `PRD.md`; the name on disk is `Ward-PRD.md`.
- `.cursor/rules/ward.mdc` and `.cursor/rules/ward-persona.mdc`.
- The skills under `.cursor/skills/` (`ward-step`, `ward-phase-gate`, and the rest named in §0.4).

Still required on the machine before `GO PHASE 0`:

- Node.js LTS, with npm.
- git.
- Cursor, with this folder open so the rules load.

Do not start Phase 0 until those are true. The first commit and any `phase-N-done` tag wait until Miguel asks for them.

---

### Phase 0 — Foundation and spikes

**Goal:** a running hardened Electron + React + TS shell, tooling, and proof that the risky dependencies work.
**Depends on:** nothing.

**Deliverables**
- Project scaffolded with `electron-vite` (React + TS), strict TypeScript, ESLint (+ `eslint-plugin-security`), Prettier, Vitest, npm scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`, `package`.
- Folder structure from 3.2 (empty modules with `index.ts` stubs and a README note are fine).
- Hardened `BrowserWindow` per 4.7, CSP, navigation guard, single-instance lock, typed preload exposing only `app:getVersion`.
- Tailwind + fonts bundled locally + `tokens.css` with the full token set.
- **Spike A (DB):** a script/test that, under Electron's runtime, creates an encrypted DB with a raw 32-byte key, writes/reads a row, reopens with the right key (works), reopens with a wrong key (fails with a catchable error), and confirms the file on disk contains no plaintext marker string.
- **Spike B (crypto):** libsodium initializes in main; Argon2id derive + XChaCha20-Poly1305 wrap/unwrap round trip works; timing of the KDF is printed at INTERACTIVE, MODERATE.
- **Spike C (packaging):** `npm run package` produces a Windows installer or unpacked build in which the native modules load.
- `SPIKE-REPORT.md` with results, the exact versions pinned, and any deviations from this PRD.

**Prompt (paste into Cursor)**
```text
Read Ward-PRD.md fully, especially Sections 0, 2, 3, 4.7 and 8 (Phase 0). Follow the operating protocol in Section 0.1.

GO PHASE 0.

Before building, post your plan (max 10 lines), the list of files you'll create, and your assumptions. Then:
1. Scaffold the project with electron-vite (React + TypeScript). Check the current create command in its official docs.
2. Configure strict TypeScript, ESLint with eslint-plugin-security, Prettier, Vitest, and the npm scripts listed in Phase 0.
3. Create the folder structure from Section 3.2 (stubs are fine).
4. Implement the hardened BrowserWindow, strict CSP, navigation guard, permission denial, single-instance lock, and a typed preload exposing only app:getVersion, exactly as specified in 4.7 and 3.4. Production builds must disable DevTools.
5. Install Tailwind, bundle Inter Variable and JetBrains Mono Variable locally via @fontsource-variable packages (no CDNs), and create tokens.css with every token from Section 7.2 (dark default + light), mapped into the Tailwind theme. Render a simple token showcase page to verify.
6. Run the three spikes (DB encryption with better-sqlite3-multiple-ciphers, libsodium Argon2id + AEAD, packaging). Record results in SPIKE-REPORT.md, including pinned versions and KDF timings.
7. Do NOT build any feature UI, vault logic, or database schema yet.

Verify the current docs for every library before using it and pin exact versions. Output complete files. At the end output the Verification Report (Appendix B) and stop. Do not start Phase 1.
```

**Gate**
- [ ] `npm run typecheck`, `lint`, `test` pass with zero errors.
- [ ] `npm run dev` opens a window showing the token showcase with correct fonts, offline (disable network and confirm).
- [ ] Hardening: renderer has no `require`/`process`; `window.ward` has only `getVersion`; navigating or `window.open` is blocked (test or documented manual check).
- [ ] CSP blocks an injected remote script (manual check recorded).
- [ ] Spike A: wrong key fails; the raw DB file contains no plaintext marker.
- [ ] Spike B: round trip passes; KDF timings recorded.
- [ ] Spike C: packaged build launches and loads native modules.
- [ ] `SPIKE-REPORT.md` exists and states clearly whether the DB-encryption decision (2.2) holds or needs the fallback.

---

### Phase 1 — Crypto core and vault header (no UI)

**Goal:** a fully tested, pure-TypeScript crypto module implementing Section 4.2–4.4.
**Depends on:** Phase 0 (Spike B).

**Deliverables**
- `crypto/sodium.ts`, `kdf.ts`, `aead.ts`, `recovery-key.ts`, `vault-header.ts`.
- Functions: `createVault(password) → { header, recoveryKey, vaultKey }`, `unlockWithPassword(header, password) → vaultKey`, `unlockWithRecovery(header, recoveryKey) → vaultKey`, `rewrapPassword(header, vaultKey, newPassword) → header`, `rotateRecovery(header, vaultKey) → { header, recoveryKey }`.
- Header Zod schema + versioning + atomic read/write helpers + `.bak` handling.
- Recovery key encode/decode (Base32 groups, checksum char optional) with typo detection.
- Unit tests: round trips; wrong password/recovery fails with `WRONG_PASSWORD`; tampering with any header field (including KDF params) fails; nonces differ each wrap; header with unknown `formatVersion` is rejected; recovery key typos rejected; no secret appears in thrown error messages; zeroization helper is invoked.

**Prompt**
```text
GO PHASE 1. Re-read Section 4 of Ward-PRD.md (4.2 to 4.4, 4.8, 4.9) and Phase 1 in Section 8. Follow the operating protocol.

Post your plan, file list, and assumptions first. Then implement the crypto core exactly as specified: Argon2id via libsodium for the KEK, a random 32-byte Vault Key, XChaCha20-Poly1305 wrapping with random 24-byte nonces and the header's version and KDF params as associated data, a 256-bit recovery key shown as Base32 groups with domain-separated derivation, and an atomic header read/write module. Use the KDF params found in SPIKE-REPORT.md and store them in the header.

No UI, no IPC, no DB in this phase. Write thorough Vitest tests for every case listed in the Phase 1 deliverables, including tamper detection and "no secrets in error messages". Never use Math.random. Output complete files, the Verification Report, and stop.
```

**Gate**
- [ ] All unit tests pass, including every tamper and wrong-credential case.
- [ ] Coverage for `crypto/` ≥ 90% lines.
- [ ] Grep confirms no `Math.random`, no `console.log` in `crypto/`.
- [ ] A test proves the same password yields different headers (random salt/nonces) and both unlock correctly.
- [ ] Changing the password re-wraps the VK without changing it (the old DB would still open).

---

### Phase 2 — Encrypted database, migrations, repositories

**Goal:** the encrypted SQLite layer and data-access repos for every table, tested.
**Depends on:** Phases 0 and 1.

**Deliverables**
- `db/open.ts` (open with raw VK, set pragmas, foreign keys on, verify cipher active, close), migration runner with `user_version`, `0001_init.sql` from Section 5, FTS5 tables + triggers.
- Repos: `folders`, `entries` (+ history trimming), `notes`, `tasks`, `income`, `settings`, `search`.
- Money helpers (parse/format integer minor units).
- WAL/SHM leakage check documented (4.4).
- Tests on a temp encrypted DB: CRUD per repo, soft delete/restore/purge, history trim to 10, folder deletion moves items to unfiled, FTS finds titles but **not** passwords, migration idempotency, wrong key fails, SQL injection strings stored inertly, income math with 0.1 + 0.2 style cases.

**Prompt**
```text
GO PHASE 2. Re-read Sections 3.3, 4.4 and 5 of Ward-PRD.md and Phase 2 in Section 8. Follow the operating protocol.

Post plan, file list, assumptions. Then implement the encrypted DB layer in src/main/db: opening with the raw Vault Key, migration runner using PRAGMA user_version, 0001_init.sql matching Section 5 exactly, FTS5 search tables with sync triggers (passwords must never be indexed), and one repository per entity. Repositories are the ONLY place SQL is written; all statements parameterized. Money is integer minor units with tested parse/format helpers.

Investigate whether -wal/-shm files leak plaintext with the chosen cipher setup and document the finding plus the mitigation in a short DB-NOTES.md.

Write Vitest tests for every case in the Phase 2 deliverables. No IPC, no UI. Output complete files, the Verification Report, and stop.
```

**Gate**
- [ ] All repo tests pass; migrations run from empty and are idempotent.
- [ ] Test proves a raw `ward.db` read without the key shows no plaintext titles/passwords.
- [ ] Search test: searching a password value returns nothing.
- [ ] DB-NOTES.md states the WAL/SHM finding and mitigation.
- [ ] No SQL string concatenation anywhere (lint rule or grep check).

---

### Phase 3 — Session, IPC, lock/onboarding flows

**Goal:** end-to-end vault create/unlock/lock with the real crypto + DB, behind a typed IPC, with minimal functional UI.
**Depends on:** Phases 1–2.

**Deliverables**
- `shared/ipc-contract.ts` (channels, Zod schemas, `Result`, `ErrorCode`), `ipc/register.ts`, `ipc/guard.ts` (sender check, locked-state allowlist, Zod validation), handlers for `vault:*`, `settings:*`, `app:*`.
- `session/session.ts` state machine, `auto-lock.ts` (idle, minimize, `powerMonitor` lock-screen/suspend), `throttle.ts`.
- Preload exposing the typed `window.ward`, including `window.ward.boot.theme`.
- `prefs.ts` + `prefs:get/set` handlers reading/writing `ui-prefs.json` (theme, reduced motion, window bounds), allowed while locked. Lock and onboarding screens apply the saved theme before first paint (external `theme-boot.js`, `BrowserWindow` `backgroundColor`), with no flash.
- Renderer: Zustand session store; functional (lightly styled using tokens) Welcome → Create password → Recovery key display + confirm → Lock screen → empty authenticated shell with a Lock button. Forms with RHF + Zod; zxcvbn meter.
- On lock: renderer stores cleared; `session:locked` event handled.
- Tests: guard rejects calls while locked; invalid payloads rejected with `INVALID_INPUT`; throttle sequence; auto-lock timer logic with fake timers; integration test create → lock → unlock → wrong password path; log-capture test proves no secrets.

**Prompt**
```text
GO PHASE 3. Re-read Sections 3.4, 4.5, 4.8, 6.1, 6.2 of Ward-PRD.md and Phase 3 in Section 8. Follow the operating protocol.

Post plan, file list, assumptions. Then implement the session state machine, auto-lock triggers, wrong-password throttling, the typed IPC layer with the guard (sender validation, Zod validation, locked-state allowlist), the typed preload API, and the functional onboarding + lock flows from 6.1 and 6.2. UI can be functional and lightly styled with design tokens; the full design system comes in Phase 4. Do not implement vault entries, notes, tasks, or income yet.

The renderer must never receive the Vault Key, and must clear all vault-related state on session:locked. Write the tests listed in Phase 3. Output complete files, the Verification Report, and stop.
```

**Gate**
- [ ] Manual: create vault → recovery key shown once and confirmed → quit → relaunch → lock screen → unlock works; wrong password shows generic error; 4th attempt shows throttle countdown.
- [ ] Manual: recovery-key unlock forces setting a new master password and issues a new recovery key.
- [ ] Manual: idle auto-lock fires at the configured time; minimize locks; (if testable) OS lock event locks.
- [ ] Tests: calling any non-allowlisted channel while locked returns `LOCKED`.
- [ ] Log-capture test proves no passwords/keys in logs.
- [ ] Renderer devtools check (dev build): no VK or password in the store after lock.

---

### Phase 4 — App shell and design system

**Goal:** the production-grade UI foundation every feature will use.
**Depends on:** Phase 3.

**Deliverables**
- All primitives in 7.4 (with Storybook-like internal `/design` route available only in dev) using tokens, Radix, and Framer Motion via `design/motion.ts`.
- App shell per 7.3: sidebar (collapsible, persisted), resizable list pane, detail pane, responsive rules, folder tree (static data for now), dark/light/system theme, reduced-motion handling via `MotionConfig`.
- Lock ↔ app transition and wrong-password shake per 7.5. Toasts, dialogs, sheets, confirm dialogs, EmptyState, Skeleton.
- **Theme switch per 7.5.1:** `design/theme.ts`, the CSS block in `globals.css`, and a `ThemeToggle` (sun/moon morph) in the sidebar footer, the collapsed rail, and on the lock screen. Dark → light expands a circle from the toggle, light → dark collapses it back, with the 80 ms anticipation dot. Includes reduced-motion and unsupported-API fallbacks, the `busy` guard, and persistence via `prefs:set`.
- Command palette skeleton (`cmdk`) with navigation and "Lock now", global shortcut handling per 7.8.
- A11y: focus ring, roving tabindex ListRow, landmarks, live regions.

**Prompt**
```text
GO PHASE 4. Re-read Section 7 of Ward-PRD.md in full (tokens, layout, components, motion, states, accessibility, shortcuts) and Phase 4 in Section 8. Follow the operating protocol. Act as a senior UX/UI designer and front-end engineer: precise, restrained, premium.

Post plan, file list, assumptions. Then build the full design system and app shell. Every value comes from tokens or design/motion.ts; no raw hex, no ad-hoc durations. Build all primitives listed in 7.4 with accessible behavior (Radix where applicable), including the CopyButton state machine and PasswordInput with strength meter. Implement the three-region layout with the collapsible sidebar, resizable list pane and responsive rules. Implement every motion in 7.5 that applies to the shell (route change, lock/unlock, dialogs, sheets, toasts, selection layoutId, folder expand, skeletons), with reduced-motion variants. Implement the circular-reveal theme switch exactly as specified in 7.5.1 (View Transitions API, expand to light, reverse-collapse to dark, anticipation dot, 560 ms, busy guard, no-flash launch) and pass THEME-1 to THEME-6.

Provide a dev-only /design route showing every primitive in every state (default, hover, focus, disabled, loading, error) in dark and light. No feature data yet; use mock data only inside the /design route. Output complete files, the Verification Report with screenshots or a described checklist, and stop.
```

**Gate**
- [ ] `/design` route shows all primitives in all states, dark and light, no console errors.
- [ ] Keyboard-only walkthrough: tab through shell, open palette (Ctrl+K), open/close dialog and return focus correctly.
- [ ] Reduced motion (OS setting and in-app override) removes transforms/stagger/loops.
- [ ] Theme switch passes THEME-1 to THEME-6 from 7.5.1: dark → light expands a circle from the toggle, light → dark collapses it back, 10 rapid toggles never glitch, it works on the lock screen, and relaunch shows no theme flash.
- [ ] Contrast checks for all text/background token pairs recorded as AA-passing.
- [ ] Grep: no hex colors or hard-coded durations outside token/motion files.
- [ ] Layout holds at 960 × 620 and at 1920 × 1080; sidebar/detail responsive rules behave per 7.3.

---

### Phase 5 — Vault module (passwords, folders, generator)

**Goal:** the core password manager experience.
**Depends on:** Phase 4.

**Deliverables**
- IPC handlers + typed client for `folders:*` and `entries:*` (incl. `revealSecret`, `copySecret`, `generatePassword`, `analyzePassword`, `history`).
- Main services: generator (CSPRNG with rejection sampling, passphrase with bundled word list), clipboard service with timer + compare-before-clear.
- Renderer: Vault list/detail/create/edit per VAULT-1…7, FOLD-1…3 (folder tree is now real), favorites toggle, trash action, history view, generator popover, duplicate-URL warning.
- Tests: list payload contains no password; reveal returns it; copy clears clipboard only if unchanged; generator distribution sanity and rejection-sampling unit test; history trim; unsaved-changes guard (component test).

**Prompt**
```text
GO PHASE 5. Re-read Sections 3.4 (secrets rule), 4.6, 4.10, 6.3, 6.4 and 7 of Ward-PRD.md and Phase 5 in Section 8. Follow the operating protocol. Design work must meet the senior UX-UI standard from Section 7.

Post plan, file list, assumptions. Then implement the Vault module end to end: IPC handlers, main-process services (generator, clipboard with timed clear), and renderer features for entries and folders per VAULT-1..7 and FOLD-1..3. Passwords must never be included in list or get payloads; reveal is via entries:revealSecret with a 15 s auto-hide, and copy is performed in the main process. Apply the motion table in 7.5 (list enter, selection layoutId, detail swap, reveal crossfade, copy feedback with countdown ring, folder expand). Implement all states in 7.6 (loading, empty, no results, error).

Write the tests listed in Phase 5. Output complete files, the Verification Report, and stop.
```

**Gate**
- [ ] Manual: create 3 folders, 10 entries; generate a password; save; lock; unlock; data intact.
- [ ] Test and manual: list network/IPC payload contains no password field.
- [ ] Copy → clipboard has value → after the delay it is cleared; copying something else first prevents clearing.
- [ ] Reveal auto-hides at 15 s; locking hides it immediately.
- [ ] Editing a password adds history; history capped at 10.
- [ ] Empty, loading, no-results and error states visually verified.
- [ ] Keyboard: Ctrl+Shift+C copies selected password; Esc and focus behavior correct.

---

### Phase 6 — Notes

**Goal:** Markdown notes with safe rendering.
**Depends on:** Phase 5.

**Prompt**
```text
GO PHASE 6. Re-read Sections 6.5 and 7 of Ward-PRD.md and Phase 6 in Section 8. Follow the operating protocol.

Post plan, file list, assumptions. Implement notes: IPC handlers, repo wiring, and the renderer with a Markdown editor, preview toggle and split view, debounced autosave (800 ms) with a quiet Saved indicator, pin, favorite, folder move, trash, word/character count. Render Markdown with react-markdown + remark-gfm and a sanitizing pipeline: no raw HTML, no remote images, links open only through the confirmed external-link path. Apply 7.5 motion and 7.6 states.

Tests: XSS payloads (script tags, javascript: links, onerror images) render inert; autosave debounce; pinned ordering. Output complete files, the Verification Report, and stop.
```

**Gate**
- [ ] XSS test suite passes; manual paste of `<img src=x onerror=alert(1)>` is inert.
- [ ] Autosave works, survives lock/unlock mid-edit (unsaved text saved before lock or clearly flagged).
- [ ] Remote images are not fetched (network panel shows zero requests).
- [ ] Pin/favorite/folder/trash flows verified.

---

### Phase 7 — Tasks

**Goal:** list and board task management with drag and keyboard support.
**Depends on:** Phase 5.

**Prompt**
```text
GO PHASE 7. Re-read Sections 6.6 and 7 of Ward-PRD.md and Phase 7 in Section 8. Follow the operating protocol.

Post plan, file list, assumptions. Implement tasks: IPC, list view, board view (todo/doing/done), Today/Upcoming filters, quick-add with !/!!/!!! priority shortcuts, subtasks (one level) with parent progress, due dates with overdue styling (color + icon), favorite, folder, trash. Use @dnd-kit for drag reorder and cross-column moves AND provide a full keyboard alternative (move up/down/column via shortcuts and menu). Implement the task-complete animation exactly as in 7.5 and the drag lift/placeholder behavior. Persist sort order robustly (no collisions after many reorders).

Tests: reorder persistence, subtask progress, overdue logic with fixed clock, completion timestamps. Output complete files, the Verification Report, and stop.
```

**Gate**
- [ ] Drag and keyboard reorder both work and persist after relock.
- [ ] Moving across columns updates status and `completed_at` correctly.
- [ ] Overdue shows icon + text, not just color.
- [ ] Complete animation plays; reduced motion shows a simple fade.
- [ ] 200 tasks scroll and reorder without jank.

---

### Phase 8 — Income

**Goal:** accurate income tracking with summaries and charts.
**Depends on:** Phase 5.

**Prompt**
```text
GO PHASE 8. Re-read Sections 5 (money rules), 6.7 and 7 of Ward-PRD.md and Phase 8 in Section 8. Follow the operating protocol.

Post plan, file list, assumptions. Implement income: IPC, TanStack Table (sort, filters for date range/client/status/category, column visibility), CurrencyInput storing integer minor units (reject negatives and more than 2 decimals), side sheet for add/edit, summary strip (this month, last month, YTD, pending), Recharts charts (monthly totals for 12 months, top 5 clients, category breakdown) styled with design tokens and accessible (text alternative/table fallback), and CSV export of the filtered view with a plaintext warning dialog. Default currency from settings (PHP).

Tests: money parse/format edge cases, totals vs hand-computed fixtures, month-boundary logic with a fixed clock and timezone, 1,000-row performance sanity. Output complete files, the Verification Report, and stop.
```

**Gate**
- [ ] Fixture totals match exactly; no floating-point drift.
- [ ] Month/YTD boundaries correct at month and year edges.
- [ ] Charts have accessible fallbacks and respect reduced motion.
- [ ] CSV export shows warning and the file contents match the filtered view.
- [ ] 1,000 rows scroll smoothly.

---

### Phase 9 — Dashboard, Favorites, Search, Trash

**Goal:** cross-cutting views and global search.
**Depends on:** Phases 5–8.

**Prompt**
```text
GO PHASE 9. Re-read Sections 6.8, 6.12 and 7 of Ward-PRD.md and Phase 9 in Section 8. Follow the operating protocol.

Post plan, file list, assumptions. Implement the Dashboard (today's/overdue tasks, pinned notes, recently used entries, income this month, security score summary placeholder, backup status placeholder), the Favorites view grouped by type, global search via FTS5 with highlighted matches and grouped results, the full command palette actions from 6.12, and Trash (restore, purge, typed DELETE confirmation to empty, 30-day auto purge on unlock). Make search keyboard navigable and fast.

Tests: search latency on a 5,000-item fixture under 100 ms, trash retention purge, favorites aggregation. Output complete files, the Verification Report, and stop.
```

**Gate**
- [ ] Search across all types works and never matches password values.
- [ ] Palette executes every listed action by keyboard only.
- [ ] Trash restore returns items to their original folder (or Unfiled if deleted).
- [ ] Auto-purge verified with a mocked clock.
- [ ] Dashboard renders sensibly with empty and populated vaults.

---

### Phase 10 — Backup, restore, recovery, import

**Goal:** make data loss very hard.
**Depends on:** Phase 9.

**Prompt**
```text
GO PHASE 10. Re-read Sections 4.4, 6.10, 6.1/6.2 (recovery) of Ward-PRD.md and Phase 10 in Section 8. Follow the operating protocol.

Post plan, file list, assumptions. Implement: manual backup to a single .ward-backup file (magic bytes, format version, encrypted DB via SQLite online backup, header, SHA-256 payload checksum); auto-backup scheduling with retention pruning and failure surfacing; verify (structure/checksum, plus optional full verify with password); restore with a safety backup of the current vault, atomic replacement, and guaranteed rollback on failure; change master password and rotate recovery key (both require the current password); CSV import (Chrome and Bitwarden formats) with preview, column mapping, duplicate flags, sanitization and single-transaction commit. Build the Backup & Recovery UI with clear status (last backup, warnings after 14 days).

Tests: restore into a fresh profile recovers exact entity counts; one-byte tamper detected; interrupted restore leaves original intact; password change then restore of an OLD backup works with the OLD password; import of malformed and hostile CSVs. Output complete files, the Verification Report, and stop.
```

**Gate**
- [ ] Fresh-profile restore: all counts and a sample of decrypted values match the source.
- [ ] Tampered backup rejected by verify; wrong password rejected on restore.
- [ ] Simulated failure mid-restore leaves the original vault unlocked-able and unchanged.
- [ ] Old backup restores with the password that was current at backup time.
- [ ] CSV import handles quotes/newlines/BOM, flags duplicates, and neutralizes HTML/formula injection (`=`, `+`, `-`, `@` prefixes in exports).
- [ ] Backup status appears on the Dashboard.

---

### Phase 11 — Security center and settings review

**Goal:** the audit feature, full Settings, and a security self-review.
**Depends on:** Phase 10.

**Prompt**
```text
GO PHASE 11. Re-read Sections 4 (all), 6.9, 6.11 of Ward-PRD.md and Phase 11 in Section 8. Follow the operating protocol.

Post plan, file list, assumptions. Implement the Security Center (weak, reused, old, empty-password findings computed locally in main; reuse detection by hash comparison without exposing other passwords; overall score with an explanation), complete Settings per 6.11 including the honest About & Privacy screen mirroring Section 4.1, and content-protection toggle.

Then perform a written security self-review against the 4.7 hardening checklist and Section 4 in SECURITY-REVIEW.md: for each item, state pass/fail with evidence (test name or file/line). Fix any failures. Output complete files, the Verification Report, and stop.
```

**Gate**
- [ ] Audit findings correct on a seeded fixture (known weak/reused/old entries).
- [ ] Reused detection never sends plaintext passwords to the renderer.
- [ ] SECURITY-REVIEW.md complete, every item has evidence, no unresolved fails.
- [ ] Settings persist across restarts and apply immediately (auto-lock, clipboard delay, theme, motion).

---

### Phase 12 — Polish, E2E, packaging, release

**Goal:** production quality and a shippable installer.
**Depends on:** all previous phases.

**Prompt**
```text
GO PHASE 12. Re-read Sections 1.6, 7.5, 7.7, 9 and 10 of Ward-PRD.md and Phase 12 in Section 8. Follow the operating protocol.

Post plan, file list, assumptions. Do, in this order: (1) a motion pass: review every animation against 7.5, remove anything that distracts, ensure reduced-motion parity; (2) an accessibility audit (axe checks in Playwright plus manual keyboard and screen-reader notes), fixing all serious/critical issues; (3) performance: measure cold start, unlock time, 5,000-item search, 1,000-row income and 200-task lists against 1.6 and fix regressions; (4) Playwright E2E for the critical flows in Section 9; (5) a zero-network verification (assert no outbound requests during a full session); (6) electron-builder packaging for Windows with correct native-module unpacking, app icon, and metadata; (7) README with install, usage, backup/recovery guidance, and the honest security model.

Output complete files and the final Verification Report including measured numbers. Stop.
```

**Gate**
- [ ] All E2E flows pass on a clean profile.
- [ ] axe: zero serious/critical violations on every main screen.
- [ ] Metrics meet 1.6 (numbers recorded).
- [ ] Zero outbound network requests across a full-session test.
- [ ] Installer installs, launches, unlocks an existing vault, and uninstalls without leaving the vault deleted unexpectedly (vault data location documented).
- [ ] README covers recovery-key loss warning and backup guidance.

---

## 9. Testing strategy

**Unit (Vitest):** crypto, header handling, repos, money, search, generator, throttle, auto-lock logic, clipboard service, CSV parser, security audit, Zod schemas.
**Integration:** IPC guard and handlers against a temp encrypted DB; session lifecycle; backup/restore.
**Component:** forms (validation, unsaved guard), CopyButton state machine, ListRow keyboard behavior, markdown sanitizer.
**E2E (Playwright Electron), critical flows:**
1. Create vault → confirm recovery key → lock → unlock.
2. Wrong password ×4 → throttling → correct password.
3. Create entry (generated password) → copy → clipboard cleared after the delay (use a shortened test delay setting) → lock → unlock → verify.
4. Notes: XSS payload inert.
5. Tasks: drag reorder + keyboard reorder persist.
6. Income: add rows → totals correct.
7. Backup → wipe profile → restore → verify.
8. Recovery key unlock → forced new master password.
9. Auto-lock after idle.
10. Command palette navigation.

**Security tests:** secrets-in-logs scan; list payload has no passwords; locked-state channel allowlist; CSP/navigation block; tamper detection; no network.

**Rule:** a test that needs a real secret value uses obvious fixtures (e.g. `CorrectHorse!Battery#1`) and asserts they never appear in logs or snapshots.

---

## 10. Definition of done

**Per phase:** all gate items checked, typecheck/lint/tests green, Verification Report posted, no TODOs left in touched code without a tracked note, no new dependency without a stated reason.

**v1 release:** all 13 phases complete; SECURITY-REVIEW.md clean; metrics in 1.6 met; zero network requests; README honest; a full restore drill performed on a clean machine or profile.

---

## Appendix A — `.cursor/rules/ward.mdc`

This is the file in the repo. Step stops win on granularity. Section 4 still wins on security. See §0.4.

```text
---
description: Ward project rules (always apply)
alwaysApply: true
---

# Ward rules
- Source of truth is Ward-PRD.md. Read the relevant sections before coding. Precedence: Security > Data model > Features > Design > Phases.
- Work ONE phase at a time. Never start a new phase without the user typing "GO PHASE N".
- Inside a phase, do ONE numbered step from that phase's Prompt, then stop. Start that step with a plan (max 10 lines), the files you will touch, and any assumption. `GO PHASE N` runs the next unfinished step only. `GATE` runs the phase gate and the Verification Report (Appendix B). The next phase starts only on `GO PHASE N+1`.
- If a stop rule disagrees on granularity, the step stop wins. Section 4 still wins on security.
- Output complete files, never partial snippets or "rest unchanged".
- Be direct. No over-explaining. Ask at most 3 batched questions, and only if the PRD does not answer it.
- Before using any library, check its current official docs and pin exact versions. Docs win on API details; the PRD wins on product and security design.

## Security
- TypeScript strict. No `any` without a justification comment.
- Secrets (master password, recovery key, vault key, entry passwords, decrypted note content) never go to logs, files, errors, snapshots, localStorage, or aria/title attributes.
- Crypto and DB live only in the main process. The renderer never receives the Vault Key. List endpoints never return passwords. Copy-to-clipboard happens in main.
- Only the primitives in PRD Section 4. Never Math.random for anything security-related. Never invent cryptography.
- All SQL lives in repos, parameterized. No string-built SQL.
- Every IPC handler: validate sender, validate payload with Zod, enforce the locked-state allowlist, return Result<T> with safe messages.
- Electron hardening per PRD 4.7 is mandatory. No remote scripts, fonts, images, or network calls. No CDN.

## UI and motion
- Use design tokens and design/motion.ts only. No raw hex colors, no ad-hoc durations or easings.
- Animate transform/opacity only. Honor reduced motion everywhere.
- Theme changes go ONLY through design/theme.ts setTheme(), which owns the circular-reveal view transition (PRD 7.5.1). Never set data-theme elsewhere or add color transitions that fight it.
- Every screen implements loading, empty, populated, no-results, and error states.
- Keyboard accessible, visible focus rings, icon buttons have aria-labels, status never color-only.
- Write UI as a senior UX/UI designer would: restrained, precise, high contrast, consistent spacing from the 4 px scale.

## Quality
- Run typecheck, lint, and tests before saying anything is done. Report real results.
- Money is integer minor units. Dates are ISO-8601 UTC strings. IDs are ULIDs.
- No features outside PRD scope. No new dependencies without stating why.
```

---

## Appendix B — Verification Report template

```text
# Phase N Verification Report

## Summary
(2-3 sentences: what was built)

## Files created / modified
- path — purpose

## Commands run
- npm run typecheck → PASS/FAIL (details)
- npm run lint → PASS/FAIL
- npm test → X passed / Y failed (coverage if relevant)
- npm run dev → launched OK / issues

## Gate checklist
- [x] item — evidence (test name / manual steps / measured value)
- [ ] item — FAILED: why, what was tried

## Deviations from the PRD
(none, or list with reasons and the doc section affected)

## Library versions pinned / API differences found
(list)

## Known issues / risks
(list, or none)

## Awaiting
Waiting for "GO PHASE N+1".
```









