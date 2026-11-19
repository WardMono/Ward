import { randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import initSql from '../../src/main/db/migrations/0001_init.sql?raw'
import { migrate } from '../../src/main/db/migrate'
import { VaultDbError, openVault } from '../../src/main/db/open'

const stamp = '2026-11-19T05:54:00.000Z'
const title = 'wardtitlefixture'
const username = 'warduserfixture'
const url = 'wardurlfixture'
const entrySecret = 'wardpasswordfixture'
const changedSecret = 'wardpasswordchanged'
const noteBody = 'wardnotefixture'
const taskTitle = 'wardtaskfixture'
const taskBody = 'wardtaskbodyfixture'
const client = 'wardclientfixture'
const incomeBody = 'wardincomefixture'

function tempFile(): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ward-fts-'))
  return { dir, file: join(dir, 'ward.db') }
}

function removeTemp(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch {
    // Windows can keep the database file locked for a moment after close.
  }
}

function hits(db: ReturnType<typeof openVault>, sql: string, query: string): number {
  const row = db.prepare(sql).get(query) as { n: number }
  return row.n
}

test('an existing row is indexed and its password is not', () => {
  const { dir, file } = tempFile()
  const key = randomBytes(32)
  try {
    const created = openVault(file, key)
    created.exec(initSql)
    created.pragma('user_version = 1')
    created
      .prepare(
        'INSERT INTO entries (id, title, username, password, url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run('fixture-entry', title, username, entrySecret, url, stamp, stamp)
    created
      .prepare(
        'INSERT INTO notes (id, title, body_md, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run('fixture-note', 'wardnotetitle', noteBody, stamp, stamp)
    created
      .prepare(
        'INSERT INTO tasks (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run('fixture-task', taskTitle, taskBody, stamp, stamp)
    created
      .prepare(
        'INSERT INTO income (id, received_on, client, description, amount_minor, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run('fixture-income', '2026-11-19', client, incomeBody, 1500, stamp, stamp)
    migrate(created)
    expect(created.pragma('user_version', { simple: true })).toBe(2)
    const options = created.pragma('compile_options', { simple: false }) as {
      compile_options: string
    }[]
    expect(options.some((option) => option.compile_options === 'ENABLE_FTS5')).toBe(true)
    const indexed = created
      .prepare(
        "SELECT sql FROM sqlite_master WHERE name LIKE '%fts%' AND IFNULL(sql, '') LIKE '%password%'"
      )
      .all()
    expect(indexed).toEqual([])

    expect(
      hits(created, 'SELECT COUNT(*) AS n FROM entries_fts WHERE entries_fts MATCH ?', title)
    ).toBe(1)
    expect(
      hits(created, 'SELECT COUNT(*) AS n FROM entries_fts WHERE entries_fts MATCH ?', username)
    ).toBe(1)
    expect(
      hits(created, 'SELECT COUNT(*) AS n FROM entries_fts WHERE entries_fts MATCH ?', url)
    ).toBe(1)
    expect(
      hits(created, 'SELECT COUNT(*) AS n FROM entries_fts WHERE entries_fts MATCH ?', entrySecret)
    ).toBe(0)
    expect(
      hits(created, 'SELECT COUNT(*) AS n FROM notes_fts WHERE notes_fts MATCH ?', noteBody)
    ).toBe(1)
    expect(
      hits(created, 'SELECT COUNT(*) AS n FROM tasks_fts WHERE tasks_fts MATCH ?', taskBody)
    ).toBe(1)
    expect(
      hits(created, 'SELECT COUNT(*) AS n FROM income_fts WHERE income_fts MATCH ?', client)
    ).toBe(1)
    const stored = created
      .prepare('SELECT password FROM entries WHERE id = ?')
      .get('fixture-entry') as {
      password: string
    }
    expect(stored.password).toBe(entrySecret)

    migrate(created)
    expect(created.pragma('user_version', { simple: true })).toBe(2)
    const count = created.prepare('SELECT COUNT(*) AS n FROM entries').get() as { n: number }
    expect(count.n).toBe(1)
    created.close()

    const reopened = openVault(file, key)
    migrate(reopened)
    expect(reopened.pragma('user_version', { simple: true })).toBe(2)
    expect(
      hits(reopened, 'SELECT COUNT(*) AS n FROM entries_fts WHERE entries_fts MATCH ?', title)
    ).toBe(1)
    expect(
      hits(reopened, 'SELECT COUNT(*) AS n FROM entries_fts WHERE entries_fts MATCH ?', entrySecret)
    ).toBe(0)
    reopened.close()
  } finally {
    removeTemp(dir)
  }
})

test('triggers follow insert, update, and delete', () => {
  const { dir, file } = tempFile()
  try {
    const db = openVault(file, randomBytes(32))
    migrate(db)
    db.prepare(
      'INSERT INTO entries (id, title, username, password, url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('fixture-entry', title, username, entrySecret, url, stamp, stamp)
    expect(hits(db, 'SELECT COUNT(*) AS n FROM entries_fts WHERE entries_fts MATCH ?', title)).toBe(
      1
    )
    expect(
      hits(db, 'SELECT COUNT(*) AS n FROM entries_fts WHERE entries_fts MATCH ?', entrySecret)
    ).toBe(0)

    db.prepare('UPDATE entries SET password = ? WHERE id = ?').run(changedSecret, 'fixture-entry')
    expect(
      hits(db, 'SELECT COUNT(*) AS n FROM entries_fts WHERE entries_fts MATCH ?', changedSecret)
    ).toBe(0)
    expect(hits(db, 'SELECT COUNT(*) AS n FROM entries_fts WHERE entries_fts MATCH ?', title)).toBe(
      1
    )

    db.prepare('UPDATE entries SET title = ? WHERE id = ?').run('wardtitlenext', 'fixture-entry')
    expect(hits(db, 'SELECT COUNT(*) AS n FROM entries_fts WHERE entries_fts MATCH ?', title)).toBe(
      0
    )
    expect(
      hits(db, 'SELECT COUNT(*) AS n FROM entries_fts WHERE entries_fts MATCH ?', 'wardtitlenext')
    ).toBe(1)

    db.prepare('DELETE FROM entries WHERE id = ?').run('fixture-entry')
    expect(
      hits(db, 'SELECT COUNT(*) AS n FROM entries_fts WHERE entries_fts MATCH ?', 'wardtitlenext')
    ).toBe(0)
    db.close()
  } finally {
    removeTemp(dir)
  }
})

test('a wrong key still fails after the fts migration', () => {
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
