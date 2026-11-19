import initSql from './migrations/0001_init.sql?raw'
import type { ErrorCode } from '../../shared/ipc-contract'
import type { openVault } from './open'

type VaultDatabase = ReturnType<typeof openVault>

type MigrationCode = Extract<ErrorCode, 'IO_ERROR' | 'UNSUPPORTED_VERSION'>

export class MigrationError extends Error {
  readonly code: MigrationCode

  constructor(code: MigrationCode) {
    super(migrationMessage(code))
    this.name = 'MigrationError'
    this.code = code
  }
}

function migrationMessage(code: MigrationCode): string {
  if (code === 'UNSUPPORTED_VERSION') return 'Vault database version was not accepted.'
  return 'Vault database could not be migrated.'
}

const MIGRATIONS: readonly { version: number; sql: string }[] = [{ version: 1, sql: initSql }]

function readUserVersion(db: VaultDatabase): number {
  const version = db.pragma('user_version', { simple: true })
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    throw new MigrationError('IO_ERROR')
  }
  return version
}

function applyVersion(db: VaultDatabase, version: number, sql: string): void {
  if (sql.trim() === '') throw new MigrationError('IO_ERROR')
  const run = db.transaction(() => {
    db.exec(sql)
    if (version === 1) db.pragma('user_version = 1')
    else throw new MigrationError('IO_ERROR')
  })
  try {
    run()
  } catch (error) {
    if (error instanceof MigrationError) throw error
    throw new MigrationError('IO_ERROR')
  }
}

/** Applies pending SQL files in order. An already-applied version is left unchanged. */
export function migrate(db: VaultDatabase): void {
  const latest = MIGRATIONS.at(-1)
  if (latest === undefined) throw new MigrationError('IO_ERROR')
  let current = readUserVersion(db)
  if (current > latest.version) throw new MigrationError('UNSUPPORTED_VERSION')
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue
    if (migration.version !== current + 1) throw new MigrationError('IO_ERROR')
    applyVersion(db, migration.version, migration.sql)
    current = migration.version
  }
}
