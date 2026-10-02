import { defineConfig } from 'vitest/config'

export default defineConfig({
  server: { host: true, port: 5173 },
  test: {
    include: ['host/**/*.test.ts'],
    environment: 'node',
  },
})
