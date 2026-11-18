/* eslint-disable security/detect-non-literal-fs-filename -- the path is a temp directory created in this test */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import {
  VaultError,
  clearHeaderBackup,
  createVault,
  readVaultHeader,
  rewrapPassword,
  rotateRecovery,
  unlockWithPassword,
  unlockWithRecovery,
  writeVaultHeader
} from '../../src/main/crypto/vault-header'
import * as sodiumTools from '../../src/main/crypto/sodium'
import { initSodium } from '../../src/main/crypto/sodium'

const password = 'fixture-password'
const nextPassword = 'next-fixture-password'

let header: ReturnType<typeof createVault>['header']
let recoveryKey: string
let vaultKey: Uint8Array
const wipe = vi.spyOn(sodiumTools, 'wipe')

beforeAll(async () => {
  await initSodium()
  const created = createVault(password)
  header = created.header
  recoveryKey = created.recoveryKey
  vaultKey = created.vaultKey
}, 20000)

afterAll(() => {
  wipe.mockRestore()
})

test('the same password makes two different headers and both unlock', () => {
  const again = createVault(password)
  expect(again.header.kdf.salt === header.kdf.salt).toBe(false)
  expect(again.header.wrappedByPassword.nonce === header.wrappedByPassword.nonce).toBe(false)
  expect(Buffer.from(unlockWithPassword(header, password)).equals(vaultKey)).toBe(true)
  expect(Buffer.from(unlockWithPassword(again.header, password)).equals(again.vaultKey)).toBe(true)
  expect(Buffer.from(unlockWithRecovery(header, recoveryKey)).equals(vaultKey)).toBe(true)
  expect(wipe).toHaveBeenCalled()
}, 20000)

test('a new password rewraps the same vault key', () => {
  const changed = rewrapPassword(header, vaultKey, nextPassword)
  expect(Buffer.from(unlockWithPassword(changed, nextPassword)).equals(vaultKey)).toBe(true)
  expect(changed.wrappedByRecovery).toEqual(header.wrappedByRecovery)
  expect(changed.kdf).toEqual(header.kdf)
  expect(codeOf(() => unlockWithPassword(changed, password))).toBe('WRONG_PASSWORD')
  expect(Buffer.from(unlockWithRecovery(changed, recoveryKey)).equals(vaultKey)).toBe(true)
}, 20000)

test('rotating the recovery key leaves the password wrap alone', () => {
  const rotated = rotateRecovery(header, vaultKey)
  expect(rotated.header.wrappedByPassword).toEqual(header.wrappedByPassword)
  expect(
    Buffer.from(unlockWithRecovery(rotated.header, rotated.recoveryKey)).equals(vaultKey)
  ).toBe(true)
  expect(codeOf(() => unlockWithRecovery(rotated.header, recoveryKey))).toBe('WRONG_PASSWORD')
  expect(Buffer.from(unlockWithPassword(rotated.header, password)).equals(vaultKey)).toBe(true)
}, 20000)

test('tamper, a bad version, and a recovery typo fail closed', () => {
  expect(codeOf(() => unlockWithPassword({ ...header, formatVersion: 2 }, password))).toBe(
    'UNSUPPORTED_VERSION'
  )
  expect(codeOf(() => unlockWithPassword({ ...header, format: 'other' }, password))).toBe(
    'CORRUPT_VAULT'
  )
  expect(
    codeOf(() => unlockWithPassword({ ...header, createdAt: '2020-01-01T00:00:00.000Z' }, password))
  ).toBe('WRONG_PASSWORD')
  expect(
    codeOf(() => unlockWithPassword({ ...header, kdf: { ...header.kdf, alg: 'other' } }, password))
  ).toBe('CORRUPT_VAULT')
  expect(
    codeOf(() =>
      unlockWithPassword(
        { ...header, kdf: { ...header.kdf, memlimit: header.kdf.memlimit + 1 } },
        password
      )
    )
  ).toBe('WRONG_PASSWORD')
  expect(
    codeOf(() => unlockWithPassword({ ...header, kdf: { ...header.kdf, opslimit: 1 } }, password))
  ).toBe('CORRUPT_VAULT')
  expect(
    codeOf(() =>
      unlockWithPassword(
        { ...header, kdf: { ...header.kdf, salt: `${header.kdf.salt}AA` } },
        password
      )
    )
  ).toBe('CORRUPT_VAULT')
  const flipped = flip(header.wrappedByPassword.ciphertext)
  expect(
    codeOf(() =>
      unlockWithPassword(
        { ...header, wrappedByPassword: { ...header.wrappedByPassword, ciphertext: flipped } },
        password
      )
    )
  ).toBe('WRONG_PASSWORD')
  expect(
    codeOf(() =>
      unlockWithPassword(
        {
          ...header,
          wrappedByPassword: {
            ...header.wrappedByPassword,
            nonce: flip(header.wrappedByPassword.nonce)
          }
        },
        password
      )
    )
  ).toBe('WRONG_PASSWORD')
  expect(codeOf(() => unlockWithRecovery(header, `${recoveryKey.slice(0, -1)}2`))).toBe(
    'WRONG_PASSWORD'
  )
  expect(
    codeOf(() =>
      unlockWithRecovery(
        {
          ...header,
          wrappedByRecovery: {
            ...header.wrappedByRecovery,
            ciphertext: flip(header.wrappedByRecovery.ciphertext)
          }
        },
        recoveryKey
      )
    )
  ).toBe('WRONG_PASSWORD')
}, 30000)

test('a header file is replaced atomically and the backup is cleared after unlock', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ward-header-'))
  const file = join(directory, 'vault.header.json')
  const first = {
    format: 'ward-vault' as const,
    formatVersion: 1 as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    kdf: { alg: 'argon2id13' as const, salt: 'AAAA', opslimit: 3, memlimit: 268435456 },
    wrappedByPassword: { nonce: 'AAAA', ciphertext: 'BBBB' },
    wrappedByRecovery: { nonce: 'CCCC', ciphertext: 'DDDD' }
  }
  const second = { ...first, createdAt: '2026-02-01T00:00:00.000Z' }
  try {
    writeVaultHeader(file, first)
    expect(readVaultHeader(file).createdAt).toBe(first.createdAt)
    writeVaultHeader(file, second)
    expect(readVaultHeader(file).createdAt).toBe(second.createdAt)
    expect(JSON.parse(readFileSync(`${file}.bak`, 'utf8')).createdAt).toBe(first.createdAt)
    clearHeaderBackup(file)
    expect(codeOf(() => readVaultHeader(`${file}.bak`))).toBe('IO_ERROR')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

function flip(text: string): string {
  const last = text.slice(-1)
  return `${text.slice(0, -1)}${last === 'A' ? 'B' : 'A'}`
}

function codeOf(run: () => void): string {
  try {
    run()
  } catch (error) {
    if (!(error instanceof VaultError)) throw error
    expect(
      error.message === 'Wrong password.' ||
        error.message === 'Vault header was not accepted.' ||
        error.message === 'Vault header could not be read or saved.'
    ).toBe(true)
    expect(error.message.includes(password)).toBe(false)
    expect(error.message.includes(nextPassword)).toBe(false)
    expect(error.message.includes(recoveryKey)).toBe(false)
    return error.code
  }
  throw new Error('expected a vault error')
}
