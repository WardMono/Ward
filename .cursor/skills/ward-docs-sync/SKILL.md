---
name: ward-docs-sync
description: >-
  Updates Ward-PRD.md, the decision log, and the changelog when the build
  deviates from the spec so docs match the code. Use when a PRD conflict is
  resolved, a fallback is approved, a library API differs from the PRD, or
  the user asks to record a decision.
---

# Ward docs sync

The PRD stays the source of truth. When the code and the PRD diverge, record the divergence. Do not quietly edit the spec to match a shortcut.

## When to run

- Miguel approved a fallback (for example the DB encryption fallback in §2.2).
- Official library docs forced an API difference.
- Two PRD sections conflicted and the earlier one was followed (§0.2).
- He asks to update the PRD, the decision log, or the changelog.

## When not to run

- You prefer a different design. Stop and ask. Do not edit the PRD.
- The change touches cryptography and he has not approved it. Do not write a decision that pretends he did.

## Files

| File | Role |
|---|---|
| `Ward-PRD.md` | Change only the paragraphs that are now wrong. Mark the edit with the date and the decision id. |
| `docs/DECISIONS.md` | Append-only log. Create it on first use. |
| `docs/CHANGELOG.md` | User-visible behavior changes. Create it on first use. |

Do not create these during a normal build step. Create them when there is a real entry.

## Decision entry

Append this. Never rewrite an old entry. If a decision is reversed, add a new entry that points at the old id.

```text
## D-NNN — YYYY-MM-DD — short title

- Status: accepted | rejected | superseded by D-NNN
- PRD: section numbers
- Before: what the PRD said
- After: what the project will do
- Why: one paragraph
- Rejected alternatives:
- Security impact: none | described
- Approved by: Miguel, in chat on YYYY-MM-DD
- Code: paths
```

Ids are `D-001` upward. Read the file and take the next number.

## PRD edit rules

- Precedence still holds after the edit: Security > Data model > Features > Design > Phases.
- If you change a requirement ID or an acceptance criterion, add the old text under the decision's "Before" so it is not lost.
- Do not delete a Non-goal to make a feature legal. That requires a decision he approved.
- Do not weaken §4 to make a test pass.

## Changelog entry

```text
## Unreleased

- YYYY-MM-DD — D-NNN — what a user of Ward would notice
```

Skip the changelog when the change is internal only (tooling, test, comment). Say that in the report.

## Report

```text
# Docs sync

## Trigger
## Decision
D-NNN — title — accepted/rejected
## PRD edits
- section — one line
## Changelog
written | skipped (internal)
## Security impact
## Awaiting
GO to continue the current step, or nothing if this was the whole ask
```

## Hard stops

- No decision entry without his approval when the change affects §4, the threat model, or data loss behavior.
- No bulk rewrite of the PRD. Touch the sections that are wrong.
- Do not start the next build step in the same turn unless he said GO.
