import { BrowserWindow, dialog, shell } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { cspResponseHeaders } from './security/csp'
import { DENY_WINDOW, blockNavigation, openHttpsAfterConfirm } from './security/navigation-guard'
import { denyPermissions } from './security/permissions'
import { hardeningWebPreferences } from './security/web-preferences'
import { rendererTarget, type WindowLaunch } from './launch-target'

export function createMainWindow(launch: WindowLaunch): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 960,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: hardeningWebPreferences(
      join(__dirname, '../preload/index.js'),
      launch.allowDevTools
    )
  })

  win.setContentProtection(true)
  denyPermissions(win.webContents.session)
  const dev = launch.devServerUrl !== null
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const headers = cspResponseHeaders(details.url, details.responseHeaders, dev)
    callback({ responseHeaders: headers ?? details.responseHeaders })
  })
  win.webContents.on('will-navigate', (details) => {
    blockNavigation(details)
  })
  win.webContents.on('will-frame-navigate', (details) => {
    blockNavigation(details)
  })
  win.webContents.setWindowOpenHandler(() => DENY_WINDOW)

  win.on('ready-to-show', () => {
    win.show()
  })

  const target = rendererTarget(launch)
  if (target.kind === 'url') {
    void win.loadURL(target.url)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

/** Opens an https URL only after the user confirms. Navigation never calls this. */
export async function confirmAndOpenExternal(raw: string): Promise<void> {
  await openHttpsAfterConfirm(
    raw,
    async (url) => {
      const choice = await dialog.showMessageBox({
        type: 'question',
        buttons: ['Cancel', 'Open'],
        defaultId: 0,
        cancelId: 0,
        title: 'Open link',
        message: 'Open this link in your browser?',
        detail: url
      })
      return choice.response === 1
    },
    (url) => shell.openExternal(url)
  )
}
