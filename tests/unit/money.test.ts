import { expect, test } from 'vitest'
import { addMinor, formatMinor, parseMinor } from '../../src/main/db/money'
import { RepoError } from '../../src/main/db/repo-error'

test('money parses and formats integer centavos', () => {
  expect(parseMinor('1,234.50')).toBe(123450)
  expect(formatMinor(123450)).toBe('1,234.50')
  expect(parseMinor(formatMinor(123450))).toBe(123450)
  expect(addMinor(parseMinor('0.1'), parseMinor('0.2'))).toBe(30)
  expect(formatMinor(30)).toBe('0.30')
  expect(parseMinor('0')).toBe(0)
  expect(formatMinor(0)).toBe('0.00')
})

test('money rejects negatives and extra decimals', () => {
  expect(() => parseMinor('-1')).toThrow(RepoError)
  expect(() => parseMinor('1.234')).toThrow(RepoError)
  expect(() => parseMinor('')).toThrow(RepoError)
  expect(() => parseMinor('12,34.00')).toThrow(RepoError)
  expect(() => addMinor(-1, 1)).toThrow(RepoError)
  expect(() => formatMinor(1.5)).toThrow(RepoError)
})
