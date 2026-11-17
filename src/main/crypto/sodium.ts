import sodium from 'libsodium-wrappers-sumo'

export type SodiumModule = typeof sodium

let readyPromise: Promise<void> | null = null
let opened = false

export function initSodium(): Promise<void> {
  readyPromise ??= sodium.ready.then(() => {
    opened = true
  })
  return readyPromise
}

export function getSodium(): SodiumModule {
  if (!opened) throw new Error('Sodium is not ready.')
  return sodium
}

export function randomBytes(length: number): Uint8Array {
  if (!Number.isSafeInteger(length) || length < 1) {
    throw new Error('Random bytes failed.')
  }
  return getSodium().randombytes_buf(length)
}

/** Best-effort wipe. A JS string cannot be wiped. */
export function wipe(bytes: Uint8Array): void {
  getSodium().memzero(bytes)
}
