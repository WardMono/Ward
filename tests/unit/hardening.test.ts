import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { emptyPayload, isAppSender } from '../../src/main/ipc/guard'
import {
  PRODUCTION_CSP,
  contentSecurityPolicy,
  cspResponseHeaders
} from '../../src/main/security/csp'
import {
  DENY_WINDOW,
  blockNavigation,
  httpsUrl,
  openHttpsAfterConfirm
} from '../../src/main/security/navigation-guard'
import { denyPermissions } from '../../src/main/security/permissions'
import { hardeningWebPreferences } from '../../src/main/security/web-preferences'
import { rendererTarget } from '../../src/main/launch-target'
import { APP_GET_VERSION } from '../../src/shared/ipc-contract'

const PRD_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"

test('production CSP matches section 4.7', () => {
  expect(PRODUCTION_CSP).toBe(PRD_CSP)
  expect(contentSecurityPolicy(false)).toBe(PRD_CSP)
  expect(contentSecurityPolicy(true)).toContain('ws://localhost:*')
  expect(contentSecurityPolicy(true)).toContain("script-src 'self' 'unsafe-inline'")
  expect(contentSecurityPolicy(true)).not.toContain("connect-src 'none'")
  expect(contentSecurityPolicy(false)).not.toContain("script-src 'self' 'unsafe-inline'")
  expect(contentSecurityPolicy(false)).toContain("style-src 'self' 'unsafe-inline'")
})

test('external links accept https and reject everything else', () => {
  expect(httpsUrl('https://example.com/path')).toBe('https://example.com/path')
  expect(httpsUrl('http://example.com')).toBeNull()
  expect(httpsUrl('javascript:alert(1)')).toBeNull()
  expect(httpsUrl('file:///C:/Windows')).toBeNull()
  expect(httpsUrl('https://user:secret@example.com')).toBeNull()
})

test('https open waits for confirm and never opens a rejected URL', async () => {
  const opened: string[] = []
  const rejected = await openHttpsAfterConfirm(
    'http://example.com',
    async () => true,
    async (url) => {
      opened.push(url)
    }
  )
  expect(rejected).toBe('rejected')
  expect(opened).toEqual([])

  const cancelled = await openHttpsAfterConfirm(
    'https://example.com',
    async () => false,
    async (url) => {
      opened.push(url)
    }
  )
  expect(cancelled).toBe('cancelled')
  expect(opened).toEqual([])

  const result = await openHttpsAfterConfirm(
    'https://example.com/docs',
    async () => true,
    async (url) => {
      opened.push(url)
    }
  )
  expect(result).toBe('opened')
  expect(opened).toEqual(['https://example.com/docs'])
})

test('navigation is blocked and new windows are denied', () => {
  let prevented = false
  blockNavigation({
    preventDefault: () => {
      prevented = true
    }
  })
  expect(prevented).toBe(true)
  expect(DENY_WINDOW).toEqual({ action: 'deny' })
})

test('CSP is attached only to this app and forces connect-src none outside dev', () => {
  const headers = cspResponseHeaders('file:///app/index.html', { 'X-Test': ['1'] }, false)
  expect(headers?.['Content-Security-Policy']).toEqual([PRD_CSP])
  expect(cspResponseHeaders('https://example.com', undefined, false)).toBeUndefined()
})

test('permissions are denied', () => {
  let requested: boolean | null = null
  let checked: boolean | null = null
  denyPermissions({
    setPermissionRequestHandler: (handler) => {
      handler(null, 'media', (allowed) => {
        requested = allowed
      })
    },
    setPermissionCheckHandler: (handler) => {
      checked = handler(null, 'geolocation', 'file://')
    }
  })
  expect(requested).toBe(false)
  expect(checked).toBe(false)
})

test('webPreferences match the hardening checklist', () => {
  const prefs = hardeningWebPreferences('preload.js', false)
  expect(prefs).toMatchObject({
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    devTools: false
  })
  expect(prefs).not.toHaveProperty('enableRemoteModule')
  expect(hardeningWebPreferences('preload.js', true).devTools).toBe(true)
})

test('a packaged launch ignores the dev server URL', () => {
  expect(rendererTarget({ allowDevTools: false, devServerUrl: 'http://localhost:5173' })).toEqual({
    kind: 'file'
  })
  expect(rendererTarget({ allowDevTools: true, devServerUrl: 'http://localhost:5173' })).toEqual({
    kind: 'url',
    url: 'http://localhost:5173'
  })
})

test('the preload exposes only getVersion', () => {
  const source = readFileSync('src/preload/index.ts', 'utf8')
  const contract = readFileSync('src/shared/ipc-contract.ts', 'utf8')
  expect(source).toContain('APP_GET_VERSION')
  expect(source).toContain("exposeInMainWorld('ward', ward)")
  expect(contract).toContain(`export const APP_GET_VERSION = '${APP_GET_VERSION}'`)
  expect(source).not.toContain('electronAPI')
  expect(source).not.toContain("exposeInMainWorld('electron'")
  expect(source).not.toContain('exposeInMainWorld("electron"')
  expect(isAppSender(4, 4)).toBe(true)
  expect(isAppSender(4, null)).toBe(false)
  expect(emptyPayload(undefined)).toBe(true)
  expect(emptyPayload({})).toBe(false)
})
