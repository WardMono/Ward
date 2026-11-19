import { RepoError } from '../repo-error'
import type { VaultDatabase } from './common'

export function getSetting(db: VaultDatabase, key: string): unknown {
  if (key.trim() === '') throw new RepoError('INVALID_INPUT')
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    { value: string } | undefined
  if (row === undefined) return null
  try {
    return JSON.parse(row.value) as unknown
  } catch {
    throw new RepoError('IO_ERROR')
  }
}

export function setSetting(db: VaultDatabase, key: string, value: unknown): void {
  if (key.trim() === '') throw new RepoError('INVALID_INPUT')
  let encoded: string
  try {
    const result = JSON.stringify(value)
    if (typeof result !== 'string') throw new RepoError('INVALID_INPUT')
    encoded = result
  } catch (error) {
    if (error instanceof RepoError) throw error
    throw new RepoError('INVALID_INPUT')
  }
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, encoded)
}
