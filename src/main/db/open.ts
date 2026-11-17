import Database from 'better-sqlite3-multiple-ciphers'

/** Loads the native cipher module. It does not open the vault. */
export function loadCipherDriver(): void {
  const db = new Database(':memory:')
  db.close()
}
