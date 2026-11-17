import { app, BrowserWindow, ipcMain } from 'electron'
import { APP_GET_VERSION, type Result, type AppVersion } from '../../shared/ipc-contract'
import { emptyPayload, isAppSender } from './guard'

/** Registers app:getVersion. Call once. Other channels wait for Phase 3. */
export function registerAppHandlers(current: () => BrowserWindow | null): void {
  ipcMain.handle(APP_GET_VERSION, (event, payload: unknown): Result<AppVersion> => {
    const win = current()
    const windowContentsId = win === null || win.isDestroyed() ? null : win.webContents.id
    if (!isAppSender(event.sender.id, windowContentsId) || !emptyPayload(payload)) {
      return {
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'This request was refused.' }
      }
    }
    return { ok: true, data: { version: app.getVersion() } }
  })
}
