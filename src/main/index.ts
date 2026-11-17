import { app, BrowserWindow } from 'electron'
import { electronApp, is } from '@electron-toolkit/utils'
import { loadCipherDriver } from './db/open'
import { registerAppHandlers } from './ipc/register'
import { createMainWindow } from './window'

let mainWindow: BrowserWindow | null = null

function openWindow(): void {
  mainWindow = createMainWindow({
    allowDevTools: !app.isPackaged,
    devServerUrl: is.dev ? (process.env['ELECTRON_RENDERER_URL'] ?? null) : null
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win === undefined) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('app.ward.desktop')
    loadCipherDriver()
    registerAppHandlers(() => mainWindow)
    openWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) openWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
