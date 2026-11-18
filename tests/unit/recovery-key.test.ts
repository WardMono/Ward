import { expect, test } from 'vitest'
import {
  RECOVERY_CONTEXT,
  createRecoveryKey,
  decodeRecoveryKey,
  deriveRkek,
  encodeRecoveryKey
} from '../../src/main/crypto/recovery-key'
import { getSodium, initSodium } from '../../src/main/crypto/sodium'

const zeros = new Uint8Array(32)
const one = new Uint8Array(32)
one[31] = 1

test('a zero key encodes as Crockford groups with a zero check symbol', async () => {
  await initSodium()
  const display = encodeRecoveryKey(zeros)
  expect(display.replaceAll('-', '') === `${'0'.repeat(52)}0`).toBe(true)
  expect(display.split('-')).toHaveLength(14)
  expect(Buffer.from(decodeRecoveryKey(display)).equals(Buffer.from(zeros))).toBe(true)
  expect(Buffer.from(decodeRecoveryKey(display.slice(0, -2))).equals(Buffer.from(zeros))).toBe(true)
  expect(
    Buffer.from(decodeRecoveryKey(display.toLowerCase().replaceAll('-', ' '))).equals(zeros)
  ).toBe(true)
  expect(
    Buffer.from(decodeRecoveryKey(display.replace('0', 'O').replace('0', 'o'))).equals(zeros)
  ).toBe(true)
})

test('the integer 1 ends in the symbol 1 and check symbol 1', async () => {
  await initSodium()
  const display = encodeRecoveryKey(one)
  expect(display.replaceAll('-', '') === `${'0'.repeat(51)}11`).toBe(true)
  expect(Buffer.from(decodeRecoveryKey(display)).equals(Buffer.from(one))).toBe(true)
})

test('a substituted or transposed symbol is rejected without echoing the key', async () => {
  await initSodium()
  const display = encodeRecoveryKey(one)
  const symbols = display.split('-')
  const body = symbols.slice(0, -1)
  const check = symbols[13]
  body[12] = '0002'
  const substituted = `${body.join('-')}-${check ?? ''}`
  const transposedBody = `${'0'.repeat(50)}10`
  const transposed = `${transposedBody.match(/.{4}/g)?.join('-') ?? ''}-1`

  expect(() => decodeRecoveryKey(substituted)).toThrow(/^Recovery key was not accepted\.$/)
  expect(() => decodeRecoveryKey(transposed)).toThrow(/^Recovery key was not accepted\.$/)
  expect(() => decodeRecoveryKey('not a key')).toThrow(/^Recovery key was not accepted\.$/)

  try {
    decodeRecoveryKey(substituted)
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error)
    expect(text).toBe('Recovery key was not accepted.')
    expect(text.includes(substituted)).toBe(false)
  }
})

test('the RKEK is a keyed BLAKE2b fingerprint of the recovery key', async () => {
  await initSodium()
  const sodium = getSodium()
  const first = createRecoveryKey()
  const second = createRecoveryKey()
  const derived = deriveRkek(first.secret)
  const again = deriveRkek(first.secret)
  const direct = sodium.crypto_generichash(
    sodium.crypto_generichash_BYTES,
    first.secret,
    RECOVERY_CONTEXT
  )

  expect(first.secret.byteLength).toBe(32)
  expect(derived.byteLength).toBe(32)
  expect(Buffer.from(first.secret).equals(Buffer.from(second.secret))).toBe(false)
  expect(Buffer.from(derived).equals(Buffer.from(again))).toBe(true)
  expect(Buffer.from(derived).equals(Buffer.from(direct))).toBe(true)
  expect(Buffer.from(derived).equals(Buffer.from(deriveRkek(second.secret)))).toBe(false)
  expect(() => deriveRkek(first.secret.subarray(0, 16))).toThrow(
    /^Recovery key was not accepted\.$/
  )
  expect(Buffer.from(decodeRecoveryKey(first.display)).equals(Buffer.from(first.secret))).toBe(true)
})
