import { getSodium, randomBytes } from './sodium'

/** BLAKE2b key. Fixed domain separation for the recovery key. Not a secret. */
export const RECOVERY_CONTEXT = 'ward.recovery.rkek.v1'
export const RECOVERY_KEY_BYTES = 32

const REJECTED = 'Recovery key was not accepted.'
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const CHECK_ALPHABET = `${ALPHABET}*~$=U`
const BODY_SYMBOLS = 52

const decodeValue = new Map<string, number>()
for (let value = 0; value < CHECK_ALPHABET.length; value += 1) {
  const symbol = CHECK_ALPHABET.charAt(value)
  decodeValue.set(symbol, value)
  decodeValue.set(symbol.toLowerCase(), value)
}
decodeValue.set('O', 0)
decodeValue.set('o', 0)
decodeValue.set('I', 1)
decodeValue.set('i', 1)
decodeValue.set('L', 1)
decodeValue.set('l', 1)

export function createRecoveryKey(): { secret: Uint8Array; display: string } {
  const secret = randomBytes(RECOVERY_KEY_BYTES)
  return { secret, display: encodeRecoveryKey(secret) }
}

export function encodeRecoveryKey(secret: Uint8Array): string {
  if (secret.byteLength !== RECOVERY_KEY_BYTES) throw new Error(REJECTED)
  const number = bytesToNumber(secret)
  const check = Number(number % 37n)
  let body = ''
  for (let shift = BODY_SYMBOLS - 1; shift >= 0; shift -= 1) {
    body += ALPHABET.charAt(Number((number >> BigInt(shift * 5)) & 31n))
  }
  const groups: string[] = []
  for (let index = 0; index < body.length; index += 4) groups.push(body.slice(index, index + 4))
  groups.push(CHECK_ALPHABET.charAt(check))
  return groups.join('-')
}

export function decodeRecoveryKey(display: string): Uint8Array {
  const symbols = normalizedSymbols(display)
  const hasCheck = symbols.length === BODY_SYMBOLS + 1
  if (!hasCheck && symbols.length !== BODY_SYMBOLS) throw new Error(REJECTED)

  const body = symbols.slice(0, BODY_SYMBOLS)
  let number = 0n
  for (const value of body) {
    if (value > 31) throw new Error(REJECTED)
    number = (number << 5n) | BigInt(value)
  }
  if (number >> 256n !== 0n) throw new Error(REJECTED)
  if (hasCheck) {
    const check = symbols.at(-1)
    const expected = Number(number % 37n)
    if (check === undefined || check > 36 || check !== expected) throw new Error(REJECTED)
  }
  return numberToBytes(number)
}

export function deriveRkek(secret: Uint8Array): Uint8Array {
  if (secret.byteLength !== RECOVERY_KEY_BYTES) throw new Error(REJECTED)
  const sodium = getSodium()
  if (RECOVERY_CONTEXT.length > sodium.crypto_generichash_KEYBYTES_MAX) throw new Error(REJECTED)
  try {
    return sodium.crypto_generichash(sodium.crypto_generichash_BYTES, secret, RECOVERY_CONTEXT)
  } catch {
    throw new Error(REJECTED)
  }
}

function bytesToNumber(secret: Uint8Array): bigint {
  let number = 0n
  for (const byte of secret) number = (number << 8n) | BigInt(byte)
  return number
}

function numberToBytes(number: bigint): Uint8Array {
  const bytes: number[] = []
  let rest = number
  while (bytes.length < RECOVERY_KEY_BYTES) {
    bytes.push(Number(rest & 0xffn))
    rest >>= 8n
  }
  return Uint8Array.from(bytes.reverse())
}

function normalizedSymbols(display: string): number[] {
  const symbols: number[] = []
  for (const character of display) {
    if (
      character === '-' ||
      character === ' ' ||
      character === '\n' ||
      character === '\r' ||
      character === '\t'
    )
      continue
    const value = decodeValue.get(character)
    if (value === undefined) throw new Error(REJECTED)
    symbols.push(value)
  }
  return symbols
}
