/** The sender must be the current app window. A missing window is not trusted. */
export function isAppSender(senderId: number, windowContentsId: number | null): boolean {
  return windowContentsId !== null && senderId === windowContentsId
}

/** app:getVersion takes no payload. Zod arrives with the rest of the IPC contract in Phase 3. */
export function emptyPayload(payload: unknown): boolean {
  return payload === undefined
}
