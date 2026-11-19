import { RepoError } from '../repo-error'
import {
  asBit,
  asFlag,
  optionalText,
  repoDeps,
  requireFolder,
  requireName,
  type RepoDeps,
  type VaultDatabase
} from './common'

export type Entry = {
  id: string
  folderId: string | null
  title: string
  username: string | null
  url: string | null
  notes: string | null
  favorite: boolean
  passwordChangedAt: string | null
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type NewEntry = {
  folderId?: string | null
  title: string
  username?: string | null
  password?: string | null
  url?: string | null
  notes?: string | null
  favorite?: boolean
}

export type EntryPatch = {
  folderId?: string | null
  title?: string
  username?: string | null
  password?: string | null
  url?: string | null
  notes?: string | null
  favorite?: boolean
}

export type EntryHistory = {
  id: string
  password: string
  changedAt: string
}

type EntryPublicRow = {
  id: string
  folder_id: string | null
  title: string
  username: string | null
  url: string | null
  notes: string | null
  favorite: number
  password_changed_at: string | null
  last_used_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

type EntrySecretRow = EntryPublicRow & { password: string | null }

function readPublic(db: VaultDatabase, id: string): EntryPublicRow | undefined {
  return db
    .prepare(
      'SELECT id, folder_id, title, username, url, notes, favorite, password_changed_at, last_used_at, created_at, updated_at, deleted_at FROM entries WHERE id = ?'
    )
    .get(id) as EntryPublicRow | undefined
}

function readSecret(db: VaultDatabase, id: string): EntrySecretRow | undefined {
  return db
    .prepare(
      'SELECT id, folder_id, title, username, url, notes, favorite, password_changed_at, last_used_at, created_at, updated_at, deleted_at, password FROM entries WHERE id = ?'
    )
    .get(id) as EntrySecretRow | undefined
}

export function listEntries(db: VaultDatabase, scope: 'active' | 'trash' = 'active'): Entry[] {
  const rows =
    scope === 'trash'
      ? (db
          .prepare(
            'SELECT id, folder_id, title, username, url, notes, favorite, password_changed_at, last_used_at, created_at, updated_at, deleted_at FROM entries WHERE deleted_at IS NOT NULL ORDER BY updated_at DESC, id ASC'
          )
          .all() as EntryPublicRow[])
      : (db
          .prepare(
            'SELECT id, folder_id, title, username, url, notes, favorite, password_changed_at, last_used_at, created_at, updated_at, deleted_at FROM entries WHERE deleted_at IS NULL ORDER BY updated_at DESC, id ASC'
          )
          .all() as EntryPublicRow[])
  return rows.map(mapEntry)
}

function mapEntry(row: EntryPublicRow): Entry {
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    username: row.username,
    url: row.url,
    notes: row.notes,
    favorite: asFlag(row.favorite),
    passwordChangedAt: row.password_changed_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

export function getEntry(db: VaultDatabase, id: string): Entry | null {
  const row = readPublic(db, id)
  return row === undefined ? null : mapEntry(row)
}

export function readPassword(db: VaultDatabase, id: string): string | null {
  const row = db.prepare('SELECT password FROM entries WHERE id = ?').get(id) as
    { password: string | null } | undefined
  if (row === undefined) throw new RepoError('NOT_FOUND')
  return row.password
}

export function createEntry(db: VaultDatabase, input: NewEntry, options?: RepoDeps): Entry {
  const { now, id } = repoDeps(options)
  const createdAt = now()
  const entryId = id()
  db.prepare(
    'INSERT INTO entries (id, folder_id, title, username, password, url, notes, favorite, password_changed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    entryId,
    requireFolder(db, input.folderId),
    requireName(input.title),
    optionalText(input.username),
    input.password === undefined ? null : input.password,
    optionalText(input.url),
    optionalText(input.notes),
    asBit(input.favorite ?? false),
    input.password === undefined || input.password === null ? null : createdAt,
    createdAt,
    createdAt
  )
  const created = getEntry(db, entryId)
  if (created === null) throw new RepoError('IO_ERROR')
  return created
}

export function updateEntry(
  db: VaultDatabase,
  id: string,
  patch: EntryPatch,
  options?: RepoDeps
): Entry {
  const { now, id: nextId } = repoDeps(options)
  const run = db.transaction(() => {
    const current = readSecret(db, id)
    if (current === undefined || current.deleted_at !== null) throw new RepoError('NOT_FOUND')
    const password = patch.password === undefined ? current.password : patch.password
    const passwordChanged = patch.password !== undefined && patch.password !== current.password
    const updatedAt = now()
    const result = db
      .prepare(
        'UPDATE entries SET folder_id = ?, title = ?, username = ?, password = ?, url = ?, notes = ?, favorite = ?, password_changed_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
      )
      .run(
        patch.folderId === undefined ? current.folder_id : requireFolder(db, patch.folderId),
        patch.title === undefined ? current.title : requireName(patch.title),
        patch.username === undefined ? current.username : optionalText(patch.username),
        password,
        patch.url === undefined ? current.url : optionalText(patch.url),
        patch.notes === undefined ? current.notes : optionalText(patch.notes),
        patch.favorite === undefined ? current.favorite : asBit(patch.favorite),
        passwordChanged ? updatedAt : current.password_changed_at,
        updatedAt,
        id
      )
    if (result.changes !== 1) throw new RepoError('IO_ERROR')
    if (passwordChanged && current.password !== null) {
      db.prepare(
        'INSERT INTO entry_history (id, entry_id, password, changed_at) VALUES (?, ?, ?, ?)'
      ).run(nextId(), id, current.password, updatedAt)
      db.prepare(
        'DELETE FROM entry_history WHERE entry_id = ? AND id NOT IN (SELECT id FROM entry_history WHERE entry_id = ? ORDER BY changed_at DESC, id DESC LIMIT 10)'
      ).run(id, id)
    }
  })
  run()
  const updated = getEntry(db, id)
  if (updated === null) throw new RepoError('IO_ERROR')
  return updated
}

export function listHistory(db: VaultDatabase, entryId: string): EntryHistory[] {
  if (readPublic(db, entryId) === undefined) throw new RepoError('NOT_FOUND')
  const rows = db
    .prepare(
      'SELECT id, password, changed_at FROM entry_history WHERE entry_id = ? ORDER BY changed_at DESC, id DESC'
    )
    .all(entryId) as { id: string; password: string; changed_at: string }[]
  return rows.map((row) => ({ id: row.id, password: row.password, changedAt: row.changed_at }))
}

export function trashEntry(db: VaultDatabase, id: string, options?: RepoDeps): Entry {
  return markEntry(db, id, true, options)
}

export function restoreEntry(db: VaultDatabase, id: string, options?: RepoDeps): Entry {
  return markEntry(db, id, false, options)
}

function markEntry(db: VaultDatabase, id: string, trash: boolean, options?: RepoDeps): Entry {
  const current = getEntry(db, id)
  if (current === null) throw new RepoError('NOT_FOUND')
  if (trash && current.deletedAt !== null) throw new RepoError('INVALID_INPUT')
  if (!trash && current.deletedAt === null) throw new RepoError('INVALID_INPUT')
  const updatedAt = repoDeps(options).now()
  const deletedAt = trash ? updatedAt : null
  const result = db
    .prepare('UPDATE entries SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(deletedAt, updatedAt, id)
  if (result.changes !== 1) throw new RepoError('IO_ERROR')
  const next = getEntry(db, id)
  if (next === null) throw new RepoError('IO_ERROR')
  return next
}

export function purgeEntry(db: VaultDatabase, id: string): void {
  const current = getEntry(db, id)
  if (current === null) throw new RepoError('NOT_FOUND')
  if (current.deletedAt === null) throw new RepoError('INVALID_INPUT')
  const result = db.prepare('DELETE FROM entries WHERE id = ? AND deleted_at IS NOT NULL').run(id)
  if (result.changes !== 1) throw new RepoError('IO_ERROR')
}
