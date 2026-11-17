/* eslint-disable security/detect-non-literal-fs-filename -- the path is a temp directory created in this process */
import { randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import sodium from 'libsodium-wrappers-sumo'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3-multiple-ciphers')

const marker = 'WARD_PLAINTEXT_MARKER'
const password = 'spike-password'

function safe(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/[0-9a-f]{32,}/gi, '[redacted]')
}

function fail(step, error) {
  console.log(`FAIL ${step} ${safe(error)}`)
  process.exit(1)
}

function openEncrypted(file, key) {
  const db = new Database(file)
  db.pragma(`cipher='sqlcipher'`)
  db.pragma(`key = "x'${key.toString('hex')}'"`)
  return db
}

function spikeDatabase() {
  const dir = mkdtempSync(join(tmpdir(), 'ward-spike-'))
  const file = join(dir, 'ward.db')
  const key = randomBytes(32)
  try {
    const created = openEncrypted(file, key)
    created.exec('CREATE TABLE probe (note TEXT)')
    created.prepare('INSERT INTO probe (note) VALUES (?)').run(marker)
    const written = created.prepare('SELECT note FROM probe').get()
    created.close()
    if (written === undefined || written.note !== marker) fail('db-write', 'row missing')

    const bytes = readFileSync(file)
    if (bytes.includes(Buffer.from(marker))) fail('db-plaintext', 'marker found on disk')
    if (bytes.subarray(0, 16).toString('utf8').startsWith('SQLite format 3')) {
      fail('db-plaintext', 'file has a plaintext sqlite header')
    }

    const opened = openEncrypted(file, key)
    const again = opened.prepare('SELECT note FROM probe').get()
    opened.close()
    if (again === undefined || again.note !== marker)
      fail('db-reopen', 'right key did not read the row')

    let wrongRejected = false
    try {
      const wrong = openEncrypted(file, randomBytes(32))
      wrong.prepare('SELECT note FROM probe').get()
      wrong.close()
    } catch {
      wrongRejected = true
    }
    if (!wrongRejected) fail('db-wrong-key', 'wrong key was accepted')
    console.log('PASS db')
  } catch (error) {
    fail('db', error)
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      // Windows can keep the database file locked for a moment after close.
    }
  }
}

async function timeKdf(label, opsLimit, memLimit) {
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES)
  const started = process.hrtime.bigint()
  sodium.crypto_pwhash(32, password, salt, opsLimit, memLimit, sodium.crypto_pwhash_ALG_ARGON2ID13)
  const ms = Number(process.hrtime.bigint() - started) / 1e6
  console.log(`${label} ${ms.toFixed(0)} ms ops ${opsLimit} mem ${memLimit}`)
}

async function spikeCrypto() {
  await sodium.ready
  await timeKdf(
    'KDF_INTERACTIVE',
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE
  )
  await timeKdf(
    'KDF_MODERATE',
    sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    sodium.crypto_pwhash_MEMLIMIT_MODERATE
  )
  const key = sodium.randombytes_buf(32)
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)
  const message = sodium.from_string('round-trip')
  const associated = sodium.from_string('ward-spike')
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    message,
    associated,
    null,
    nonce,
    key
  )
  const plain = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    associated,
    nonce,
    key
  )
  if (sodium.to_string(plain) !== 'round-trip') fail('aead', 'decrypt mismatch')
  console.log('PASS aead')
}

if (process.versions.electron === undefined) {
  console.log('FAIL runtime expected Electron')
  process.exit(1)
}

console.log(`RUNTIME electron ${process.versions.electron}`)
spikeDatabase()
await spikeCrypto()
console.log('PASS spike')
process.exit(0)
