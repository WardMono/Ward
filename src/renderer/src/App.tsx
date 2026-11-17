import { useState } from 'react'
import { setTheme, type ResolvedTheme } from './design/theme'

const swatches = [
  ['Base', '--bg-base'],
  ['Surface', '--bg-surface'],
  ['Elevated', '--bg-elevated'],
  ['Hover', '--bg-hover'],
  ['Active', '--bg-active'],
  ['Accent', '--accent'],
  ['Success', '--success'],
  ['Warning', '--warning'],
  ['Danger', '--danger']
] as const

const folders = [
  '--folder-indigo',
  '--folder-violet',
  '--folder-pink',
  '--folder-rose',
  '--folder-orange',
  '--folder-amber',
  '--folder-lime',
  '--folder-emerald',
  '--folder-teal',
  '--folder-sky',
  '--folder-slate'
] as const

function App(): React.JSX.Element {
  const [theme, setLocalTheme] = useState<ResolvedTheme>('dark')

  function toggleTheme(): void {
    const next: ResolvedTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setLocalTheme(next)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-caption font-medium text-(--text-muted) uppercase">On this device</p>
          <h1 className="text-display font-semibold tracking-title text-balance">Ward</h1>
          <p className="mt-4 max-w-xl text-body text-(--text-secondary)">
            Token showcase. The vault is not built yet. Nothing here is sent anywhere.
          </p>
        </div>
        <button
          type="button"
          className="rounded-input bg-(--accent) px-4 py-2 text-ui font-medium text-(--on-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? 'Show light tokens' : 'Show dark tokens'}
        </button>
      </header>

      <section aria-label="Colors" className="grid grid-cols-3 gap-3">
        {swatches.map(([label, token]) => (
          <div
            key={token}
            className="overflow-hidden rounded-card border border-(--border-subtle) shadow-elev-1"
          >
            <div className="h-12" style={{ background: `var(${token})` }} />
            <p className="px-3 py-2 text-caption text-(--text-secondary)">{label}</p>
          </div>
        ))}
      </section>

      <section aria-label="Type" className="flex flex-col gap-2">
        <p className="text-caption font-medium text-(--text-muted)">Caption</p>
        <p className="text-ui text-(--text-secondary)">Interface text</p>
        <p className="text-body">Body text</p>
        <p className="text-subtitle font-semibold">Subtitle</p>
        <p className="font-mono text-ui text-(--text-primary) tabular-nums">1,234.00</p>
      </section>

      <section aria-label="Folders" className="flex flex-wrap gap-2">
        {folders.map((token) => (
          <span
            key={token}
            className="inline-flex items-center gap-2 rounded-pill border border-(--border-subtle) px-3 py-1 text-caption text-(--text-secondary)"
          >
            <span
              className="inline-block size-2 rounded-pill"
              style={{ background: `var(${token})` }}
            />
            {token.replace('--folder-', '')}
          </span>
        ))}
      </section>
    </main>
  )
}

export default App
