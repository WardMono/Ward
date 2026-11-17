export type WindowLaunch = {
  allowDevTools: boolean
  devServerUrl: string | null
}

/** A packaged or non-dev launch never loads the Vite URL. */
export function rendererTarget(
  launch: WindowLaunch
): { kind: 'url'; url: string } | { kind: 'file' } {
  if (launch.allowDevTools && launch.devServerUrl !== null && launch.devServerUrl.length > 0) {
    return { kind: 'url', url: launch.devServerUrl }
  }
  return { kind: 'file' }
}
