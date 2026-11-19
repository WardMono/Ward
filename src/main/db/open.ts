import Database from 'better-sqlite3-multiple-ciphers'
import type { ErrorCode } from '../../shared/ipc-contract'

const VAULT_KEY_BYTES = 32
const KEY_HEX = /^[0-9a-f]{64}$/

type OpenCode = Extract<ErrorCode, 'INVALID_INPUT' | 'IO_ERROR'>

export class VaultDbError extends Error {
  readonly code: OpenCode

  constructor(code: OpenCode) {
    super(openMessage(code))
    this.name = 'VaultDbError'
    this.code = code
  }
}

function openMessage(code: OpenCode): string {
  if (code === 'INVALID_INPUT') return 'Vault key was not accepted.'
  return 'Vault database could not be opened.'
}

type CipherDatabase = InstanceType<typeof Database>

/** Loads the native cipher module. It does not open the vault. */
export function loadCipherDriver(): void {
  const db = new Database(':memory:')
  db.close()
}

function rawKeyHex(vaultKey: Uint8Array): string {
  if (!(vaultKey instanceof Uint8Array) || vaultKey.byteLength !== VAULT_KEY_BYTES) {
    throw new VaultDbError('INVALID_INPUT')
  }
  const hex = Buffer.from(vaultKey).toString('hex')
  if (!KEY_HEX.test(hex)) throw new VaultDbError('INVALID_INPUT')
  return hex
}

/**
 * Opens an encrypted database with the raw 32-byte vault key.
 * Cipher is set to sqlcipher before the key. The key pragma uses x'<64 hex>'.
 * A wrong key fails on the first page read, not on the key pragma.
 */
export function openVault(file: string, vaultKey: Uint8Array): CipherDatabase {
  const hex = rawKeyHex(vaultKey)
  let db: CipherDatabase | undefined
  try {
    db = new Database(file)
    db.pragma(`cipher='sqlcipher'`)
    db.pragma(`key = "x'${hex}'"`)
    db.pragma('foreign_keys = ON')
    const cipher = db.pragma('cipher', { simple: true })
    const foreignKeys = db.pragma('foreign_keys', { simple: true })
    if (cipher !== 'sqlcipher' || foreignKeys !== 1) throw new VaultDbError('IO_ERROR')
    db.prepare('SELECT count(*) AS n FROM sqlite_master').get()
    return db
  } catch (error) {
    if (db?.open === true) {
      try {
        db.close()
      } catch {
        // The open already failed. Closing a bad key can throw too.
      }
    }
    if (error instanceof VaultDbError) throw error
    throw new VaultDbError('IO_ERROR')
  }
}
