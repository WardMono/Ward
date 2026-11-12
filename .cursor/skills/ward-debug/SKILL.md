---
name: ward-debug
description: >-
  Debugs a Ward failure by reproducing it, isolating the layer, fixing it,
  and adding a regression test, without logging secrets. Use when a test
  fails, the app misbehaves, or the user asks to debug.
---

# Ward debug

Reproduce, isolate, fix, add a regression test. Stop when that test passes. Do not keep poking.

## Loop

1. **Reproduce.** Write the smallest command or click path that shows the failure. Record the error code and the first useful line. If you cannot reproduce it, say what you tried and stop.
2. **Isolate the layer.** Renderer component → `lib/` wrapper → preload → guard → handler → service → repo → DB. The bug lives in the first layer whose inputs are right and whose outputs are wrong.
3. **Check the spec.** Re-read the PRD section for that behavior before changing it. A "bug" that matches the PRD is not a bug.
4. **Fix the layer you isolated.** No drive-by refactors. No new dependency unless the fix is impossible without one (`ward-dependency-check` first).
5. **Regression test.** A test that failed before the fix and passes after. Name it for the bug.
6. **Scan.** If the fix touched crypto, IPC, logging, or the renderer, run `node .cursor/skills/ward-security-review/scripts/scan.mjs`.

## Logging while you debug

The logger allowlists fields. You may log channel name, error code, byte length, and duration.

You may not log or print:

- master password, recovery key, vault key, KEK, RKEK
- entry passwords, note bodies, CSV contents
- header ciphertext, nonces, or salts from a real vault
- `JSON.stringify` of an IPC payload

Use the fixture password in tests. To see whether a buffer exists, log `byteLength`, not the bytes.

Remove temporary logs before the report. A `console.log` left in `src/main/crypto/` is a failed fix.

## Forbidden shortcuts

- Disabling CSP, `contextIsolation`, or `sandbox` to see if "that was it"
- Catching an error and returning `ok: true`
- Lowering Argon2 memory so a test is faster, without storing the real params in the header
- Opening the vault DB with a passphrase because the raw key "didn't work"
- Pointing the app at Miguel's real `userData` vault
- Printing a secret into the chat "just this once"

If the failure is inside a primitive from §4 and the code matches the PRD, stop and ask. Do not invent a new construction.

## Crypto and data failures

| Symptom | Look here first |
|---|---|
| Wrong password unlocks | AEAD associated data is not the same bytes on wrap and unwrap |
| Right password fails | Header tampered, params not the ones used to derive, or you hashed when you should unwrap |
| Wrong key opens the DB | Cipher was not applied. Check the open path and the spike notes |
| Search finds a password | FTS column list or a trigger copies `entries.password` |
| IPC returns LOCKED while unlocked | Allowlist inverted, or session state not the one you think |
| Restore leaves a partial vault | Replacement was not atomic. The original must still open |

## Report

```text
# Debug

## Symptom
## Reproduce
command or clicks
## Layer
the one layer that was wrong, and how you know
## Fix
files
## Regression
test name — failed before: yes/no — passes now: command
## Temp logs removed
yes
## Scan
clean | findings
## Awaiting
re-run the step, or GATE
```

## Hard stops

- Two failed hypotheses in a row: stop and write both, what you observed, and the next measurement. Do not thrash.
- A red test you did not write and do not understand: read it before changing production code.
- Do not declare the bug fixed without the regression command in the report.
