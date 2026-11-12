---
name: ward-feature-slice
description: >-
  Builds one Ward feature end to end from requirement IDs (repo, IPC, UI,
  all screen states, shortcuts, motion, tests). Use when implementing a PRD
  requirement such as VAULT-1, NOTE-2, TASK-3, INC-1, or a vertical slice
  inside the active phase.
---

# Ward feature slice

One requirement ID, all layers, then stop. A slice is done when that ID's acceptance behavior works, not when the screen looks started.

## When to run

The active phase includes a feature (Phases 5–11) and the step is a requirement ID such as `VAULT-3` or `INC-2`.

Do not use this to jump phases. `ward-step` still chooses which ID is this turn.

## Read first

- The feature section in `Ward-PRD.md` §6 for that ID, plus §7 for any screen you will touch.
- §3.4 if the slice needs a channel. Then follow `ward-ipc-endpoint` for that channel before writing the UI.
- §5 if the slice reads or writes a table. Schema changes go through `ward-migration` first.

## Map the ID before coding

Post this map in the plan. If a cell is "none", say why.

```text
ID:
User-visible behavior:
Repo:
IPC channels:
Main service:
Renderer feature path:
States: loading, empty, populated, no-results, error
Shortcut (from §7.8 or none):
Motion (from §7.5 or none):
Tests:
Out of scope for this ID:
```

## Build order

1. Repo or service, with a unit test, if the data shape is new.
2. IPC channel, with the tests in `ward-ipc-endpoint`.
3. Renderer wrapper in `lib/`.
4. UI. Tokens and `design/motion.ts` only. No raw hex, no raw durations.
5. All five states in §7.6. Empty is a sentence plus one action, not a blank pane.
6. Keyboard path for the action, including Esc and focus return if a dialog opens.
7. The acceptance check from the PRD, as a test when it can be automated.

Destructive actions name the object and the consequence. Trash is soft delete. Empty-trash and purge stay behind the confirm the PRD specifies.

## Screen rules that slices keep missing

- List payloads for entries do not contain passwords.
- Reveal auto-hides. Copy does not put the secret in the renderer just to copy it.
- Markdown and CSV text are untrusted. No raw HTML. No remote images.
- Money inputs parse to integer minor units. Reject negatives and more than two decimals.
- Status is not color alone. Pair it with an icon or text.
- Icon-only buttons have an `aria-label`. The label does not contain a secret.

## Report

```text
# Slice <ID>

## Behavior
what a user can do now
## Layers
repo | ipc | service | ui | tests — done or missing
## States
loading | empty | populated | no-results | error — where each is implemented
## Secrets
confirmed absent from list payloads | not applicable
## Commands
- npm test → …
## Not in this slice
## Awaiting
next ID or GATE
```

## Hard stops

- Do not implement the next ID in the same turn.
- Do not add a non-goal from §1.4 because it would make the slice "nicer" (TOTP, attachments, rich text, sync, NLP dates).
- If the ID's PRD text conflicts with §4, follow §4 and file the conflict with `ward-docs-sync` only after Miguel agrees.
