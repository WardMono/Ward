import { randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { migrate } from '../../src/main/db/migrate'
import { addMinor, parseMinor } from '../../src/main/db/money'
import { openVault } from '../../src/main/db/open'
import { RepoError } from '../../src/main/db/repo-error'
import type { RepoDeps, VaultDatabase } from '../../src/main/db/repos/common'
import {
  createEntry,
  getEntry,
  listEntries,
  listHistory,
  purgeEntry,
  readPassword,
  restoreEntry,
  trashEntry,
  updateEntry
} from '../../src/main/db/repos/entries'
import { createFolder, deleteFolder, getFolder, listFolders } from '../../src/main/db/repos/folders'
import {
  createIncome,
  getIncome,
  listIncome,
  purgeIncome,
  trashIncome
} from '../../src/main/db/repos/income'
import {
  createNote,
  getNote,
  listNotes,
  purgeNote,
  restoreNote,
  trashNote,
  updateNote
} from '../../src/main/db/repos/notes'
import { searchAll } from '../../src/main/db/repos/search'
import { getSetting, setSetting } from '../../src/main/db/repos/settings'
import {
  createTask,
  getTask,
  purgeTask,
  trashTask,
  updateTask
} from '../../src/main/db/repos/tasks'

const ulidPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/
const injection = "fixture'); DROP TABLE entries; --"
const entrySecret = 'wardpasswordfixture'

function clock(): RepoDeps {
  let tick = 0
  return {
    now: () => {
      tick += 1
      return `2026-11-19T00:00:${String(tick).padStart(2, '0')}.000Z`
    }
  }
}

function withDb(run: (db: VaultDatabase, deps: RepoDeps) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'ward-repo-'))
  try {
    const db = openVault(join(dir, 'ward.db'), randomBytes(32))
    migrate(db)
    run(db, clock())
    db.close()
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      // Windows can keep the database file locked for a moment after close.
    }
  }
}

test('folders nest to depth 3 and deletion moves items to unfiled', () => {
  withDb((db, deps) => {
    const root = createFolder(db, { name: 'Root' }, deps)
    const child = createFolder(db, { name: 'Child', parentId: root.id }, deps)
    const grandchild = createFolder(db, { name: 'Grandchild', parentId: child.id }, deps)
    expect(root.id).toMatch(ulidPattern)
    expect(() => createFolder(db, { name: 'Too deep', parentId: grandchild.id }, deps)).toThrow(
      RepoError
    )

    const entry = createEntry(
      db,
      { title: 'Kept', folderId: grandchild.id, password: entrySecret },
      deps
    )
    const note = createNote(db, { title: 'Kept note', folderId: grandchild.id }, deps)
    deleteFolder(db, root.id)
    expect(getFolder(db, child.id)).toBeNull()
    expect(getEntry(db, entry.id)?.folderId).toBeNull()
    expect(getNote(db, note.id)?.folderId).toBeNull()
    expect(listFolders(db)).toEqual([])
  })
})

test('entries hide passwords, trim history to 10, and store injection text', () => {
  withDb((db, deps) => {
    const entry = createEntry(
      db,
      { title: injection, username: 'warduserfixture', password: 'pw-0', url: 'wardurlfixture' },
      deps
    )
    expect(listEntries(db)[0]?.title).toBe(injection)
    expect(JSON.stringify(listEntries(db))).not.toContain('pw-0')
    expect('password' in (listEntries(db)[0] ?? {})).toBe(false)
    expect('password' in (getEntry(db, entry.id) ?? {})).toBe(false)
    expect(readPassword(db, entry.id)).toBe('pw-0')

    for (let step = 1; step <= 11; step += 1) {
      updateEntry(db, entry.id, { password: `pw-${step}` }, deps)
    }
    const history = listHistory(db, entry.id)
    expect(history).toHaveLength(10)
    expect(history.some((row) => row.password === 'pw-0')).toBe(false)
    expect(history[0]?.password).toBe('pw-10')
    expect(readPassword(db, entry.id)).toBe('pw-11')
    expect(listEntries(db)).toHaveLength(1)

    trashEntry(db, entry.id, deps)
    expect(listEntries(db)).toEqual([])
    expect(listEntries(db, 'trash')).toHaveLength(1)
    restoreEntry(db, entry.id, deps)
    expect(() => purgeEntry(db, entry.id)).toThrow(RepoError)
    trashEntry(db, entry.id, deps)
    purgeEntry(db, entry.id)
    expect(getEntry(db, entry.id)).toBeNull()
  })
})

test('notes support edit, pin, trash, restore, and purge', () => {
  withDb((db, deps) => {
    const note = createNote(db, { title: 'Note', bodyMd: 'wardnotefixture' }, deps)
    const updated = updateNote(
      db,
      note.id,
      { pinned: true, favorite: true, bodyMd: 'next body' },
      deps
    )
    expect(updated.pinned).toBe(true)
    expect(updated.favorite).toBe(true)
    expect(updated.bodyMd).toBe('next body')
    trashNote(db, note.id, deps)
    expect(listNotes(db)).toEqual([])
    restoreNote(db, note.id, deps)
    trashNote(db, note.id, deps)
    purgeNote(db, note.id)
    expect(getNote(db, note.id)).toBeNull()
  })
})

test('tasks allow one subtask level and soft delete', () => {
  withDb((db, deps) => {
    const parent = createTask(db, { title: 'Parent' }, deps)
    expect(parent.status).toBe('todo')
    expect(parent.priority).toBe('medium')
    const child = createTask(db, { title: 'Child', parentId: parent.id }, deps)
    expect(() => createTask(db, { title: 'Grandchild', parentId: child.id }, deps)).toThrow(
      RepoError
    )
    const done = updateTask(db, parent.id, { status: 'done' }, deps)
    expect(done.completedAt).not.toBeNull()
    trashTask(db, child.id, deps)
    purgeTask(db, child.id)
    expect(getTask(db, child.id)).toBeNull()
  })
})

test('income stores centavos and rejects a negative amount', () => {
  withDb((db, deps) => {
    const first = createIncome(
      db,
      { receivedOn: '2026-11-19', client: 'wardclientfixture', amountMinor: parseMinor('0.1') },
      deps
    )
    const second = createIncome(
      db,
      {
        receivedOn: '2026-11-19',
        client: 'Other',
        description: 'wardincomefixture',
        amountMinor: parseMinor('0.2'),
        status: 'pending'
      },
      deps
    )
    expect(first.amountMinor).toBe(10)
    expect(second.currency).toBe('PHP')
    expect(addMinor(first.amountMinor, second.amountMinor)).toBe(30)
    expect(() =>
      createIncome(db, { receivedOn: '2026-11-19', client: 'Bad', amountMinor: -1 }, deps)
    ).toThrow(RepoError)
    expect(listIncome(db)).toHaveLength(2)
    trashIncome(db, first.id, deps)
    purgeIncome(db, first.id)
    expect(getIncome(db, first.id)).toBeNull()
  })
})

test('settings round-trip JSON values', () => {
  withDb((db) => {
    expect(getSetting(db, 'currency')).toBeNull()
    setSetting(db, 'currency', 'PHP')
    expect(getSetting(db, 'currency')).toBe('PHP')
    setSetting(db, 'currency', 'USD')
    expect(getSetting(db, 'currency')).toBe('USD')
    expect(() => setSetting(db, ' ', 1)).toThrow(RepoError)
  })
})

test('search finds a title and not a password', () => {
  withDb((db, deps) => {
    const entry = createEntry(
      db,
      { title: 'wardtitlefixture', password: entrySecret, username: 'warduserfixture' },
      deps
    )
    createNote(db, { title: 'Other', bodyMd: 'wardnotefixture' }, deps)
    expect(
      searchAll(db, 'wardtitlefixture').some((hit) => hit.id === entry.id && hit.type === 'entry')
    ).toBe(true)
    expect(searchAll(db, entrySecret)).toEqual([])
    expect(searchAll(db, 'wardnotefixture').some((hit) => hit.type === 'note')).toBe(true)
    expect(JSON.stringify(searchAll(db, 'wardtitlefixture'))).not.toContain(entrySecret)
    trashEntry(db, entry.id, deps)
    expect(searchAll(db, 'wardtitlefixture')).toEqual([])
  })
})
