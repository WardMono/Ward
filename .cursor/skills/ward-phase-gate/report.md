# Phase N Verification Report

Copy this skeleton. Replace N and every placeholder. Leave a heading even when the answer is "none".

```text
# Phase N Verification Report

## Summary
(2-3 sentences: what is in the tree now, and whether the gate passes)

## Requirement IDs
- ID — met | not met | not in this phase — evidence

## Files created / modified
- path — purpose

## Commands run
- `npm run typecheck` → PASS/FAIL (exit, first error if any)
- `npm run lint` → PASS/FAIL
- `npm test` → X passed / Y failed (name the failures)
- `npm run dev` → launched OK / issues / not required
- scan script → high count, or not required

## Gate checklist
Copied from Ward-PRD.md §8 Phase N. One line each. No item dropped.

- [ ] item — PASS — evidence
- [ ] item — FAIL — output and what was tried
- [ ] item — BLOCKED — what Miguel must do
- [ ] item — NOT RUN — why

## Secrets and hardening
- Scan findings judged harmless, with file:line, or "scan clean"
- Confirm no master password, recovery key, vault key, or entry secret in this report

## Deviations from the PRD
(none, or: section, what the code does, why, whether Miguel approved)

## Library versions pinned / API differences
- package@version — docs URL — difference from the PRD, or "matches"

## Known issues / risks
(or none)

## Not done
- items outside this phase that a reader might think are included

## Suggested git
- branch: phase-N
- tag (do not create unless asked): phase-N-done
- commit message draft:

## Verdict
PASS | FAIL

## Awaiting
Waiting for Miguel to sign off. Next command after sign-off: GO PHASE N+1.
```

## How to fill the gate

1. Open §8 for this phase. Paste each gate bullet unchanged, then add the status and evidence.
2. A checkbox in the PRD that says "test or documented manual check" needs one of those, named.
3. Metrics (timings, row counts, contrast) need the number you measured and how.
4. If two sections of the PRD conflict, the earlier section wins (§0.2). Record the conflict under Deviations. Do not "fix" the later section during a gate unless he asked for `ward-docs-sync`.

## Verdict rule

- Any FAIL or NOT RUN → verdict FAIL.
- BLOCKED → verdict FAIL unless he already accepted that item in writing.
- All PASS → verdict PASS. Suggest the tag. Stop.
