# Database notes

Measured 2026-11-19 with `better-sqlite3-multiple-ciphers` 13.2.0. The database is opened with `cipher='sqlcipher'` and a raw 32-byte key. No passphrase KDF runs at the SQLite layer.

## Finding

The default `journal_mode` is `delete`. `PRAGMA plaintext_header_size` returned `0`. `PRAGMA mc_legacy_wal` returned no row. Ward does not change either pragma.

A probe wrote two fixture markers, then read the files:

- DELETE mode, with a transaction still open: `ward.db` and `ward.db-journal` existed. Neither file contained either marker. `-wal` and `-shm` did not exist.
- After commit and close: only `ward.db` remained. It did not contain either marker.
- After `journal_mode = WAL` and another write, while the connection was still open: `-wal` and `-shm` existed. Neither contained either marker. The main file did not contain them either. After close, the sidecar files were gone.

## Mitigation

`openVault` sets `journal_mode = DELETE` after the key is applied and refuses the handle unless the mode is `delete`.

Ward uses one connection. WAL is not required. Pinning DELETE keeps `-wal` and `-shm` out of normal operation. The forced-WAL case stays in `tests/unit/wal.test.ts`, so a later build that writes the fixture into those files fails the suite.

`plaintext_header_size` stays `0`. Setting it would leave the SQLite magic bytes readable. That option exists for an iOS shared-container quirk. Ward is Windows-only. `mc_legacy_wal` stays unset. The library docs say legacy WAL encryption is off unless an application turns it on.

## Docs

- https://utelle.github.io/SQLite3MultipleCiphers/docs/configuration/config_sql_pragmas/ — `mc_legacy_wal` defaults off. `plaintext_header_size` leaves a prefix of the header unencrypted.
- https://www.zetetic.net/sqlcipher/sqlcipher-api/ — `cipher_plaintext_header_size` is the iOS WAL header workaround. Ward does not call it.
