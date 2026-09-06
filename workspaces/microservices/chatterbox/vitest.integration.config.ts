import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    include: ['src/assurance/tests/**/*.integration.test.ts'],
    passWithNoTests: false
  }
})
