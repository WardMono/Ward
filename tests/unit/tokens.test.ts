import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const css = readFileSync('src/renderer/src/styles/tokens.css', 'utf8')

const required = [
  '--bg-base',
  '--bg-surface',
  '--bg-elevated',
  '--bg-hover',
  '--bg-active',
  '--border-subtle',
  '--border-strong',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--accent',
  '--accent-hover',
  '--accent-pressed',
  '--on-accent',
  '--success',
  '--warning',
  '--danger',
  '--focus-ring'
]

function channel(hex: string, shift: number): number {
  const value = parseInt(hex.slice(1), 16) >> shift
  const byte = (value & 255) / 255
  return byte <= 0.04045 ? byte / 12.92 : ((byte + 0.055) / 1.055) ** 2.4
}

function contrast(foreground: string, background: string): number {
  const luminance = (hex: string): number =>
    0.2126 * channel(hex, 16) + 0.7152 * channel(hex, 8) + 0.0722 * channel(hex, 0)
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

function valueOf(block: string, name: string): string {
  const start = block.indexOf(`${name}:`)
  const hash = block.indexOf('#', start)
  if (start < 0 || hash < 0 || hash - start > 40) throw new Error(`missing ${name}`)
  return block.slice(hash, hash + 7)
}

test('tokens.css defines every section 7.2 color in dark and light', () => {
  const lightAt = css.indexOf("data-theme='light'")
  expect(lightAt).toBeGreaterThan(0)
  const dark = css.slice(0, lightAt)
  const light = css.slice(lightAt)
  for (const name of required) {
    expect(dark).toContain(name)
    expect(light).toContain(name)
  }
  expect(valueOf(dark, '--bg-base')).toBe('#0b0d12')
  expect(valueOf(dark, '--accent')).toBe('#7c8cff')
  expect(valueOf(light, '--bg-base')).toBe('#f6f7fa')
  expect(valueOf(light, '--accent')).toBe('#4f5fe8')
  expect(valueOf(light, '--on-accent')).toBe('#ffffff')
})

test('text and accent pairs meet WCAG AA', () => {
  const lightAt = css.indexOf("data-theme='light'")
  const blocks = [css.slice(0, lightAt), css.slice(lightAt)]
  for (const block of blocks) {
    const base = valueOf(block, '--bg-base')
    expect(contrast(valueOf(block, '--text-primary'), base)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(valueOf(block, '--text-secondary'), base)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(valueOf(block, '--text-muted'), base)).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(valueOf(block, '--on-accent'), valueOf(block, '--accent'))
    ).toBeGreaterThanOrEqual(4.5)
    expect(contrast(valueOf(block, '--success'), base)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(valueOf(block, '--warning'), base)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(valueOf(block, '--danger'), base)).toBeGreaterThanOrEqual(4.5)
  }
})
