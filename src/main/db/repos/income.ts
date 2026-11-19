import { RepoError } from '../repo-error'
import {
  optionalText,
  repoDeps,
  requireCurrency,
  requireDay,
  requireFolder,
  requireMinor,
  requireName,
  type RepoDeps,
  type VaultDatabase
} from './common'

export type IncomeStatus = 'pending' | 'paid'

export type Income = {
  id: string
  folderId: string | null
  receivedOn: string
  client: string
  description: string | null
  amountMinor: number
  currency: string
  category: string | null
  status: IncomeStatus
  reference: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type NewIncome = {
  folderId?: string | null
  receivedOn: string
  client: string
  description?: string | null
  amountMinor: number
  currency?: string
  category?: string | null
  status?: IncomeStatus
  reference?: string | null
  notes?: string | null
}

export type IncomePatch = {
  folderId?: string | null
  receivedOn?: string
  client?: string
  description?: string | null
  amountMinor?: number
  currency?: string
  category?: string | null
  status?: IncomeStatus
  reference?: string | null
  notes?: string | null
}

type IncomeRow = {
  id: string
  folder_id: string | null
  received_on: string
  client: string
  description: string | null
  amount_minor: number
  currency: string
  category: string | null
  status: string
  reference: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

function isStatus(value: string): value is IncomeStatus {
  return value === 'pending' || value === 'paid'
}

function mapIncome(row: IncomeRow): Income {
  if (!isStatus(row.status)) throw new RepoError('IO_ERROR')
  return {
    id: row.id,
    folderId: row.folder_id,
    receivedOn: row.received_on,
    client: row.client,
    description: row.description,
    amountMinor: row.amount_minor,
    currency: row.currency,
    category: row.category,
    status: row.status,
    reference: row.reference,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

function readIncome(db: VaultDatabase, id: string): IncomeRow | undefined {
  return db
    .prepare(
      'SELECT id, folder_id, received_on, client, description, amount_minor, currency, category, status, reference, notes, created_at, updated_at, deleted_at FROM income WHERE id = ?'
    )
    .get(id) as IncomeRow | undefined
}

export function listIncome(db: VaultDatabase, scope: 'active' | 'trash' = 'active'): Income[] {
  const rows =
    scope === 'trash'
      ? (db
          .prepare(
            'SELECT id, folder_id, received_on, client, description, amount_minor, currency, category, status, reference, notes, created_at, updated_at, deleted_at FROM income WHERE deleted_at IS NOT NULL ORDER BY received_on DESC, id ASC'
          )
          .all() as IncomeRow[])
      : (db
          .prepare(
            'SELECT id, folder_id, received_on, client, description, amount_minor, currency, category, status, reference, notes, created_at, updated_at, deleted_at FROM income WHERE deleted_at IS NULL ORDER BY received_on DESC, id ASC'
          )
          .all() as IncomeRow[])
  return rows.map(mapIncome)
}

export function getIncome(db: VaultDatabase, id: string): Income | null {
  const row = readIncome(db, id)
  return row === undefined ? null : mapIncome(row)
}

export function createIncome(db: VaultDatabase, input: NewIncome, options?: RepoDeps): Income {
  const { now, id } = repoDeps(options)
  const status = input.status ?? 'paid'
  if (!isStatus(status)) throw new RepoError('INVALID_INPUT')
  const createdAt = now()
  const incomeId = id()
  db.prepare(
    'INSERT INTO income (id, folder_id, received_on, client, description, amount_minor, currency, category, status, reference, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    incomeId,
    requireFolder(db, input.folderId),
    requireDay(input.receivedOn),
    requireName(input.client),
    optionalText(input.description),
    requireMinor(input.amountMinor),
    requireCurrency(input.currency),
    optionalText(input.category, 64),
    status,
    optionalText(input.reference),
    optionalText(input.notes),
    createdAt,
    createdAt
  )
  const created = getIncome(db, incomeId)
  if (created === null) throw new RepoError('IO_ERROR')
  return created
}

export function updateIncome(
  db: VaultDatabase,
  id: string,
  patch: IncomePatch,
  options?: RepoDeps
): Income {
  const { now } = repoDeps(options)
  const current = readIncome(db, id)
  if (current === undefined || current.deleted_at !== null) throw new RepoError('NOT_FOUND')
  if (!isStatus(current.status)) throw new RepoError('IO_ERROR')
  const status = patch.status ?? current.status
  if (!isStatus(status)) throw new RepoError('INVALID_INPUT')
  const result = db
    .prepare(
      'UPDATE income SET folder_id = ?, received_on = ?, client = ?, description = ?, amount_minor = ?, currency = ?, category = ?, status = ?, reference = ?, notes = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
    )
    .run(
      patch.folderId === undefined ? current.folder_id : requireFolder(db, patch.folderId),
      patch.receivedOn === undefined ? current.received_on : requireDay(patch.receivedOn),
      patch.client === undefined ? current.client : requireName(patch.client),
      patch.description === undefined ? current.description : optionalText(patch.description),
      patch.amountMinor === undefined ? current.amount_minor : requireMinor(patch.amountMinor),
      patch.currency === undefined ? current.currency : requireCurrency(patch.currency),
      patch.category === undefined ? current.category : optionalText(patch.category, 64),
      status,
      patch.reference === undefined ? current.reference : optionalText(patch.reference),
      patch.notes === undefined ? current.notes : optionalText(patch.notes),
      now(),
      id
    )
  if (result.changes !== 1) throw new RepoError('IO_ERROR')
  const updated = getIncome(db, id)
  if (updated === null) throw new RepoError('IO_ERROR')
  return updated
}

export function trashIncome(db: VaultDatabase, id: string, options?: RepoDeps): Income {
  return markIncome(db, id, true, options)
}

export function restoreIncome(db: VaultDatabase, id: string, options?: RepoDeps): Income {
  return markIncome(db, id, false, options)
}

function markIncome(db: VaultDatabase, id: string, trash: boolean, options?: RepoDeps): Income {
  const current = getIncome(db, id)
  if (current === null) throw new RepoError('NOT_FOUND')
  if (trash && current.deletedAt !== null) throw new RepoError('INVALID_INPUT')
  if (!trash && current.deletedAt === null) throw new RepoError('INVALID_INPUT')
  const updatedAt = repoDeps(options).now()
  const result = db
    .prepare('UPDATE income SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(trash ? updatedAt : null, updatedAt, id)
  if (result.changes !== 1) throw new RepoError('IO_ERROR')
  const next = getIncome(db, id)
  if (next === null) throw new RepoError('IO_ERROR')
  return next
}

export function purgeIncome(db: VaultDatabase, id: string): void {
  const current = getIncome(db, id)
  if (current === null) throw new RepoError('NOT_FOUND')
  if (current.deletedAt === null) throw new RepoError('INVALID_INPUT')
  const result = db.prepare('DELETE FROM income WHERE id = ? AND deleted_at IS NOT NULL').run(id)
  if (result.changes !== 1) throw new RepoError('IO_ERROR')
}
