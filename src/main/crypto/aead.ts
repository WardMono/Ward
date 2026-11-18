import { getSodium, randomBytes } from './sodium'

const WRAP_FAILED = 'Wrap failed.'
const UNWRAP_FAILED = 'Unwrap failed.'

export interface WrappedBytes {
  nonce: Uint8Array
  ciphertext: Uint8Array
}

export function wrapBytes(
  key: Uint8Array,
  message: Uint8Array,
  associatedData: Uint8Array
): WrappedBytes {
  const sodium = getSodium()
  const keyBytes = sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES
  if (!accepted(key, message, associatedData, keyBytes)) {
    throw new Error(WRAP_FAILED)
  }

  const nonce = randomBytes(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)
  try {
    const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      message,
      associatedData,
      null,
      nonce,
      key
    )
    return { nonce, ciphertext }
  } catch {
    throw new Error(WRAP_FAILED)
  }
}

export function unwrapBytes(
  key: Uint8Array,
  wrapped: WrappedBytes,
  associatedData: Uint8Array
): Uint8Array {
  const sodium = getSodium()
  const keyBytes = sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES
  if (
    !accepted(key, wrapped.ciphertext, associatedData, keyBytes) ||
    wrapped.nonce.byteLength !== sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES ||
    wrapped.ciphertext.byteLength < sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES
  ) {
    throw new Error(UNWRAP_FAILED)
  }

  try {
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      wrapped.ciphertext,
      associatedData,
      wrapped.nonce,
      key
    )
  } catch {
    throw new Error(UNWRAP_FAILED)
  }
}

function accepted(
  key: Uint8Array,
  message: Uint8Array,
  associatedData: Uint8Array,
  keyBytes: number
): boolean {
  return key.byteLength === keyBytes && message.byteLength > 0 && associatedData.byteLength > 0
}
