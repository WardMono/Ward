import { RepoError } from '../repo-error'
import {
  asBit,
  asFlag,
  optionalText,
  optionalTimestamp,
  repoDeps,
  requireFolder,
  requireName,
  requireOrder,
  type RepoDeps,
  type VaultDatabase
} from './common'

export type TaskStatus = 'todo' | 'doing' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export type Task = {
  id: string
  folderId: string | null
  parentId: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueAt: string | null
  sortOrder: number
  favorite: boolean
  completedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type NewTask = {
  folderId?: string | null
  parentId?: string | null
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  dueAt?: string | null
  sortOrder?: number
  favorite?: boolean
}

export type TaskPatch = {
  folderId?: string | null
  parentId?: string | null
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  dueAt?: string | null
  sortOrder?: number
  favorite?: boolean
}

type TaskRow = {
  id: string
  folder_id: string | null
  parent_id: string | null
  title: string
  description: string | null
  status: string
  priority: string
  due_at: string | null
  sort_order: number
  favorite: number
  completed_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

function isStatus(value: string): value is TaskStatus {
  return value === 'todo' || value === 'doing' || value === 'done'
}

function isPriority(value: string): value is TaskPriority {
  return value === 'low' || value === 'medium' || value === 'high'
}

function mapTask(row: TaskRow): Task {
  if (!isStatus(row.status) || !isPriority(row.priority)) throw new RepoError('IO_ERROR')
  return {
    id: row.id,
    folderId: row.folder_id,
    parentId: row.parent_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at,
    sortOrder: row.sort_order,
    favorite: asFlag(row.favorite),
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

function readTask(db: VaultDatabase, id: string): TaskRow | undefined {
  return db
    .prepare(
      'SELECT id, folder_id, parent_id, title, description, status, priority, due_at, sort_order, favorite, completed_at, created_at, updated_at, deleted_at FROM tasks WHERE id = ?'
    )
    .get(id) as TaskRow | undefined
}

function requireParent(
  db: VaultDatabase,
  parentId: string | null,
  taskId: string | null
): string | null {
  if (parentId === null) return null
  if (taskId !== null && parentId === taskId) throw new RepoError('INVALID_INPUT')
  const parent = db
    .prepare('SELECT parent_id, deleted_at FROM tasks WHERE id = ?')
    .get(parentId) as { parent_id: string | null; deleted_at: string | null } | undefined
  if (parent === undefined || parent.deleted_at !== null) throw new RepoError('NOT_FOUND')
  if (parent.parent_id !== null) throw new RepoError('INVALID_INPUT')
  if (taskId !== null) {
    const children = db
      .prepare('SELECT COUNT(*) AS n FROM tasks WHERE parent_id = ?')
      .get(taskId) as {
      n: number
    }
    if (children.n > 0) throw new RepoError('INVALID_INPUT')
  }
  return parentId
}

export function listTasks(db: VaultDatabase, scope: 'active' | 'trash' = 'active'): Task[] {
  const rows =
    scope === 'trash'
      ? (db
          .prepare(
            'SELECT id, folder_id, parent_id, title, description, status, priority, due_at, sort_order, favorite, completed_at, created_at, updated_at, deleted_at FROM tasks WHERE deleted_at IS NOT NULL ORDER BY sort_order ASC, updated_at DESC, id ASC'
          )
          .all() as TaskRow[])
      : (db
          .prepare(
            'SELECT id, folder_id, parent_id, title, description, status, priority, due_at, sort_order, favorite, completed_at, created_at, updated_at, deleted_at FROM tasks WHERE deleted_at IS NULL ORDER BY sort_order ASC, updated_at DESC, id ASC'
          )
          .all() as TaskRow[])
  return rows.map(mapTask)
}

export function getTask(db: VaultDatabase, id: string): Task | null {
  const row = readTask(db, id)
  return row === undefined ? null : mapTask(row)
}

export function createTask(db: VaultDatabase, input: NewTask, options?: RepoDeps): Task {
  const { now, id } = repoDeps(options)
  const createdAt = now()
  const status = input.status ?? 'todo'
  if (!isStatus(status)) throw new RepoError('INVALID_INPUT')
  const priority = input.priority ?? 'medium'
  if (!isPriority(priority)) throw new RepoError('INVALID_INPUT')
  const taskId = id()
  db.prepare(
    'INSERT INTO tasks (id, folder_id, parent_id, title, description, status, priority, due_at, sort_order, favorite, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    taskId,
    requireFolder(db, input.folderId),
    requireParent(db, input.parentId ?? null, null),
    requireName(input.title),
    optionalText(input.description),
    status,
    priority,
    optionalTimestamp(input.dueAt),
    requireOrder(input.sortOrder ?? 0),
    asBit(input.favorite ?? false),
    status === 'done' ? createdAt : null,
    createdAt,
    createdAt
  )
  const created = getTask(db, taskId)
  if (created === null) throw new RepoError('IO_ERROR')
  return created
}

export function updateTask(
  db: VaultDatabase,
  id: string,
  patch: TaskPatch,
  options?: RepoDeps
): Task {
  const { now } = repoDeps(options)
  const current = readTask(db, id)
  if (current === undefined || current.deleted_at !== null) throw new RepoError('NOT_FOUND')
  if (!isStatus(current.status) || !isPriority(current.priority)) throw new RepoError('IO_ERROR')
  const status = patch.status ?? current.status
  const priority = patch.priority ?? current.priority
  if (!isStatus(status) || !isPriority(priority)) throw new RepoError('INVALID_INPUT')
  const updatedAt = now()
  const completedAt = status === 'done' ? (current.completed_at ?? updatedAt) : null
  const result = db
    .prepare(
      'UPDATE tasks SET folder_id = ?, parent_id = ?, title = ?, description = ?, status = ?, priority = ?, due_at = ?, sort_order = ?, favorite = ?, completed_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
    )
    .run(
      patch.folderId === undefined ? current.folder_id : requireFolder(db, patch.folderId),
      patch.parentId === undefined ? current.parent_id : requireParent(db, patch.parentId, id),
      patch.title === undefined ? current.title : requireName(patch.title),
      patch.description === undefined ? current.description : optionalText(patch.description),
      status,
      priority,
      patch.dueAt === undefined ? current.due_at : optionalTimestamp(patch.dueAt),
      patch.sortOrder === undefined ? current.sort_order : requireOrder(patch.sortOrder),
      patch.favorite === undefined ? current.favorite : asBit(patch.favorite),
      completedAt,
      updatedAt,
      id
    )
  if (result.changes !== 1) throw new RepoError('IO_ERROR')
  const updated = getTask(db, id)
  if (updated === null) throw new RepoError('IO_ERROR')
  return updated
}

export function trashTask(db: VaultDatabase, id: string, options?: RepoDeps): Task {
  return markTask(db, id, true, options)
}

export function restoreTask(db: VaultDatabase, id: string, options?: RepoDeps): Task {
  return markTask(db, id, false, options)
}

function markTask(db: VaultDatabase, id: string, trash: boolean, options?: RepoDeps): Task {
  const current = getTask(db, id)
  if (current === null) throw new RepoError('NOT_FOUND')
  if (trash && current.deletedAt !== null) throw new RepoError('INVALID_INPUT')
  if (!trash && current.deletedAt === null) throw new RepoError('INVALID_INPUT')
  const updatedAt = repoDeps(options).now()
  const result = db
    .prepare('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(trash ? updatedAt : null, updatedAt, id)
  if (result.changes !== 1) throw new RepoError('IO_ERROR')
  const next = getTask(db, id)
  if (next === null) throw new RepoError('IO_ERROR')
  return next
}

export function purgeTask(db: VaultDatabase, id: string): void {
  const current = getTask(db, id)
  if (current === null) throw new RepoError('NOT_FOUND')
  if (current.deletedAt === null) throw new RepoError('INVALID_INPUT')
  const result = db.prepare('DELETE FROM tasks WHERE id = ? AND deleted_at IS NOT NULL').run(id)
  if (result.changes !== 1) throw new RepoError('IO_ERROR')
}
