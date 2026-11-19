# Migrations

Forward-only. `migrate()` applies each SQL file in order inside a transaction and sets `PRAGMA user_version` to that file's number. Applying an already-applied version is a no-op.

There is no down script. Roll back by restoring the safety backup, or delete the dev vault and create it again.

`0001_init.sql` is the Section 5 schema. `0002_fts.sql` is the FTS5 index. Entry passwords are not indexed.
