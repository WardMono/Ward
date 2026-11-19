import { ulid } from 'ulid'
import type { openVault } from '../open'
import { RepoError } from '../repo-error'

export type VaultDatabase = ReturnType<typeof openVault>

export type RepoDeps = {
  now?: () => string
  id?: () => string
}

export function repoDeps(options?: RepoDeps): { now: () => string; id: () => string } {
  return {
    now: options?.now ?? ((): string => new Date().toISOString()),
    id: options?.id ?? ((): string => ulid())
  }
}

export function requireName(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '' || trimmed.length > 200) throw new RepoError('INVALID_INPUT')
  return trimmed
}

export function optionalText(value: string | null | undefined, max = 2000): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  if (trimmed.length > max) throw new RepoError('INVALID_INPUT')
  return trimmed
}

export function requireMinor(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RepoError('INVALID_INPUT')
  return value
}

export function requireOrder(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RepoError('INVALID_INPUT')
  return value
}

export function requireCurrency(value: string | undefined): string {
  if (value === undefined) return 'PHP'
  if (!/^[A-Z]{3}$/.test(value)) throw new RepoError('INVALID_INPUT')
  return value
}

export function requireDay(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RepoError('INVALID_INPUT')
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RepoError('INVALID_INPUT')
  }
  return value
}

export function optionalTimestamp(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
    throw new RepoError('INVALID_INPUT')
  if (new Date(value).toISOString() !== value) throw new RepoError('INVALID_INPUT')
  return value
}

export function requireFolder(
  db: VaultDatabase,
  folderId: string | null | undefined
): string | null {
  if (folderId === undefined || folderId === null) return null
  const row = db.prepare('SELECT id FROM folders WHERE id = ?').get(folderId) as
    { id: string } | undefined
  if (row === undefined) throw new RepoError('NOT_FOUND')
  return folderId
}

export function asFlag(value: number): boolean {
  return value === 1
}

export function asBit(value: boolean): number {
  return value ? 1 : 0
}
