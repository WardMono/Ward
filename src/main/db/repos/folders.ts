import { RepoError } from '../repo-error'
import {
  optionalText,
  repoDeps,
  requireName,
  requireOrder,
  type RepoDeps,
  type VaultDatabase
} from './common'

export type Folder = {
  id: string
  parentId: string | null
  name: string
  color: string | null
  icon: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type NewFolder = {
  parentId?: string | null
  name: string
  color?: string | null
  icon?: string | null
  sortOrder?: number
}

export type FolderPatch = {
  parentId?: string | null
  name?: string
  color?: string | null
  icon?: string | null
  sortOrder?: number
}

type FolderRow = {
  id: string
  parent_id: string | null
  name: string
  color: string | null
  icon: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

const SELECT_FOLDER =
  'SELECT id, parent_id, name, color, icon, sort_order, created_at, updated_at FROM folders WHERE id = ?'

function mapFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function readFolder(db: VaultDatabase, id: string): FolderRow | undefined {
  return db.prepare(SELECT_FOLDER).get(id) as FolderRow | undefined
}

function ancestorDepth(
  db: VaultDatabase,
  parentId: string | null,
  movingId: string | null
): number {
  let depth = 1
  let current = parentId
  const seen = new Set<string>()
  while (current !== null) {
    if (movingId !== null && current === movingId) throw new RepoError('INVALID_INPUT')
    if (seen.has(current)) throw new RepoError('INVALID_INPUT')
    seen.add(current)
    depth += 1
    if (depth > 3) throw new RepoError('INVALID_INPUT')
    const row = db.prepare('SELECT parent_id FROM folders WHERE id = ?').get(current) as
      { parent_id: string | null } | undefined
    if (row === undefined) throw new RepoError('NOT_FOUND')
    current = row.parent_id
  }
  return depth
}

function levelsBelow(db: VaultDatabase, id: string): number {
  const children = db.prepare('SELECT id FROM folders WHERE parent_id = ?').all(id) as {
    id: string
  }[]
  let below = 0
  for (const child of children) {
    below = Math.max(below, 1 + levelsBelow(db, child.id))
  }
  return below
}

function placeFolder(db: VaultDatabase, parentId: string | null, movingId: string | null): void {
  const depth = ancestorDepth(db, parentId, movingId)
  const extra = movingId === null ? 0 : levelsBelow(db, movingId)
  if (depth + extra > 3) throw new RepoError('INVALID_INPUT')
}

export function listFolders(db: VaultDatabase): Folder[] {
  const rows = db
    .prepare(
      'SELECT id, parent_id, name, color, icon, sort_order, created_at, updated_at FROM folders ORDER BY sort_order ASC, name ASC, id ASC'
    )
    .all() as FolderRow[]
  return rows.map(mapFolder)
}

export function getFolder(db: VaultDatabase, id: string): Folder | null {
  const row = readFolder(db, id)
  return row === undefined ? null : mapFolder(row)
}

export function createFolder(db: VaultDatabase, input: NewFolder, options?: RepoDeps): Folder {
  const { now, id } = repoDeps(options)
  const parentId = input.parentId ?? null
  placeFolder(db, parentId, null)
  const createdAt = now()
  const folderId = id()
  db.prepare(
    'INSERT INTO folders (id, parent_id, name, color, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    folderId,
    parentId,
    requireName(input.name),
    optionalText(input.color, 64),
    optionalText(input.icon, 64),
    requireOrder(input.sortOrder ?? 0),
    createdAt,
    createdAt
  )
  const created = getFolder(db, folderId)
  if (created === null) throw new RepoError('IO_ERROR')
  return created
}

export function updateFolder(
  db: VaultDatabase,
  id: string,
  patch: FolderPatch,
  options?: RepoDeps
): Folder {
  const { now } = repoDeps(options)
  const current = readFolder(db, id)
  if (current === undefined) throw new RepoError('NOT_FOUND')
  const parentId = patch.parentId === undefined ? current.parent_id : patch.parentId
  placeFolder(db, parentId, id)
  const updatedAt = now()
  const result = db
    .prepare(
      'UPDATE folders SET parent_id = ?, name = ?, color = ?, icon = ?, sort_order = ?, updated_at = ? WHERE id = ?'
    )
    .run(
      parentId,
      patch.name === undefined ? current.name : requireName(patch.name),
      patch.color === undefined ? current.color : optionalText(patch.color, 64),
      patch.icon === undefined ? current.icon : optionalText(patch.icon, 64),
      patch.sortOrder === undefined ? current.sort_order : requireOrder(patch.sortOrder),
      updatedAt,
      id
    )
  if (result.changes !== 1) throw new RepoError('IO_ERROR')
  const updated = getFolder(db, id)
  if (updated === null) throw new RepoError('IO_ERROR')
  return updated
}

/** Deletes the folder. Child folders go with it. Items in those folders become unfiled. */
export function deleteFolder(db: VaultDatabase, id: string): void {
  if (readFolder(db, id) === undefined) throw new RepoError('NOT_FOUND')
  const result = db.prepare('DELETE FROM folders WHERE id = ?').run(id)
  if (result.changes !== 1) throw new RepoError('IO_ERROR')
}
