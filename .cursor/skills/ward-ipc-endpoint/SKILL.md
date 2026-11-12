---
name: ward-ipc-endpoint
description: >-
  Adds one Ward IPC channel end to end: shared contract, Zod schema, sender
  and locked-state guard, handler, typed preload, renderer wrapper, and
  tests. Use when adding or changing an ipcMain handler, a window.ward
  method, or a channel in the IPC contract.
---

# Ward IPC endpoint

One channel per use of this skill. Renderer → `window.ward` → IPC → handler → service or repo → DB. Do not skip a layer.

## Read first

- `Ward-PRD.md` §3.3, §3.4, and the feature section for this channel.
- `src/shared/ipc-contract.ts` and `src/main/ipc/guard.ts` if they exist.
- Official Electron docs for `ipcMain.handle` and `contextBridge` if you are about to call an API you have not confirmed this session.

## Locked allowlist

Allowed while locked, and only these: `vault:status`, `vault:create`, `vault:unlock`, `vault:unlockWithRecovery`, `app:getVersion`, `prefs:get`, `prefs:set`.

Anything else returns `LOCKED` before it touches the DB. A new channel that must work while locked is a security change. Stop and ask. Do not add it to the allowlist because the UI is on the lock screen.

`prefs:*` is theme, reduced motion, window bounds, sidebar state. It reads `ui-prefs.json`. It is not a side door into vault settings.

## Files for one channel

All of these move together. If one is missing, the channel is not done.

| Piece | Path |
|---|---|
| Channel name, payload schema, result schema | `src/shared/ipc-contract.ts` and `src/shared/schemas/` |
| Sender check, Zod, locked allowlist | `src/main/ipc/guard.ts` |
| Handler | `src/main/ipc/handlers/<area>.ts` |
| Registration | `src/main/ipc/register.ts` |
| Typed preload, no generic `invoke` | `src/preload/index.ts` |
| Renderer wrapper | `src/renderer/src/lib/` |
| Tests | `tests/unit/` or `tests/integration/` |

Renderer components call the wrapper in `lib/`. They do not call `window.ward`.

## Handler shape

1. Confirm the sender frame is this app's window. Reject otherwise.
2. Parse the payload with Zod from `shared/`. Failure → `{ ok: false, error: { code: "INVALID_INPUT", message } }`.
3. If the channel is not on the locked allowlist and the session is locked → `LOCKED`.
4. Call the service or repo. Catch errors. Map unknown failures to `INTERNAL`.
5. Return `Result<T>`. The message is safe to show. No stack, no SQL, no secret, no path that reveals the vault key.

```ts
type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: { code: ErrorCode; message: string } };
type Result<T> = Ok<T> | Err;
```

`ErrorCode` stays the closed union in §3.4. Do not invent a code without adding it there and in the Zod schema.

## Secrets

- List channels never include a password field. `entries:get` returns `password: null` and `hasPassword`.
- The password reaches the renderer only from `entries:revealSecret`.
- `entries:copySecret` copies in the main process. The renderer receives an acknowledgement, not the secret.
- Do not log the payload. Log channel name, result code, and duration only.
- Events to the renderer are `session:locked`, `clipboard:cleared`, `backup:completed`. No other push unless the PRD adds one.

## Tests required before you call the channel done

- Valid payload, unlocked (or allowlisted): `ok: true` and the data shape.
- Bad payload: `INVALID_INPUT`, and the message does not echo a secret fixture.
- Locked session, channel not allowlisted: `LOCKED`.
- Wrong sender, if you can fake it: rejected.
- For any channel that could return a secret: assert the list/get path does not contain the fixture password `CorrectHorse!Battery#1`.

## Report

```text
# IPC — <channel>

## Layers
- contract — done/missing
- guard — done/missing
- handler — done/missing
- preload — done/missing
- renderer lib — done/missing
- tests — names

## Locked behavior
allowlisted | rejects with LOCKED — test name

## Secrets
what the success payload contains, and what it must not contain

## Commands
- npm test → …

## Awaiting
next step id, or GATE
```

## Hard stops

- No string-built channel names scattered in the renderer. The contract is the list.
- No `ipcRenderer` in a component.
- No Node APIs in the preload beyond `contextBridge` and the ipc module Electron's docs require for a bridge.
- SQL does not live in the handler. Call the repo.
