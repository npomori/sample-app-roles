import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    globalSetup: ['./src/test/integration-global-setup.ts'],
    setupFiles: ['./src/test/integration-setup.ts'],
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000
  }
})
