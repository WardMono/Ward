import { RepoError } from '../repo-error'
import type { VaultDatabase } from './common'

export type SearchHit = {
  type: 'entry' | 'note' | 'task' | 'income'
  id: string
  title: string
}

type HitRow = { id: string; title: string }

function matchText(query: string): string {
  const trimmed = query.trim()
  if (trimmed === '') throw new RepoError('INVALID_INPUT')
  return `"${trimmed.replaceAll('"', '""')}"`
}

function hits(db: VaultDatabase, sql: string, query: string, type: SearchHit['type']): SearchHit[] {
  const rows = db.prepare(sql).all(query) as HitRow[]
  return rows.map((row) => ({ type, id: row.id, title: row.title }))
}

/** Searches titles and the other indexed fields. Passwords are not in the index. */
export function searchAll(db: VaultDatabase, query: string): SearchHit[] {
  let phrase: string
  try {
    phrase = matchText(query)
  } catch (error) {
    if (error instanceof RepoError) throw error
    throw new RepoError('INVALID_INPUT')
  }
  try {
    return [
      ...hits(
        db,
        'SELECT entries.id AS id, entries.title AS title FROM entries JOIN entries_fts ON entries_fts.rowid = entries.rowid WHERE entries_fts MATCH ? AND entries.deleted_at IS NULL ORDER BY entries.id ASC',
        phrase,
        'entry'
      ),
      ...hits(
        db,
        'SELECT notes.id AS id, notes.title AS title FROM notes JOIN notes_fts ON notes_fts.rowid = notes.rowid WHERE notes_fts MATCH ? AND notes.deleted_at IS NULL ORDER BY notes.id ASC',
        phrase,
        'note'
      ),
      ...hits(
        db,
        'SELECT tasks.id AS id, tasks.title AS title FROM tasks JOIN tasks_fts ON tasks_fts.rowid = tasks.rowid WHERE tasks_fts MATCH ? AND tasks.deleted_at IS NULL ORDER BY tasks.id ASC',
        phrase,
        'task'
      ),
      ...hits(
        db,
        'SELECT income.id AS id, income.client AS title FROM income JOIN income_fts ON income_fts.rowid = income.rowid WHERE income_fts MATCH ? AND income.deleted_at IS NULL ORDER BY income.id ASC',
        phrase,
        'income'
      )
    ]
  } catch (error) {
    if (error instanceof RepoError) throw error
    throw new RepoError('INVALID_INPUT')
  }
}
