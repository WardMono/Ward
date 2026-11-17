import { getSodium, wipe } from './sodium'

export const KEK_BYTES = 32
const DERIVE_FAILED = 'Key derivation failed.'

export interface KdfParams {
  alg: 'argon2id13'
  opslimit: number
  memlimit: number
}

export function defaultKdfParams(): KdfParams {
  const sodium = getSodium()
  return {
    alg: 'argon2id13',
    opslimit: sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    memlimit: sodium.crypto_pwhash_MEMLIMIT_MODERATE
  }
}

export function randomSalt(): Uint8Array {
  return getSodium().randombytes_buf(getSodium().crypto_pwhash_SALTBYTES)
}

export function deriveKek(password: string, salt: Uint8Array, params: KdfParams): Uint8Array {
  const sodium = getSodium()
  if (!kdfParamsAllowed(params, sodium)) throw new Error(DERIVE_FAILED)
  if (salt.byteLength !== sodium.crypto_pwhash_SALTBYTES) throw new Error(DERIVE_FAILED)

  const encoded = sodium.from_string(password)
  try {
    return sodium.crypto_pwhash(
      KEK_BYTES,
      encoded,
      salt,
      params.opslimit,
      params.memlimit,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    )
  } catch {
    throw new Error(DERIVE_FAILED)
  } finally {
    wipe(encoded)
  }
}

function kdfParamsAllowed(params: KdfParams, sodium: ReturnType<typeof getSodium>): boolean {
  if (params.alg !== 'argon2id13') return false
  // The sumo wrapper returns these two ceilings as signed 32-bit values (-1 and
  // -2147483648). They are uint32 limits: 4294967295 ops and 2147483648 bytes.
  const opsMax = sodium.crypto_pwhash_OPSLIMIT_MAX >>> 0
  const memMax = sodium.crypto_pwhash_MEMLIMIT_MAX >>> 0
  return (
    Number.isSafeInteger(params.opslimit) &&
    Number.isSafeInteger(params.memlimit) &&
    params.opslimit >= sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE &&
    params.opslimit <= opsMax &&
    params.memlimit >= sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE &&
    params.memlimit <= memMax
  )
}
