---
name: ward-a11y-audit
description: >-
  Audits Ward keyboard paths, focus return, labels, contrast, live regions,
  and hit targets, and records axe results. Use when reviewing UI
  accessibility, before closing a UI phase, or when the user asks for an
  a11y pass.
---

# Ward accessibility audit

WCAG 2.1 AA is the bar. An audit lists what you checked and what you did not. It does not say "accessible" as a summary with no rows.

## Read first

`Ward-PRD.md` §7.7 and §7.8. The screen you are auditing, in the running app when `npm run dev` works.

## Check, in order

1. Keyboard only. Tab through the screen. Open and close each dialog, menu, and sheet. Focus returns to the trigger. Esc closes the top layer only.
2. Lists. Roving tabindex, arrow keys, Home, End. A selection you can reach with a pointer must have a key path.
3. Names. Every icon button has an `aria-label`. The accessible name is not the secret and not "button".
4. Landmarks and headings. `nav`, `main`, `aside`. One h1. Heading levels do not skip.
5. Live regions. Toasts and copy confirmation use `aria-live="polite"`. The copy announcement does not include the secret. Loading sets `aria-busy`.
6. Focus ring. 2 px, offset 2 px, `--focus-ring`. No `outline: none` unless a visible replacement is on the same element.
7. Hit targets. At least 32 × 32 px. Board controls at least 44 × 44 px.
8. Status. Color is paired with icon or text (overdue, weak, paid, pending, locked).
9. Contrast. Check text/background token pairs that this screen uses. Record the pair, the two values, and the ratio. AA is 4.5:1 for body text and 3:1 for large text and UI boundaries. If you cannot measure, write NOT RUN, not PASS.
10. Motion. With reduced motion on, the screen has no stagger, no loop, and no essential information conveyed only by animation.
11. axe, when Playwright is in the repo (Phase 12, or earlier if the dependency is already pinned). Serious and critical are FAIL. Record the rule id.

## Severity

| Level | Meaning |
|---|---|
| BLOCKER | Cannot operate the action with a keyboard, or a secret is in the accessible name |
| HIGH | Missing name, focus lost, contrast below AA on text the user must read |
| MEDIUM | Hit target, heading order, status color alone |
| LOW | Copy or tooltip wording that is unclear but operable |

## Report

```text
# A11y — <screen>

## How checked
keyboard | contrast method | axe version or not run
## Findings
- LEVEL — what — where — how to tell it failed
## Shortcuts on this screen
- keys — works | broken | not built
## Contrast
- token on token — ratio — AA pass/fail
## Not checked
## Verdict
PASS only if there is no BLOCKER or HIGH

## Awaiting
```

Fix BLOCKER and HIGH in files this phase owns before you call a UI gate PASS. Do not drive-by restyle unrelated screens. List those as follow-ups.

## Hard stops

- Do not put a password, recovery key, or note body in `aria-label`, `title`, or a live region to "help" a test.
- Do not turn off the focus ring to make a screenshot look cleaner.
- A screen reader note you did not actually hear is NOT RUN. Say so.
