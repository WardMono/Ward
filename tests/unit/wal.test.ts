/* eslint-disable security/detect-non-literal-fs-filename -- the path is a temp directory created in this test */
import { randomBytes } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { migrate } from '../../src/main/db/migrate'
import { openVault } from '../../src/main/db/open'
import { createEntry } from '../../src/main/db/repos/entries'

const title = 'wal-title-fixture'
const nextTitle = 'wal-title-next'
const entrySecret = 'wal-secret-fixture'

function tempFile(): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ward-wal-'))
  return { dir, file: join(dir, 'ward.db') }
}

function removeTemp(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch {
    // Windows can keep the database file locked for a moment after close.
  }
}

function omits(path: string, texts: string[]): boolean {
  if (!existsSync(path)) return true
  const bytes = readFileSync(path)
  return texts.every((text) => !bytes.includes(Buffer.from(text)))
}

test('delete mode keeps the title and password out of the database files', () => {
  const { dir, file } = tempFile()
  const texts = [title, nextTitle, entrySecret]
  try {
    const db = openVault(file, randomBytes(32))
    expect(db.pragma('journal_mode', { simple: true })).toBe('delete')
    migrate(db)
    const entry = createEntry(db, { title, password: entrySecret })
    db.exec('BEGIN')
    db.prepare('UPDATE entries SET title = ? WHERE id = ?').run(nextTitle, entry.id)
    expect(existsSync(`${file}-journal`)).toBe(true)
    expect(omits(file, texts)).toBe(true)
    expect(omits(`${file}-journal`, texts)).toBe(true)
    expect(existsSync(`${file}-wal`)).toBe(false)
    expect(existsSync(`${file}-shm`)).toBe(false)
    db.exec('ROLLBACK')
    db.close()

    const bytes = readFileSync(file)
    expect(bytes.subarray(0, 16).toString('utf8').startsWith('SQLite format 3')).toBe(false)
    expect(omits(file, texts)).toBe(true)
    expect(existsSync(`${file}-journal`)).toBe(false)
    expect(existsSync(`${file}-wal`)).toBe(false)
    expect(existsSync(`${file}-shm`)).toBe(false)
  } finally {
    removeTemp(dir)
  }
})

test('a forced wal file does not contain the fixture', () => {
  const { dir, file } = tempFile()
  try {
    const db = openVault(file, randomBytes(32))
    expect(db.pragma('journal_mode = WAL', { simple: true })).toBe('wal')
    db.exec('CREATE TABLE probe (note TEXT NOT NULL)')
    db.prepare('INSERT INTO probe (note) VALUES (?)').run(title)
    expect(existsSync(`${file}-wal`)).toBe(true)
    expect(existsSync(`${file}-shm`)).toBe(true)
    expect(omits(file, [title])).toBe(true)
    expect(omits(`${file}-wal`, [title])).toBe(true)
    expect(omits(`${file}-shm`, [title])).toBe(true)
    db.close()
  } finally {
    removeTemp(dir)
  }
})
