import {
  createProviderChatterbox,
  validateChatterboxEnvironment
} from 'chatterbox'
import { expect, test } from 'vitest'

test('Memory is opt-in and enabled configuration fails closed without database credentials', async () => {
  const app = createProviderChatterbox(validateChatterboxEnvironment({}))
  try {
    expect((await app.inject({ method: 'GET', url: '/ready' })).json()).toEqual(
      { status: 'ready', memory: 'disabled' }
    )
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/development/memory',
          payload: {}
        })
      ).statusCode
    ).toBe(404)
  } finally {
    await app.close()
  }
  expect(() =>
    validateChatterboxEnvironment({ CHATTERBOX_MEMORY_ENABLED: 'true' })
  ).toThrow()
  expect(() =>
    validateChatterboxEnvironment({ CHATTERBOX_MEMORY_ENABLED: 'maybe' })
  ).toThrow()
  expect(() =>
    validateChatterboxEnvironment({
      CHATTERBOX_MEMORY_ENABLED: 'true',
      MEMORY_NEO4J_URI: 'bolt://localhost:7687',
      MEMORY_NEO4J_USERNAME: 'neo4j',
      MEMORY_NEO4J_PASSWORD: 'synthetic-password',
      MEMORY_NEO4J_DATABASE: 'neo4j'
    })
  ).not.toThrow()
})
