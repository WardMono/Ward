/** Production policy from PRD 4.7. Do not weaken this string. */
export const PRODUCTION_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"

const DEV_CONNECT =
  "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*"

/**
 * Dev allows the Vite socket and the React refresh inline script.
 * Production keeps script-src 'self' and connect-src 'none'.
 */
export function contentSecurityPolicy(dev: boolean): string {
  if (!dev) return PRODUCTION_CSP
  // Vite's React refresh preamble is an inline module script. Production does not get this.
  return PRODUCTION_CSP.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'").replace(
    "connect-src 'none'",
    DEV_CONNECT
  )
}

export function isAppDocument(url: string): boolean {
  return (
    url.startsWith('file:') ||
    url.startsWith('http://localhost') ||
    url.startsWith('http://127.0.0.1')
  )
}

export function cspResponseHeaders(
  url: string,
  existing: Record<string, string | string[] | undefined> | undefined,
  dev: boolean
): Record<string, string | string[]> | undefined {
  if (!isAppDocument(url)) return undefined
  const headers: Record<string, string | string[]> = {}
  if (existing !== undefined) {
    for (const [key, value] of Object.entries(existing)) {
      if (value !== undefined) {
        // Header names come from Electron's response, not from a request.
        // eslint-disable-next-line security/detect-object-injection
        headers[key] = value
      }
    }
  }
  headers['Content-Security-Policy'] = [contentSecurityPolicy(dev)]
  return headers
}
