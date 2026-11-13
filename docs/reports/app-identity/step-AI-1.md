# Step AI-1 — Inventory and plan

**Command:** WARD-APP-IDENTITY
**Date:** 2026-11-13
**Mode:** read-only. No app source was changed.
**Verdict:** PASS for the inventory. AI-2 is blocked until the Ward icon kit is in the repo and Miguel answers the two questions below.

`.cursor/rules/ward-process.mdc` is not in the repo. This report follows the header and evidence rules in the command itself.

## Decisions (where 1.1 doubled an existing rule)

| Double | Choice | Why |
|---|---|---|
| Pasted §8 and Appendix A say "do the whole phase, then the gate." Repo §0.4, `ward.mdc`, and the persona say one numbered step, then stop. | Keep step stops. | Granularity rule already says the step stop wins. Section 4 still wins on security. The identity command is itself step-gated. |
| Pasted Appendix A adds desktop-app and icon rules and drops the step-stop lines. | Merge both when the PRD is updated. Do not replace `ward.mdc` yet. | AI-1 does not edit source or rules. The identity lines are accepted product rules. |
| Spec placeholder `appId` is `com.ward.desktop`. Code today is `app.ward.desktop`. | Do not change code. Miguel confirms. | It cannot change after the first release without breaking upgrades and pinned taskbar buttons. The current value was set at scaffold and has not shipped. |
| Copyright line | Do not invent a name. | PRD says Miguel supplies the exact name. |
| Uploaded skills are longer copies of skills already in `.cursor/skills/`. They require `ward-process.mdc`, report templates, and `docs/CHANGELOG.md`, which are not here. | Keep the skills already in the repo. | Swapping them now would make the next step look for files that do not exist. WCAG bar stays 2.1 AA. Electron fuses stay out until a dependency check. |
| PRD file on disk | Still the repo copy (1.0 plus §0.4). 1.1 is accepted as product text, not written into `Ward-PRD.md` in this step. | This step is read-only. The merge happens on a later GO, and it must keep §0.4. |

## What is on disk

| Item | Value |
|---|---|
| `package.json` name | `ward` |
| productName | not in `package.json`. `electron-builder.yml` has `productName: Ward` |
| version | `1.0.0` |
| description | `Local encrypted vault and life workspace. No accounts, no cloud.` |
| author | `Miguel` |
| main | `./out/main/index.js` |
| Window code | `src/main/index.ts`. `src/main/window.ts` does not exist. |
| Builder file | `electron-builder.yml` exists. It is the electron-vite template, not the §7.10 NSIS sketch. |

### Window (`src/main/index.ts`)

- Size 1200×780, min 960×620, `show: false`, then `show` on `ready-to-show`.
- `autoHideMenuBar: true`. Menu is not set to `null`. No `before-input-event` lockdown. No edit-only context menu.
- Icon is applied only when `process.platform === 'linux'`. Windows gets no `BrowserWindow` icon option.
- No `backgroundColor`. No theme read.
- `sandbox: false`.
- `setWindowOpenHandler` calls `shell.openExternal` on any URL, then denies the new window.
- Dev: `loadURL(ELECTRON_RENDERER_URL)`. Production: `loadFile` of the packaged `index.html`.
- `electronApp.setAppUserModelId('app.ward.desktop')` runs inside `app.whenReady()`, before `createWindow()`, after ready. Spec wants `app.setAppUserModelId` before any window.
- `optimizer.watchWindowShortcuts` is on (toolkit: F12 DevTools in dev, ignore reload shortcut in production). Not the §7.10 production block list.
- No `requestSingleInstanceLock` in this file.
- HTML `<title>` is `Ward`. Main process never sets a window title from user content. No user content exists yet.

### Icons (checked 2026-11-13)

Command for the ICO frames:

```text
python - struct.unpack ICO directory of build/icon.ico
```

Result: 6 frames, 16, 32, 48, 64, 128, 256. Missing the 24 px frame. `build/icon.png` and `resources/icon.png` are both 512×512. These are the electron-vite template icons, not the Ward shield.

Missing, so AI-2 must not invent them:

- `design/icon/` (no `icon.svg`, `icon-small.svg`, `overlay-unlocked.svg`, `build-icons.py`)
- `build/icon.png` at 1024
- `resources/icon.png` at 256
- `resources/overlay-unlocked.png` (16) and `@2x` (32)
- ICO frame at 24

## Requirements 1–10

| # | Requirement | Current state | Gap | Files to change later |
|---|---|---|---|---|
| 1 | Ward icon everywhere | Template Electron icon. Linux-only window icon. ICO is 6 frames, PNG is 512. | Ward shield kit is not in the repo. | Icon kit from Miguel. Then `src/main/index.ts`, `electron-builder.yml`. Do not hand-edit art. |
| 2 | NSIS per-user installer | `npm run package` is `electron-builder --win`. NSIS block is the template (`createDesktopShortcut: always`). | Not the §7.10 sketch. No `oneClick: false`, `perMachine: false`, folder choice, or offline note. | `electron-builder.yml` in AI-6. |
| 3 | Uninstall keeps the vault | `deleteAppDataOnUninstall` is unset. | Must be set `false` and stated in the README. | `electron-builder.yml`, README, in AI-6. |
| 4 | One identity | `Ward` / `1.0.0` agree. appId is `app.ward.desktop` in yml and in `setAppUserModelId`. Spec placeholder is `com.ward.desktop`. No copyright string. | Confirm appId and copyright before writing them in more than one place. | `package.json`, `electron-builder.yml`, `src/main/index.ts`. About screen is Phase 11. |
| 5 | Not a website | Production path is `loadFile`. Dev path is a localhost URL. | No packaged-app proof. No test that the production URL is not `http`. | AI-4. `src/main/index.ts` plus a test. |
| 6 | App behavior, not browser | Menu bar is auto-hidden, not removed. Toolkit shortcut watcher only. External links open with no confirm. | Production lockdown is step 0.4 plus AI-3. | `src/main/index.ts` (or `window.ts` when 0.4 splits it). |
| 7 | No flash | Hidden until `ready-to-show`. | No themed `backgroundColor`. `ui-prefs.json` does not exist yet. | `src/main/index.ts`, prefs, in AI-2 as far as a static theme color can go. Full theme boot is Phase 3. |
| 8 | Single instance | Not implemented. | Second launch can start a second process. | `src/main/index.ts` in AI-3. |
| 9 | Title never leaks | Title is the static string `Ward`. | No module suffix yet. No code path puts user content in the title. Keep it that way. | Window title helper when modules exist. |
| 10 | Unlocked badge | No overlay. No session state machine. | AI-5 builds the module against a typed interface and does not build the session. | New overlay module. Wiring waits for Phase 3. |

## Questions (the only two)

1. appId. Proposal: `com.ward.desktop`. It is a placeholder. After the first release it cannot change without breaking upgrades and taskbar pins. The repo currently says `app.ward.desktop`. Say which value to keep.
2. The exact name for `Copyright © 2026 {name}`.

## Awaiting

GO for step AI-2, after the icon kit is in `build/`, `resources/`, and `design/icon/`, and after the two answers above.
