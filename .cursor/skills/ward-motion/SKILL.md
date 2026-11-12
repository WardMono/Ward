---
name: ward-motion
description: >-
  Implements or audits Ward animations using design/motion.ts tokens,
  including the theme-switch circular reveal and reduced-motion fallbacks.
  Use when adding motion, editing theme.ts, or reviewing animation against
  PRD section 7.5.
---

# Ward motion

Motion explains a state change. It does not decorate. Every duration and easing comes from `src/renderer/src/design/motion.ts`. Theme changes go through `setTheme()` only.

## Read first

`Ward-PRD.md` §7.5 and §7.5.1. Read them from the file. Do not rely on a remembered table.

## Implement

- Import `dur`, `ease`, and `spring` from `design/motion.ts`. A literal `0.2` or `300` in a component is a defect.
- Animate `transform` and `opacity`. Height collapses use Framer's layout animation, not a tween on `top` or `width`.
- Mount and unmount with `AnimatePresence`. Reorder and shared selection with `layout` / `layoutId`.
- Load Framer with `LazyMotion` and `domAnimation`.
- Wrap the tree in `MotionConfig` whose `reducedMotion` follows the OS setting and the in-app override (system / on / off).
- Reduced motion: opacity fades of 120 ms or less. No translate, no scale, no stagger, no loop. Shimmer is static. Floating icons stop.
- Nothing blocks input. UI feedback stays between 80 ms and 320 ms. The theme reveal is the one exception at 560 ms, and it must not freeze clicks after it ends.

## Theme switch

Only `src/renderer/src/design/theme.ts` may set `data-theme`.

- Dark → light expands a circle from the toggle. Light → dark collapses that circle back into the toggle.
- Anticipation is the first 80 ms: radius 0 → 14 px and a 10 px nudge toward the window center.
- Total 560 ms. The `busy` flag drops clicks that arrive mid-transition.
- Reduced motion, or no origin: 120 ms crossfade, no circle.
- Missing `document.startViewTransition`: set the theme immediately.
- Origin is the toggle's `getBoundingClientRect()` at click time. Shortcut and palette use the registered toggle. An OS `system` change uses the window center.
- Persist with `prefs:set` after a successful switch. Do not add CSS transitions on color or background.
- No flash on launch: main reads `ui-prefs.json` before the window, sets `backgroundColor`, passes the theme via `additionalArguments`, and `theme-boot.js` in `<head>` sets `data-theme` before paint. That file is external. CSP forbids an inline script.

Acceptance IDs: THEME-1 through THEME-6 in §7.5.1. An audit names each one.

## Audit

When asked to review motion, walk every interaction in the §7.5 table that exists in the build. For each: file, token used, reduced-motion behavior, or "not built yet".

Grep, and put the hits in the report:

- Hex colors in `src/renderer` outside `styles/tokens.css` and the Tailwind theme mapping
- Duration or easing literals in components (numbers passed to `transition`, `animate`, or CSS `animation`)
- `dataset.theme` or `data-theme` writes outside `theme.ts` and `theme-boot.js`

A hit is a finding, not an automatic rewrite of unrelated UI. Fix hits in files this task owns. List the rest.

## Report

```text
# Motion

## Mode
implement | audit
## Tokens
motion.ts values used
## Interactions
- name — file — reduced motion: fade | removed | not built
## Theme
THEME-1 … THEME-6 — pass/fail/not built — evidence
## Grep hits
## Commands
## Awaiting
```

## Hard stops

- No GSAP, Lottie, or CDN. Those stay out until Phase 12 and only if the PRD's exception is actually needed.
- Do not animate the lock-screen shake or the theme reveal by setting colors in CSS.
- Do not announce secrets from a live region. Copy confirmation says the clipboard will clear, never the secret.
