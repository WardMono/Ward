type AppVersion = { version: string }
type VersionResult =
  { ok: true; data: AppVersion } | { ok: false; error: { code: string; message: string } }

declare global {
  interface Window {
    ward: {
      getVersion: () => Promise<VersionResult>
    }
  }
}

export {}
