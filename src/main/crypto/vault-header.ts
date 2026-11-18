/* eslint-disable security/detect-non-literal-fs-filename -- the header path is chosen by main, not by a request */
import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeSync
} from 'node:fs'
import * as z from 'zod'
import type { ErrorCode } from '../../shared/ipc-contract'
import { unwrapBytes, wrapBytes, type WrappedBytes } from './aead'
import { defaultKdfParams, deriveKek, type KdfParams } from './kdf'
import { createRecoveryKey, decodeRecoveryKey, deriveRkek } from './recovery-key'
import { getSodium, randomBytes, wipe } from './sodium'

const VAULT_KEY_BYTES = 32

type HeaderCode = Extract<
  ErrorCode,
  'WRONG_PASSWORD' | 'UNSUPPORTED_VERSION' | 'CORRUPT_VAULT' | 'IO_ERROR'
>

export class VaultError extends Error {
  readonly code: HeaderCode

  constructor(code: HeaderCode) {
    super(headerMessage(code))
    this.name = 'VaultError'
    this.code = code
  }
}

const wrappedSchema = z.strictObject({
  nonce: z.string().min(1),
  ciphertext: z.string().min(1)
})

export const vaultHeaderSchema = z.strictObject({
  format: z.literal('ward-vault'),
  formatVersion: z.literal(1),
  createdAt: z.iso.datetime(),
  kdf: z.strictObject({
    alg: z.literal('argon2id13'),
    salt: z.string().min(1),
    opslimit: z.int().min(1),
    memlimit: z.int().min(1)
  }),
  wrappedByPassword: wrappedSchema,
  wrappedByRecovery: wrappedSchema
})

export type VaultHeader = z.infer<typeof vaultHeaderSchema>

export function parseVaultHeader(value: unknown): VaultHeader {
  if (isUnsupportedVersion(value)) throw new VaultError('UNSUPPORTED_VERSION')
  const parsed = vaultHeaderSchema.safeParse(value)
  if (!parsed.success) throw new VaultError('CORRUPT_VAULT')
  return parsed.data
}

export function createVault(password: string): {
  header: VaultHeader
  recoveryKey: string
  vaultKey: Uint8Array
} {
  const params = defaultKdfParams()
  const salt = freshSalt()
  const kek = deriveKek(password, salt, params)
  const vaultKey = randomBytes(VAULT_KEY_BYTES)
  const recovery = createRecoveryKey()
  const rkek = deriveRkek(recovery.secret)
  try {
    const draft = {
      format: 'ward-vault' as const,
      formatVersion: 1 as const,
      createdAt: new Date().toISOString(),
      kdf: {
        alg: 'argon2id13' as const,
        salt: encodeBytes(salt),
        opslimit: params.opslimit,
        memlimit: params.memlimit
      }
    }
    const ad = associatedData(draft)
    const header = parseVaultHeader({
      ...draft,
      wrappedByPassword: encodeWrapped(wrapBytes(kek, vaultKey, ad)),
      wrappedByRecovery: encodeWrapped(wrapBytes(rkek, vaultKey, ad))
    })
    return { header, recoveryKey: recovery.display, vaultKey }
  } finally {
    wipe(kek)
    wipe(rkek)
    wipe(salt)
    wipe(recovery.secret)
  }
}

export function unlockWithPassword(header: unknown, password: string): Uint8Array {
  const parsed = parseVaultHeader(header)
  const salt = decodeBytes(parsed.kdf.salt)
  try {
    return unlockWrapped(parsed, parsed.wrappedByPassword, () =>
      deriveKek(password, salt, kdfParams(parsed))
    )
  } finally {
    wipe(salt)
  }
}

export function unlockWithRecovery(header: unknown, recoveryKey: string): Uint8Array {
  const parsed = parseVaultHeader(header)
  let secret: Uint8Array
  try {
    secret = decodeRecoveryKey(recoveryKey)
  } catch {
    throw new VaultError('WRONG_PASSWORD')
  }
  try {
    return unlockWrapped(parsed, parsed.wrappedByRecovery, () => deriveRkek(secret))
  } finally {
    wipe(secret)
  }
}

export function rewrapPassword(
  header: unknown,
  vaultKey: Uint8Array,
  newPassword: string
): VaultHeader {
  const parsed = parseVaultHeader(header)
  assertVaultKey(vaultKey)
  const salt = decodeBytes(parsed.kdf.salt)
  let kek: Uint8Array | undefined
  try {
    kek = deriveKek(newPassword, salt, kdfParams(parsed))
    return parseVaultHeader({
      ...parsed,
      wrappedByPassword: encodeWrapped(wrapBytes(kek, vaultKey, associatedData(parsed)))
    })
  } finally {
    if (kek) wipe(kek)
    wipe(salt)
  }
}

export function rotateRecovery(
  header: unknown,
  vaultKey: Uint8Array
): { header: VaultHeader; recoveryKey: string } {
  const parsed = parseVaultHeader(header)
  assertVaultKey(vaultKey)
  const recovery = createRecoveryKey()
  const rkek = deriveRkek(recovery.secret)
  try {
    return {
      recoveryKey: recovery.display,
      header: parseVaultHeader({
        ...parsed,
        wrappedByRecovery: encodeWrapped(wrapBytes(rkek, vaultKey, associatedData(parsed)))
      })
    }
  } finally {
    wipe(rkek)
    wipe(recovery.secret)
  }
}

/** Writes the header. An existing file is moved to `path.bak` first. */
export function writeVaultHeader(file: string, header: unknown): void {
  const parsed = parseVaultHeader(header)
  const payload = Buffer.from(JSON.stringify(parsed))
  const temporary = `${file}.${temporaryName()}.tmp`
  writeSynced(temporary, payload)
  const backup = `${file}.bak`
  let moved = false
  try {
    if (existsSync(file)) {
      rmSync(backup, { force: true })
      renameSync(file, backup)
      moved = true
    }
    renameSync(temporary, file)
  } catch {
    if (moved && !existsSync(file)) {
      try {
        renameSync(backup, file)
      } catch {
        // The previous header remains at the .bak path.
      }
    }
    rmSync(temporary, { force: true })
    throw new VaultError('IO_ERROR')
  }
}

export function readVaultHeader(file: string): VaultHeader {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    throw new VaultError('IO_ERROR')
  }
  try {
    return parseVaultHeader(JSON.parse(text) as unknown)
  } catch (error) {
    if (error instanceof VaultError) throw error
    throw new VaultError('CORRUPT_VAULT')
  }
}

/** Drops the backup after a successful unlock. */
export function clearHeaderBackup(file: string): void {
  rmSync(`${file}.bak`, { force: true })
}

function unlockWrapped(
  header: VaultHeader,
  wrapped: VaultHeader['wrappedByPassword'],
  key: () => Uint8Array
): Uint8Array {
  let opening: Uint8Array | undefined
  try {
    opening = key()
    return unwrapBytes(
      opening,
      { nonce: decodeBytes(wrapped.nonce), ciphertext: decodeBytes(wrapped.ciphertext) },
      associatedData(header)
    )
  } catch (error) {
    if (error instanceof VaultError) throw error
    if (error instanceof Error && error.message === 'Key derivation failed.') {
      throw new VaultError('CORRUPT_VAULT')
    }
    throw new VaultError('WRONG_PASSWORD')
  } finally {
    if (opening) wipe(opening)
  }
}

function associatedData(header: {
  formatVersion: number
  createdAt: string
  kdf: { salt: string; opslimit: number; memlimit: number }
}): Uint8Array {
  const text =
    `{"format":"ward-vault","formatVersion":${header.formatVersion},` +
    `"createdAt":${JSON.stringify(header.createdAt)},` +
    `"kdf":{"alg":"argon2id13","salt":${JSON.stringify(header.kdf.salt)},` +
    `"opslimit":${header.kdf.opslimit},"memlimit":${header.kdf.memlimit}}}`
  return getSodium().from_string(text)
}

function kdfParams(header: VaultHeader): KdfParams {
  return {
    alg: header.kdf.alg,
    opslimit: header.kdf.opslimit,
    memlimit: header.kdf.memlimit
  }
}

function encodeWrapped(wrapped: WrappedBytes): { nonce: string; ciphertext: string } {
  return { nonce: encodeBytes(wrapped.nonce), ciphertext: encodeBytes(wrapped.ciphertext) }
}

function encodeBytes(bytes: Uint8Array): string {
  const sodium = getSodium()
  return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL)
}

function decodeBytes(text: string): Uint8Array {
  const sodium = getSodium()
  try {
    return sodium.from_base64(text, sodium.base64_variants.ORIGINAL)
  } catch {
    throw new VaultError('CORRUPT_VAULT')
  }
}

function freshSalt(): Uint8Array {
  return getSodium().randombytes_buf(getSodium().crypto_pwhash_SALTBYTES)
}

function assertVaultKey(vaultKey: Uint8Array): void {
  if (vaultKey.byteLength !== VAULT_KEY_BYTES) throw new VaultError('CORRUPT_VAULT')
}

function isUnsupportedVersion(value: unknown): boolean {
  const version = z.object({ formatVersion: z.number() }).safeParse(value)
  return version.success && version.data.formatVersion !== 1
}

function temporaryName(): string {
  return Buffer.from(randomBytes(8)).toString('hex')
}

function writeSynced(file: string, payload: Buffer): void {
  let handle: number
  try {
    handle = openSync(file, 'w')
  } catch {
    throw new VaultError('IO_ERROR')
  }
  try {
    writeSync(handle, payload)
    fsyncSync(handle)
  } catch {
    rmSync(file, { force: true })
    throw new VaultError('IO_ERROR')
  } finally {
    closeSync(handle)
  }
}

function headerMessage(code: HeaderCode): string {
  if (code === 'WRONG_PASSWORD') return 'Wrong password.'
  if (code === 'IO_ERROR') return 'Vault header could not be read or saved.'
  return 'Vault header was not accepted.'
}
