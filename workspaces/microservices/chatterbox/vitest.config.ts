import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/assurance/tests/**/*.test.ts'],
    mockReset: true,
    passWithNoTests: false,
    restoreMocks: true
  }
})
