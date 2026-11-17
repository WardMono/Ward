export type ResolvedTheme = 'dark' | 'light'

/**
 * The only writer of data-theme.
 * The circular reveal from PRD 7.5.1 is added in Phase 4. This step only sets the attribute.
 */
export function setTheme(next: ResolvedTheme): void {
  const root = document.documentElement
  root.dataset.theme = next
  root.style.colorScheme = next
}
