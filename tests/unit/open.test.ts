/* eslint-disable security/detect-non-literal-fs-filename -- the path is a temp directory created in this test */
import { randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { VaultDbError, openVault } from '../../src/main/db/open'

const marker = 'WARD_PLAINTEXT_MARKER'

function tempFile(): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ward-open-'))
  return { dir, file: join(dir, 'ward.db') }
}

function removeTemp(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch {
    // Windows can keep the database file locked for a moment after close.
  }
}

test('the right key reads a row and the file is not plaintext sqlite', () => {
  const { dir, file } = tempFile()
  const key = randomBytes(32)
  try {
    const created = openVault(file, key)
    expect(created.pragma('cipher', { simple: true })).toBe('sqlcipher')
    expect(created.pragma('foreign_keys', { simple: true })).toBe(1)
    created.exec('CREATE TABLE probe (note TEXT NOT NULL)')
    created.prepare('INSERT INTO probe (note) VALUES (?)').run(marker)
    created.exec(
      'CREATE TABLE parent (id INTEGER PRIMARY KEY); CREATE TABLE child (parent_id INTEGER NOT NULL REFERENCES parent(id))'
    )
    expect(() => {
      created.prepare('INSERT INTO child (parent_id) VALUES (?)').run(1)
    }).toThrow(/FOREIGN KEY constraint failed/)
    created.close()

    const bytes = readFileSync(file)
    expect(bytes.includes(Buffer.from(marker))).toBe(false)
    expect(bytes.subarray(0, 16).toString('utf8').startsWith('SQLite format 3')).toBe(false)

    const opened = openVault(file, key)
    const row = opened.prepare('SELECT note FROM probe').get() as { note: string } | undefined
    opened.close()
    expect(row?.note).toBe(marker)
  } finally {
    removeTemp(dir)
  }
})

test('a wrong key fails with a fixed message', () => {
  const { dir, file } = tempFile()
  const key = randomBytes(32)
  const wrong = randomBytes(32)
  try {
    const created = openVault(file, key)
    created.exec('CREATE TABLE probe (note TEXT NOT NULL)')
    created.prepare('INSERT INTO probe (note) VALUES (?)').run(marker)
    created.close()

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

test('a key that is not 32 bytes is refused', () => {
  const { dir, file } = tempFile()
  try {
    expect(() => openVault(file, randomBytes(31))).toThrow(VaultDbError)
    try {
      openVault(file, randomBytes(31))
    } catch (error) {
      expect(error).toBeInstanceOf(VaultDbError)
      const refused = error as VaultDbError
      expect(refused.code).toBe('INVALID_INPUT')
      expect(refused.message).toBe('Vault key was not accepted.')
    }
  } finally {
    removeTemp(dir)
  }
})
