import { expect, test } from 'vitest'
import { unwrapBytes, wrapBytes } from '../../src/main/crypto/aead'
import { initSodium, randomBytes } from '../../src/main/crypto/sodium'

const message = new Uint8Array([7, 7, 7, 7, 7, 7, 7, 7])
const associated = new Uint8Array([1, 1, 4])

test('a wrap round-trips and each wrap gets a new nonce', async () => {
  await initSodium()
  const key = randomBytes(32)
  const first = wrapBytes(key, message, associated)
  const second = wrapBytes(key, message, associated)

  expect(first.nonce.byteLength).toBe(24)
  expect(first.ciphertext.byteLength).toBe(message.byteLength + 16)
  expect(Buffer.from(first.nonce).equals(Buffer.from(second.nonce))).toBe(false)
  expect(Buffer.from(first.ciphertext).equals(Buffer.from(second.ciphertext))).toBe(false)
  expect(Buffer.from(unwrapBytes(key, first, associated)).equals(Buffer.from(message))).toBe(true)
  expect(Buffer.from(unwrapBytes(key, second, associated)).equals(Buffer.from(message))).toBe(true)
})

test('a wrong key, a flipped ciphertext, or flipped associated data is rejected', async () => {
  await initSodium()
  const key = randomBytes(32)
  const wrapped = wrapBytes(key, message, associated)
  const flippedCiphertext = Uint8Array.from(wrapped.ciphertext)
  flippedCiphertext[0] = flippedCiphertext[0]! ^ 1
  const flippedAssociated = Uint8Array.from(associated)
  flippedAssociated[0] = flippedAssociated[0]! ^ 1

  expect(() => unwrapBytes(randomBytes(32), wrapped, associated)).toThrow(/^Unwrap failed\.$/)
  expect(() =>
    unwrapBytes(key, { nonce: wrapped.nonce, ciphertext: flippedCiphertext }, associated)
  ).toThrow(/^Unwrap failed\.$/)
  expect(() => unwrapBytes(key, wrapped, flippedAssociated)).toThrow(/^Unwrap failed\.$/)

  try {
    unwrapBytes(randomBytes(32), wrapped, associated)
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error)
    expect(text).toBe('Unwrap failed.')
    expect(text.includes(String(message[0]))).toBe(false)
  }
})

test('a short key or empty associated data is refused', async () => {
  await initSodium()
  const key = randomBytes(32)
  expect(() => wrapBytes(key.subarray(0, 16), message, associated)).toThrow(/^Wrap failed\.$/)
  expect(() => wrapBytes(key, message, new Uint8Array())).toThrow(/^Wrap failed\.$/)
})
