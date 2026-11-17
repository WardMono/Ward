import { contextBridge, ipcRenderer } from 'electron'
import { APP_GET_VERSION, type AppVersion, type Result } from '../shared/ipc-contract'

if (!process.contextIsolated) {
  throw new Error('Context isolation is required.')
}

const ward = {
  getVersion: (): Promise<Result<AppVersion>> => ipcRenderer.invoke(APP_GET_VERSION)
}

contextBridge.exposeInMainWorld('ward', ward)
