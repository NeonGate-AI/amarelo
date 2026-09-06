import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { checkCalendarAvailability } from '@/realtime/calendar'

function evaluateSyntheticCalendar() {
  assert.deepEqual(checkCalendarAvailability('2026-09-04', '10:00'), {
    available: true,
    date: '2026-09-04',
    time: '10:00'
  })
  assert.equal(
    checkCalendarAvailability('2026-09-04', '12:30').available,
    false
  )
  assert.equal(
    checkCalendarAvailability('2026-09-04', '17:00').available,
    false
  )
  assert.equal(
    checkCalendarAvailability('2026-09-05', '10:00').available,
    false
  )
  assert.equal(
    checkCalendarAvailability('2026-02-30', '10:00').available,
    false
  )
  assert.equal(
    checkCalendarAvailability('2026-09-04', '25:00').available,
    false
  )
}

async function evaluateRealtimeSourceBoundary() {
  const root = process.cwd()
  const hook = await readFile(
    path.join(root, 'src/realtime/session/realtime-voice.hook.ts'),
    'utf8'
  )
  const view = await readFile(
    path.join(root, 'src/realtime/realtime-voice.view.tsx'),
    'utf8'
  )
  const client = await readFile(
    path.join(root, 'src/realtime/session/realtime-session.client.ts'),
    'utf8'
  )
  const app = await readFile(path.join(root, 'src/app.tsx'), 'utf8')

  assert.equal(hook.includes('new RTCPeerConnection()'), true)
  assert.equal(hook.includes("createDataChannel('oai-events')"), true)
  assert.equal(hook.includes('getUserMedia'), true)
  // Session instructions and tools belong to the server-owned voice binding.
  assert.equal(hook.includes("type: 'session.update'"), false)
  assert.equal(hook.includes("type: 'function_call_output'"), false)
  assert.equal(hook.includes("type: 'response.create'"), false)
  assert.equal(hook.includes("type: 'output_audio_buffer.clear'"), true)
  assert.equal(client.includes("'/api/v1/realtime/session'"), true)
  assert.equal(client.includes("'x-conversation-id': conversationId"), true)
  assert.equal(client.includes("credentials: 'same-origin'"), true)
  assert.equal(client.includes("cache: 'no-store'"), true)
  assert.equal(hook.includes("document.createElement('audio')"), true)
  assert.equal(hook.includes('audio.autoplay = true'), true)
  assert.equal(view.includes('aria-live="polite"'), true)
  assert.equal(app.includes("VITE_AMARELO_REALTIME_VOICE === 'true'"), true)

  for (const source of [hook, view, client]) {
    assert.equal(
      /localStorage|sessionStorage|CacheStorage|caches\./u.test(source),
      false
    )
    assert.equal(source.includes('OPENAI_API_KEY'), false)
  }
}

evaluateSyntheticCalendar()
await evaluateRealtimeSourceBoundary()
console.log('Realtime voice eval PASS')
