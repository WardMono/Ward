/**
 * BrowserWindow webPreferences for section 4.7.
 * enableRemoteModule is omitted. Electron no longer has that option.
 */
export function hardeningWebPreferences(
  preloadPath: string,
  allowDevTools: boolean
): {
  preload: string
  contextIsolation: true
  nodeIntegration: false
  sandbox: true
  webSecurity: true
  allowRunningInsecureContent: false
  webviewTag: false
  devTools: boolean
} {
  return {
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    devTools: allowDevTools
  }
}
