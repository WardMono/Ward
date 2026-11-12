# Test catalog

Use this when writing tests for a phase. Mark each row `written`, `already covered (name the test)`, or `not this phase`. Do not mark `written` without the test name.

The fixture password is `CorrectHorse!Battery#1`. It must not show up in logs, list payloads, or error strings.

## Always, once the layer exists

| Case | Phase | Status | Test name |
|---|---|---|---|
| Wrong password fails closed | 1 | | |
| Wrong recovery key fails closed | 1 | | |
| Tamper of each header field fails | 1 | | |
| Unknown formatVersion rejected | 1 | | |
| Same password, two creates, both unlock, headers differ | 1 | | |
| Rewrap keeps the same vault key | 1 | | |
| Error text does not contain the password or key | 1 | | |
| No Math.random and no console in crypto/ | 1 | | |
| Migration from empty, and migration twice | 2 | | |
| Raw db file has no plaintext marker | 2 | | |
| FTS finds a title and not a password | 2 | | |
| History trims to 10 | 2 | | |
| Money parse has no float drift | 2 | | |
| SQL injection string stored as text | 2 | | |
| Locked channel rejected | 3 | | |
| Invalid payload is INVALID_INPUT | 3 | | |
| Throttle delays after 3 failures | 3 | | |
| Log capture has no secret | 3 | | |
| List payload has no password | 5 | | |
| Copy clears only if clipboard unchanged | 5 | | |
| Generator rejection sampling, no modulo bias | 5 | | |
| Markdown script, javascript: link, and onerror image are inert | 6 | | |
| Task reorder persists | 7 | | |
| Income totals match a hand fixture | 8 | | |
| Search of 5,000 items under 100 ms, passwords excluded | 9 | | |
| Trash purge honors retention with a fake clock | 9 | | |
| Restore on a fresh profile matches counts | 10 | | |
| One-byte backup tamper detected | 10 | | |
| Interrupted restore leaves the original | 10 | | |
| Old backup unlocks with the old password | 10 | | |
| CSV formula prefixes neutralized | 10 | | |
| Reuse audit does not send other passwords to the renderer | 11 | | |

## E2E (Phase 12)

Write these only in Phase 12 unless an earlier phase already pinned Playwright.

1. Create vault, confirm recovery key, lock, unlock.
2. Wrong password four times, throttle, then the right password.
3. Create entry, copy, clipboard clears on the short test delay, lock, unlock, value still there.
4. Note XSS payload stays inert.
5. Task drag reorder and keyboard reorder persist.
6. Income rows, totals correct.
7. Backup, wipe profile, restore, counts match.
8. Recovery key unlock forces a new master password.
9. Auto-lock after idle.
10. Command palette navigation by keyboard only.
