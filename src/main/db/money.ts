import { RepoError } from './repo-error'

/** Parses a decimal amount into integer centavos. Never uses binary floating point. */
export function parseMinor(input: string): number {
  const trimmed = input.trim()
  const dot = trimmed.indexOf('.')
  if (dot !== trimmed.lastIndexOf('.')) throw new RepoError('INVALID_INPUT')
  const head = dot === -1 ? trimmed : trimmed.slice(0, dot)
  const fraction = dot === -1 ? '' : trimmed.slice(dot + 1)
  if (dot !== -1 && (fraction.length < 1 || fraction.length > 2 || !digitsOnly(fraction))) {
    throw new RepoError('INVALID_INPUT')
  }
  const groups = head.split(',')
  if (!groupedDigits(groups)) throw new RepoError('INVALID_INPUT')
  const whole = groups.join('')
  if (whole.length > 15) throw new RepoError('INVALID_INPUT')
  const cents =
    fraction.length === 0 ? 0 : fraction.length === 1 ? Number(fraction) * 10 : Number(fraction)
  const minor = Number(whole) * 100 + cents
  if (!Number.isSafeInteger(minor) || minor < 0) throw new RepoError('INVALID_INPUT')
  return minor
}

/** Formats integer centavos as a grouped decimal string. */
export function formatMinor(minor: number): string {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new RepoError('INVALID_INPUT')
  const major = Math.floor(minor / 100)
  const cents = minor % 100
  return `${groupDigits(String(major))}.${String(cents).padStart(2, '0')}`
}

/** Adds two minor-unit amounts. */
export function addMinor(left: number, right: number): number {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right) || left < 0 || right < 0) {
    throw new RepoError('INVALID_INPUT')
  }
  const sum = left + right
  if (!Number.isSafeInteger(sum)) throw new RepoError('INVALID_INPUT')
  return sum
}

function groupDigits(digits: string): string {
  const parts: string[] = []
  let rest = digits
  while (rest.length > 3) {
    parts.push(rest.slice(-3))
    rest = rest.slice(0, -3)
  }
  parts.push(rest)
  return parts.reverse().join(',')
}

function digitsOnly(value: string): boolean {
  if (value === '') return false
  for (const char of value) {
    if (char < '0' || char > '9') return false
  }
  return true
}

function groupedDigits(groups: string[]): boolean {
  const first = groups.at(0) ?? ''
  if (groups.length === 1) return digitsOnly(first)
  if (first.length < 1 || first.length > 3 || !digitsOnly(first)) return false
  for (const group of groups.slice(1)) {
    if (group.length !== 3 || !digitsOnly(group)) return false
  }
  return true
}
