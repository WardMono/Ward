---
name: ward-release-check
description: >-
  Runs the Ward Phase 12 release checklist: packaging, native modules, zero
  outbound network, backup and restore drill, metrics, and README security
  notes. Use when the user says GO PHASE 12, asks for a release check, or
  prepares an installer.
---

# Ward release check

Phase 12 only, and only after he says so. This is the ship gate. Numbers are measured, not estimated.

## Read first

`Ward-PRD.md` §1.6, §7.5, §7.7, §9, §10, and the Phase 12 block in §8. Then `SECURITY-REVIEW.md`. If that file has an open FAIL, stop and say so. Do not package over it.

## Order

Do these in order. Do not start packaging before the motion, a11y, and performance passes have a result, even if the result is FAIL.

1. **Motion.** Run `ward-motion` as an audit. Fix distractions and reduced-motion gaps in this phase.
2. **Accessibility.** Run `ward-a11y-audit` on every main screen. axe serious/critical must be zero. Keyboard notes go in the report.
3. **Performance.** Measure on this machine and record the method:
   - Cold start to the lock screen. Target under 2 s on a mid-range laptop. Record what you measured here anyway.
   - Unlock, including KDF. Target under 1.5 s.
   - Search on 5,000 entries. Target under 100 ms.
   - Income at 1,000 rows and tasks at 200. They scroll without a stall you can see.
4. **E2E.** Playwright Electron for the ten flows in §9. Name each flow pass or fail.
5. **Network.** A full session with outbound traffic observed (OS firewall log, Electron session, or a proxy that would see a request). The result you need is zero requests. A dev run that talks to Vite's localhost is not a production session. Say which one you measured.
6. **Package.** `electron-builder` for Windows. Native modules unpack from asar and load. App icon and metadata present. Production has no DevTools and no shipped source maps.
7. **README.** Install, daily use, where the vault files live, how to back up, how to restore, and the warning that losing both the master password and the recovery key is permanent loss. State the §4.1 out-of-scope items in plain language.

## Restore drill

The gate wants a fresh profile, not the profile you developed on.

- Create a vault, add a known count of folders, entries, notes, tasks, and income.
- Back up.
- Open a clean `userData`.
- Restore.
- Compare counts and a sample of decrypted values.
- Tamper one byte of a copy of the backup and show verify rejects it.

If you cannot run a second profile, the drill is BLOCKED, not PASS.

## Uninstall

Document the vault path. Uninstall must not be the thing that deletes the only copy of the vault without the user knowing. Record what the installer actually does. If you did not uninstall, write NOT RUN.

## Report

Use the Phase 12 gate items from §8 inside the `ward-phase-gate` report, and add:

```text
# Release measurements

## Machine
OS, CPU if known, dev or packaged build
## Numbers
- cold start: value — method
- unlock: value — method
- search 5000: value — method
- income 1000 / tasks 200: what you saw
## Network
how observed — request count — dev or packaged
## E2E
- flow — pass/fail
## Package
path of the installer or unpacked build — native module loaded: yes/no
## README
path — recovery warning present: yes/no — vault path documented: yes/no
## Verdict
```

## Hard stops

- Do not add auto-update, crash reporting, or a phone-home "just for the release".
- Do not publish, tag, or push unless he asks.
- Do not call §1.6 met without the numbers in the report.
- A failed E2E flow is a FAIL. Do not skip it and ship the README anyway in the same breath. Fix it or stop and list it.
