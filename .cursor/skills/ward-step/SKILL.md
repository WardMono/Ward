---
name: ward-step
description: >-
  Runs exactly one Ward build step from Ward-PRD.md, verifies it, writes a
  step report, and stops until the user says GO. Use when the user says GO
  PHASE, GO step, /ward-step, or names a numbered step such as 0.3 or 3.2.
  Do not use for design review, security review, debugging, or open questions.
---

# Ward step

One numbered step. Then stop. A phase prompt is a list of steps, not permission to finish the phase.

## When to run

- `GO PHASE N` — do the next incomplete step of phase N only.
- `GO N.M` or `/ward-step N.M` — do that step only.
- `GO` after a step report — do the next incomplete step of the same phase.

## When not to run

- The user asked a question, a review, or a debug. Use the matching skill.
- They said `GATE`, `sign off`, or `verification report`. Use `ward-phase-gate`.
- They said `do the whole phase`. Say that the default is one step, then do the whole phase only if they repeat that they want every step in this turn.

## Read first

1. `Ward-PRD.md` §0, then the phase block in §8, then every section that phase names.
2. `SPIKE-REPORT.md` if the phase depends on a spike result.
3. Official docs for any library this step will call. Read them this session. Do not trust memory.

## Pick the step

The step list is the numbered list inside that phase's **Prompt** in §8. Read it from the PRD each time.

- A line that only forbids work ("Do NOT build…") is a constraint on every step, not a step.
- The next incomplete step is the first number whose deliverable is not in the tree and not already verified in a step report.
- If you cannot tell, say which step you think is next and stop. Do not guess by building.

## Before writing code

Post this, then build. Max 10 lines in the plan.

```text
## Plan
1. …

## Files
- path — create or modify — why

## Assumptions
- …

## Docs checked
- package — doc URL — API you will call — conflict with PRD: yes/no
```

If there is no new library, write `Docs checked: none`.

If docs and the PRD disagree on an API, follow the docs for the call shape and the PRD for behavior. Name the conflict in the plan. If the conflict changes security (KDF, AEAD, key storage, IPC trust), stop and ask. Do not invent a third design.

## Build rules

- Touch only the files in the plan. If you need another file, add it to the plan before editing it.
- Complete files on disk. No partial placeholders, no `TODO` that hides unfinished step work.
- No new dependency unless `ward-dependency-check` has a PASS card for it in this conversation.
- No feature from a later phase. No "while I'm here".
- Secrets never go to logs, error strings, snapshots, or the chat.

## Verify the step

Run the smallest commands that can falsify the step. Record real exit codes.

- TypeScript changed: `npm run typecheck`
- Logic changed: the test that covers this step, or `npm test` if the suite is small
- A window or layout change: launch and look. Say what you clicked and what you saw.
- Crypto or IPC touched: `node .cursor/skills/ward-security-review/scripts/scan.mjs`

A step with no command and no observed behavior is not verified.

## Step report

Fill every heading. Paste the command summary from the terminal, not a paraphrase.

```text
# Step N.M report

## Did
(one sentence)

## Files
- path — create | modify | delete

## Commands
- command → exit code — one line of real output

## Checks
- PASS/FAIL — what you observed

## Constraints held
- Later-phase work was not started: yes/no
- Secrets absent from the output you captured: yes/no

## Deviations
(none, or PRD section + what differed)

## Not done
- remaining steps in this phase

## Awaiting
GO N.M+1
```

After the last prompt step, replace the awaiting line with: `All prompt steps for phase N are in the tree. Say GATE to run /ward-phase-gate. Do not start phase N+1.`

Examples of the turn boundary: [examples.md](examples.md).

## Hard stops

- Missing `Ward-PRD.md`: stop and ask Miguel to put it at the repo root.
- Phase N when phase N-1 has no passing gate report: stop and say so.
- A failing command: fix it inside this step or mark the step FAIL. Do not move on.
- Any urge to "just finish the phase": stop after the report.
