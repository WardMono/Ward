---
name: ward-test-writer
description: >-
  Turns Ward acceptance-criteria IDs into unit, integration, and end-to-end
  tests, including tamper, wrong-credential, and no-secrets-in-logs cases.
  Use when writing or extending Vitest or Playwright tests for a requirement
  or gate.
---

# Ward test writer

Every acceptance criterion you touch gets a test that can fail for a real reason. A test that always passes is not evidence.

## Read first

- The requirement ID in `Ward-PRD.md` §6 and the phase gate in §8.
- §9 for the layer: unit, integration, component, or E2E.
- Existing tests next to the code so you match the runner, not a new style.

## Where the test goes

| Kind | Place | Use for |
|---|---|---|
| Unit | `tests/unit/` | crypto, header, repos, money, search, generator, throttle, clipboard, CSV, audit, Zod |
| Integration | `tests/unit/` or `tests/integration/` | IPC guard, session, backup, temp encrypted DB |
| Component | renderer test setup the repo already has | forms, CopyButton, ListRow, markdown sanitizer |
| E2E | `tests/e2e/` | the ten flows in §9, Playwright Electron |

Do not add Playwright in a phase that has not asked for E2E. Phase 12 owns the full E2E pass. Earlier phases add unit and integration tests the gate names.

## Fixture rules

- The known password fixture is `CorrectHorse!Battery#1`. Use it when a test needs a real-looking secret.
- Assert that fixture does not appear in logger output, error messages, list payloads, or snapshots.
- Do not snapshot a decrypted note, a recovery key, or a vault header's ciphertext as a golden string you then paste into chat.
- Tamper tests flip one field at a time: salt, opslimit, memlimit, nonce, ciphertext, formatVersion. Each must fail closed.
- Wrong password and wrong recovery key assert `WRONG_PASSWORD` (or the IPC code the contract uses), not a thrown stack.
- Time tests use a fake clock. Do not `setTimeout` a real 30 s clipboard wait. Inject the delay.
- Money tests include a case where float math would drift (10 + 20 centavos, and values people write as 0.1 and 0.2).
- SQL injection fixtures are stored and read back as inert text. They are not executed.

## Shape of a test

Name the test after the behavior and the ID when there is one: `VAULT list payload omits password`.

Arrange on a temp directory that the test deletes. No vault files in the repo. No dependence on Miguel's `userData`.

One behavior per test. A round trip that hides a second assertion about logging should be two tests so a failure points at one thing.

## Secrets in the test output

If the assertion fails, Vitest will print the received value. Write assertions so a failure does not need to dump a secret to be diagnosable. Compare lengths, codes, and booleans when the secret itself is not the point. When the secret is the point (round trip), keep the fixture obvious and do not add extra `console.log`.

Mark the rows for this phase in [catalog.md](catalog.md). A row with no test name is not covered.

## Report

```text
# Tests

## IDs covered
- ID — test name — file
## Cases
- happy path
- wrong credential
- tamper (list fields)
- locked / invalid input
- no secret in logs or list payload
## Not automated
- what still needs a manual gate check, and why
## Commands
- npm test → X passed / Y failed

## Awaiting
```

## Hard stops

- Do not weaken an assertion to go green.
- Do not point tests at the real vault directory.
- Do not skip a tamper case the phase deliverables list.
- A flaky timeout is a bug. Fix the clock, do not raise the timeout until it happens to pass.
