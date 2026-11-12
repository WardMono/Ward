---
name: ward-migration
description: >-
  Adds a Ward SQLite migration with repository changes, FTS updates,
  forward-only rollback notes, and tests. Use when changing the encrypted
  schema, adding a table or column, or editing files under src/main/db/migrations.
---

# Ward migration

Schema changes are forward-only, applied inside a transaction, and tracked with `PRAGMA user_version`. Repositories are the only code that runs SQL.

## Read first

- `Ward-PRD.md` §5 and §4.4.
- `src/main/db/migrate.ts` and the latest file in `src/main/db/migrations/`.
- `DB-NOTES.md` if it exists (WAL/SHM).

## Rules

- New file: `src/main/db/migrations/NNNN_name.sql`. `NNNN` is the next integer, four digits. Never edit a migration that has been applied in a build Miguel has run. Add the next file instead.
- The runner applies files in order inside a transaction and sets `user_version` to that number. Applying twice is a no-op.
- Foreign keys stay ON. Timestamps are ISO-8601 UTC strings. IDs are ULIDs, generated in the repo, not by SQLite random functions.
- Money is an integer minor unit. No REAL column for money.
- Every new statement in a repo is parameterized. No string concatenation, no template-literal SQL.
- Passwords are never added to FTS. If you add a searchable text column on entries, notes, tasks, or income, update the FTS table and its triggers in the same migration. Search tests must prove a password value is not a hit.
- Soft delete stays `deleted_at`. Do not add a second deletion flag.

## Rollback

There is no down migration that drops user data. The rollback note says: restore the safety backup taken before the migration (Phase 10), or delete the dev vault and recreate it. Write that in the report. Do not ship a `DROP TABLE` "down" script.

## Tests

On a temp encrypted database:

- Empty file migrates to the new `user_version`.
- Running migrations twice leaves data and version unchanged.
- The new repo behavior works with parameterized SQL.
- A wrong vault key still fails to open.
- If FTS changed: a known title matches; a known password does not.
- Existing rows you care about still read back (add a fixture written by the previous migration, then migrate).

## Report

```text
# Migration NNNN_name

## user_version
from → to
## SQL
- tables / columns / indexes / triggers added
## FTS
updated | not applicable — passwords indexed? must be no
## Repo
- path — statements added (parameterized: yes)
## Rollback
restore from backup, not a down script
## Tests
- name → pass/fail
## Commands
- npm test → …

## Awaiting
next step id
```

## Hard stops

- Do not open the database with a passphrase KDF at the SQLCipher layer. The key is the raw 32-byte vault key (§4.3).
- Do not log row contents in tests beyond the fixture you assert.
- Do not change `0001_init.sql` after Phase 2 is signed off. Later changes are new files.
- If the cipher's WAL files can leak plaintext, follow `DB-NOTES.md`. Do not switch journal mode without writing the reason there.
