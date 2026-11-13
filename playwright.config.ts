import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: 'list'
})
