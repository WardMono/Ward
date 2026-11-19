import { RepoError } from '../repo-error'
import {
  asBit,
  asFlag,
  repoDeps,
  requireFolder,
  requireName,
  type RepoDeps,
  type VaultDatabase
} from './common'

export type Note = {
  id: string
  folderId: string | null
  title: string
  bodyMd: string
  pinned: boolean
  favorite: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type NewNote = {
  folderId?: string | null
  title: string
  bodyMd?: string
  pinned?: boolean
  favorite?: boolean
}

export type NotePatch = {
  folderId?: string | null
  title?: string
  bodyMd?: string
  pinned?: boolean
  favorite?: boolean
}

type NoteRow = {
  id: string
  folder_id: string | null
  title: string
  body_md: string
  pinned: number
  favorite: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    bodyMd: row.body_md,
    pinned: asFlag(row.pinned),
    favorite: asFlag(row.favorite),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

function readNote(db: VaultDatabase, id: string): NoteRow | undefined {
  return db
    .prepare(
      'SELECT id, folder_id, title, body_md, pinned, favorite, created_at, updated_at, deleted_at FROM notes WHERE id = ?'
    )
    .get(id) as NoteRow | undefined
}

export function listNotes(db: VaultDatabase, scope: 'active' | 'trash' = 'active'): Note[] {
  const rows =
    scope === 'trash'
      ? (db
          .prepare(
            'SELECT id, folder_id, title, body_md, pinned, favorite, created_at, updated_at, deleted_at FROM notes WHERE deleted_at IS NOT NULL ORDER BY pinned DESC, updated_at DESC, id ASC'
          )
          .all() as NoteRow[])
      : (db
          .prepare(
            'SELECT id, folder_id, title, body_md, pinned, favorite, created_at, updated_at, deleted_at FROM notes WHERE deleted_at IS NULL ORDER BY pinned DESC, updated_at DESC, id ASC'
          )
          .all() as NoteRow[])
  return rows.map(mapNote)
}

export function getNote(db: VaultDatabase, id: string): Note | null {
  const row = readNote(db, id)
  return row === undefined ? null : mapNote(row)
}

export function createNote(db: VaultDatabase, input: NewNote, options?: RepoDeps): Note {
  const { now, id } = repoDeps(options)
  const createdAt = now()
  const noteId = id()
  db.prepare(
    'INSERT INTO notes (id, folder_id, title, body_md, pinned, favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    noteId,
    requireFolder(db, input.folderId),
    requireName(input.title),
    input.bodyMd ?? '',
    asBit(input.pinned ?? false),
    asBit(input.favorite ?? false),
    createdAt,
    createdAt
  )
  const created = getNote(db, noteId)
  if (created === null) throw new RepoError('IO_ERROR')
  return created
}

export function updateNote(
  db: VaultDatabase,
  id: string,
  patch: NotePatch,
  options?: RepoDeps
): Note {
  const { now } = repoDeps(options)
  const current = readNote(db, id)
  if (current === undefined || current.deleted_at !== null) throw new RepoError('NOT_FOUND')
  const result = db
    .prepare(
      'UPDATE notes SET folder_id = ?, title = ?, body_md = ?, pinned = ?, favorite = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
    )
    .run(
      patch.folderId === undefined ? current.folder_id : requireFolder(db, patch.folderId),
      patch.title === undefined ? current.title : requireName(patch.title),
      patch.bodyMd === undefined ? current.body_md : patch.bodyMd,
      patch.pinned === undefined ? current.pinned : asBit(patch.pinned),
      patch.favorite === undefined ? current.favorite : asBit(patch.favorite),
      now(),
      id
    )
  if (result.changes !== 1) throw new RepoError('IO_ERROR')
  const updated = getNote(db, id)
  if (updated === null) throw new RepoError('IO_ERROR')
  return updated
}

export function trashNote(db: VaultDatabase, id: string, options?: RepoDeps): Note {
  return markNote(db, id, true, options)
}

export function restoreNote(db: VaultDatabase, id: string, options?: RepoDeps): Note {
  return markNote(db, id, false, options)
}

function markNote(db: VaultDatabase, id: string, trash: boolean, options?: RepoDeps): Note {
  const current = getNote(db, id)
  if (current === null) throw new RepoError('NOT_FOUND')
  if (trash && current.deletedAt !== null) throw new RepoError('INVALID_INPUT')
  if (!trash && current.deletedAt === null) throw new RepoError('INVALID_INPUT')
  const updatedAt = repoDeps(options).now()
  const result = db
    .prepare('UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(trash ? updatedAt : null, updatedAt, id)
  if (result.changes !== 1) throw new RepoError('IO_ERROR')
  const next = getNote(db, id)
  if (next === null) throw new RepoError('IO_ERROR')
  return next
}

export function purgeNote(db: VaultDatabase, id: string): void {
  const current = getNote(db, id)
  if (current === null) throw new RepoError('NOT_FOUND')
  if (current.deletedAt === null) throw new RepoError('INVALID_INPUT')
  const result = db.prepare('DELETE FROM notes WHERE id = ? AND deleted_at IS NOT NULL').run(id)
  if (result.changes !== 1) throw new RepoError('IO_ERROR')
}
