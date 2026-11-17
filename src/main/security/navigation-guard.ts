/** Stops a navigation. New windows use DENY_WINDOW. Neither path opens an external URL. */
export function blockNavigation(details: { preventDefault: () => void }): void {
  details.preventDefault()
}

export const DENY_WINDOW = { action: 'deny' } as const

/** https URLs only. Credentials in the URL are rejected. */
export function httpsUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  if (url.username !== '' || url.password !== '') return null
  return url.href
}

export async function openHttpsAfterConfirm(
  raw: string,
  confirm: (url: string) => Promise<boolean>,
  open: (url: string) => Promise<void>
): Promise<'opened' | 'rejected' | 'cancelled'> {
  const url = httpsUrl(raw)
  if (url === null) return 'rejected'
  const accepted = await confirm(url)
  if (!accepted) return 'cancelled'
  await open(url)
  return 'opened'
}
