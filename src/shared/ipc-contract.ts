/**
 * The one channel this step exposes. The rest of the contract arrives in Phase 3.
 * This file imports neither Node nor DOM.
 */
export const APP_GET_VERSION = 'app:getVersion'

export type ErrorCode =
  | 'LOCKED'
  | 'INVALID_INPUT'
  | 'WRONG_PASSWORD'
  | 'NOT_FOUND'
  | 'THROTTLED'
  | 'CORRUPT_VAULT'
  | 'UNSUPPORTED_VERSION'
  | 'IO_ERROR'
  | 'INTERNAL'

export type Ok<T> = { ok: true; data: T }
export type Err = { ok: false; error: { code: ErrorCode; message: string } }
export type Result<T> = Ok<T> | Err

export type AppVersion = { version: string }
