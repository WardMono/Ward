import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

test('package name is ward', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { name: string }
  expect(pkg.name).toBe('ward')
})
