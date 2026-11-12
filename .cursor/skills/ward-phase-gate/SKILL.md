---
name: ward-phase-gate
description: >-
  Checks every gate item for the current Ward phase against command output
  and file evidence, writes the Verification Report, and suggests the
  phase-N-done tag without creating it. Use when a phase's steps are
  finished, the user asks for the gate, sign-off, or Verification Report,
  or before claiming a phase is done.
---

# Ward phase gate

A phase is done only when every gate item has evidence. The report is the sign-off. Do not soften a fail.

## When to run

- Miguel says `GATE`, `sign off`, `verification report`, or `/ward-phase-gate`.
- The last step report says all prompt steps are in the tree, and he asks to close the phase.

Do not run the gate in the middle of a step unless he asks. Do not start the next phase after the report.

## Read first

1. The phase block in `Ward-PRD.md` §8: Goal, Deliverables, and **Gate**.
2. Appendix B.
3. Prior step reports in this chat, if any.
4. `SPIKE-REPORT.md` when the gate mentions spikes.

Copy the gate checklist from §8 verbatim into the report. Do not use a remembered shorter list.

## Evidence standard

| Status | Required proof |
|---|---|
| PASS | A command and exit code, a test name, a file:line, or a manual step you actually did and what you saw |
| FAIL | What failed, the output, what you tried |
| BLOCKED | What only Miguel can do (OS lock, a second profile, a machine you cannot reach) |
| NOT RUN | You did not check. This does not count as pass. |

"Should work", "likely", and "the code is there" are FAIL.

A gate item that needs `npm run dev` is PASS only if the app launched and you exercised the thing the item names.

## Commands

Run these unless the phase gate says the suite does not exist yet. From the repo root:

```text
npm run typecheck
npm run lint
npm test
```

Run `npm run dev` when the gate or the deliverables include a window. Run `node .cursor/skills/ward-security-review/scripts/scan.mjs` when the phase touched crypto, IPC, preload, CSP, or the renderer.

Quote failures. Do not hide a non-zero exit.

## Report

Write the report in chat. Also write `docs/gates/phase-N.md` so the next session can see it. Create `docs/gates/` only when writing this report.

Use [report.md](report.md). Fill every heading. Delete none.

## After the report

- If any gate item is FAIL or NOT RUN, the phase is not done. List the fixes. Stop. Do not tag.
- If every item is PASS or an accepted BLOCKED with Miguel's earlier written OK, suggest:

```text
branch: phase-N
tag: phase-N-done
commit: (one sentence, why)
```

Do not run `git tag`, `git commit`, or `git push` unless he asks in this message.

End with: `Awaiting your sign-off. Next is GO PHASE N+1 after you accept this gate.`

## Hard stops

- Do not mark a security gate PASS because a unit test passed if the gate asked for a manual check you did not do. Record both.
- Do not open phase N+1 files "to prepare".
- Coverage claims need the coverage tool's number. If you did not run coverage, write `coverage: not run`.
