import { randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { MigrationError, migrate } from '../../src/main/db/migrate'
import { VaultDbError, openVault } from '../../src/main/db/open'

const stamp = '2026-11-19T05:41:00.000Z'
const entrySecret = 'fixture-entry-secret'

function tempFile(): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ward-migrate-'))
  return { dir, file: join(dir, 'ward.db') }
}

function removeTemp(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch {
    // Windows can keep the database file locked for a moment after close.
  }
}

function names(db: ReturnType<typeof openVault>, sql: string): string[] {
  const rows = db.prepare(sql).all() as { name: string }[]
  return rows.map((row) => row.name)
}

test('an empty database migrates to the latest user_version', () => {
  const { dir, file } = tempFile()
  const key = randomBytes(32)
  try {
    const db = openVault(file, key)
    expect(db.pragma('user_version', { simple: true })).toBe(0)
    migrate(db)
    expect(db.pragma('user_version', { simple: true })).toBe(2)
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
    expect(
      names(
        db,
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%fts%' ORDER BY name"
      )
    ).toEqual(['entries', 'entry_history', 'folders', 'income', 'notes', 'settings', 'tasks'])
    expect(
      names(
        db,
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%fts%' ORDER BY name"
      )
    ).toEqual(['idx_entries_fav', 'idx_entries_folder', 'idx_income_date'])
    expect(
      names(
        db,
        "SELECT name FROM sqlite_master WHERE type = 'table' AND sql LIKE '%USING fts5%' ORDER BY name"
      )
    ).toEqual(['entries_fts', 'income_fts', 'notes_fts', 'tasks_fts'])

    const amount = db
      .prepare("SELECT type FROM pragma_table_info('income') WHERE name = ?")
      .get('amount_minor') as { type: string } | undefined
    expect(amount?.type).toBe('INTEGER')

    expect(() => {
      db.prepare(
        'INSERT INTO entries (id, folder_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).run('fixture-entry', 'missing-folder', 'fixture-title', stamp, stamp)
    }).toThrow(/FOREIGN KEY constraint failed/)

    db.prepare('INSERT INTO folders (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
      'fixture-folder',
      'fixture-folder-name',
      stamp,
      stamp
    )
    db.prepare(
      'INSERT INTO entries (id, folder_id, title, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('fixture-entry', 'fixture-folder', 'fixture-title', entrySecret, stamp, stamp)
    db.prepare('INSERT INTO tasks (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
      'fixture-task',
      'fixture-task-title',
      stamp,
      stamp
    )
    const task = db.prepare('SELECT status, priority FROM tasks WHERE id = ?').get('fixture-task')
    expect(task).toEqual({ status: 'todo', priority: 'medium' })
    expect(() => {
      db.prepare(
        'INSERT INTO income (id, received_on, client, amount_minor, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('fixture-income', '2026-11-19', 'fixture-client', -1, stamp, stamp)
    }).toThrow(/CHECK constraint failed/)

    db.close()

    const reopened = openVault(file, key)
    migrate(reopened)
    expect(reopened.pragma('user_version', { simple: true })).toBe(2)
    const row = reopened
      .prepare('SELECT password FROM entries WHERE id = ?')
      .get('fixture-entry') as
      | {
          password: string
        }
      | undefined
    expect(row?.password).toBe(entrySecret)
    const folders = reopened.prepare('SELECT COUNT(*) AS n FROM folders').get() as { n: number }
    expect(folders.n).toBe(1)
    reopened.close()
  } finally {
    removeTemp(dir)
  }
})

test('a newer user_version is refused', () => {
  const { dir, file } = tempFile()
  try {
    const db = openVault(file, randomBytes(32))
    db.pragma('user_version = 3')
    expect(() => migrate(db)).toThrow(MigrationError)
    try {
      migrate(db)
    } catch (error) {
      expect(error).toBeInstanceOf(MigrationError)
      const refused = error as MigrationError
      expect(refused.code).toBe('UNSUPPORTED_VERSION')
      expect(refused.message).toBe('Vault database version was not accepted.')
    }
    db.close()
  } finally {
    removeTemp(dir)
  }
})

test('a wrong key still fails after migration', () => {
  const { dir, file } = tempFile()
  const key = randomBytes(32)
  const wrong = randomBytes(32)
  try {
    const db = openVault(file, key)
    migrate(db)
    db.close()
    let caught: unknown
    try {
      const opened = openVault(file, wrong)
      opened.close()
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(VaultDbError)
    const error = caught as VaultDbError
    expect(error.code).toBe('IO_ERROR')
    expect(error.message).toBe('Vault database could not be opened.')
    expect(error.message).not.toContain(key.toString('hex'))
    expect(error.message).not.toContain(wrong.toString('hex'))
  } finally {
    removeTemp(dir)
  }
})
