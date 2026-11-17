import { expect, test } from 'vitest'
import { deriveKek, defaultKdfParams, KEK_BYTES, randomSalt } from '../../src/main/crypto/kdf'
import { getSodium, initSodium, randomBytes, wipe } from '../../src/main/crypto/sodium'

const fixturePassword = 'fixture-password'

test('sodium helpers refuse work before init and wipe after it', async () => {
  expect(() => getSodium()).toThrow('Sodium is not ready.')
  await initSodium()
  await initSodium()

  const salt = randomSalt()
  expect(salt.byteLength).toBe(16)
  const sample = randomBytes(32)
  expect(sample.byteLength).toBe(32)
  expect(Buffer.from(sample).equals(Buffer.from(randomBytes(32)))).toBe(false)

  const secret = new Uint8Array([1, 2, 3, 4])
  wipe(secret)
  expect(Array.from(secret)).toEqual([0, 0, 0, 0])
  expect(() => randomBytes(0)).toThrow('Random bytes failed.')
})

test('default KDF params are MODERATE and not below INTERACTIVE', async () => {
  await initSodium()
  const params = defaultKdfParams()
  expect(params).toEqual({
    alg: 'argon2id13',
    opslimit: 3,
    memlimit: 268435456
  })
  expect(params.opslimit).toBeGreaterThanOrEqual(2)
  expect(params.memlimit).toBeGreaterThanOrEqual(67108864)
})

test('the same password and salt derive the same KEK', async () => {
  await initSodium()
  const params = defaultKdfParams()
  const salt = randomSalt()
  const first = deriveKek(fixturePassword, salt, params)
  const second = deriveKek(fixturePassword, salt, params)
  const other = deriveKek(fixturePassword, randomSalt(), params)

  expect(first.byteLength).toBe(KEK_BYTES)
  expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true)
  expect(Buffer.from(first).equals(Buffer.from(other))).toBe(false)
}, 20000)

test('a weak param or a bad salt fails without echoing the password', async () => {
  await initSodium()
  const params = defaultKdfParams()
  const salt = randomSalt()

  expect(() => deriveKek(fixturePassword, salt, { ...params, opslimit: 1 })).toThrow(
    'Key derivation failed.'
  )
  expect(() => deriveKek(fixturePassword, salt, { ...params, memlimit: 67108863 })).toThrow(
    /^Key derivation failed\.$/
  )
  expect(() => deriveKek(fixturePassword, salt.subarray(0, 8), params)).toThrow(
    /^Key derivation failed\.$/
  )

  try {
    deriveKek(fixturePassword, salt.subarray(0, 8), params)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    expect(message).not.toContain(fixturePassword)
    expect(message).toBe('Key derivation failed.')
  }
})
