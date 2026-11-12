---
name: ward-design-review
description: >-
  Reviews Ward UI as a senior designer against PRD section 7: tokens,
  layout, states, motion, copy, and accessibility. Use when a screen or
  primitive is ready for review, or the user asks for a design review.
---

# Ward design review

Review like a senior product designer who is stingy with chrome. The PRD's §7 is the spec. Taste does not override a token.

## When to run

A screen, primitive, or the `/design` route is ready, or Miguel asks for a design review. Use `ward-a11y-audit` for the full keyboard and contrast pass. Use `ward-motion` for the motion table. This skill is the visual and structural review, and it points at those two instead of duplicating a shallow version.

## Read first

`Ward-PRD.md` §7.1 through §7.9, especially the tokens, the layout numbers, the component list, and the copy rules.

Look at the running screen. A review from source alone must say "source only" and cannot pass a visual gate.

## What to look at

**Hierarchy.** Title, then content, then quiet metadata. Spacing separates groups. Hairline borders, not heavy shadows. Elevation uses `elev-1`, `elev-2`, `elev-3` plus a 1 px `--border-subtle` ring.

**Density.** Rows about 44 px. Detail text measure stays within 720 px. Sidebar 240 px or 64 px rail. List pane 340–420 px.

**Tokens.** Colors, radii (6, 10, 14, 999), and the 4 px spacing scale. No raw hex in components. No magic sizes that fight the scale without a reason you can point to in §7.

**Type.** Inter for UI. JetBrains Mono for secrets, ids, and money, with tabular numbers where columns align. Display is for lock and welcome only.

**States.** Loading (skeleton after 200 ms, not a flash), empty (icon, one sentence, one action), populated, no results (query echoed, clear filters), error (what happened, what to try, retry). Locked where the screen can be locked.

**Secrets.** Masked passwords are a fixed mask, not a string of dots whose count leaks the length. Reveal is deliberate. Copy states match §7.4: idle, copying, copied, clearing, idle.

**Copy.** Calm and specific. "That password didn't work." Security copy says "encrypted on this device", never "unhackable" or "military grade".

**Theme.** Both themes use the same token names. Light is the override under `[data-theme="light"]`. The switch is the circular reveal, not a crossfade of colors, unless reduced motion is on.

**Chrome you should remove.** Extra cards around a single label, icons that repeat the heading, a second accent color, gradient decoration, a toast that says "Success!".

## Findings

```text
- BLOCKER — breaks a §7 rule the user will hit (missing state, secret length leak, wrong theme mechanism)
- HIGH — token or layout miss on a primary screen
- MEDIUM — spacing, type, or copy that is off but usable
- LOW — polish
```

Each finding: what you saw, the PRD paragraph, the file if you know it, and the change in one sentence.

For a `/design` or shell review, copy [checklist.md](checklist.md) into the report and fill every row you are responsible for.

## Report

```text
# Design review — <screen>

## Looked at
running app | source only
## Holds up
(short)
## Findings
- LEVEL — observation — PRD ref — fix
## States present
loading | empty | populated | no-results | error
## Tokens
violations, or none found in the files you opened
## Copy
lines that overclaim or talk in marketing
## Hand off
a11y: done | needs /ward-a11y-audit
motion: done | needs /ward-motion
## Verdict
PASS if no BLOCKER or HIGH

## Awaiting
```

## Hard stops

- Do not restyle the product while reviewing unless he asked you to fix the findings in the same turn.
- Do not add a component §7.4 does not list, and do not import a new visual library.
- Do not fetch fonts, icons, or images from the network to "match the mock".
