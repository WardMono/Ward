type PermissionSession = {
  setPermissionRequestHandler: (
    handler: (contents: unknown, permission: string, callback: (allowed: boolean) => void) => void
  ) => void
  setPermissionCheckHandler: (
    handler: (contents: unknown, permission: string, requestingOrigin: string) => boolean
  ) => void
}

/** Denies camera, microphone, geolocation, notifications, and every other permission. */
export function denyPermissions(ses: PermissionSession): void {
  ses.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false)
  })
  ses.setPermissionCheckHandler(() => false)
}
