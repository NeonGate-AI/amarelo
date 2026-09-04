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
  const app = await readFile(path.join(root, 'src/app.tsx'), 'utf8')

  assert.equal(hook.includes('new RTCPeerConnection()'), true)
  assert.equal(hook.includes("createDataChannel('oai-events')"), true)
  assert.equal(hook.includes('getUserMedia'), true)
  assert.equal(hook.includes("type: 'session.update'"), true)
  assert.equal(hook.includes("type: 'function_call_output'"), true)
  assert.equal(hook.includes("type: 'response.create'"), true)
  assert.equal(hook.includes("'/api/v1/realtime/session'"), true)
  assert.equal(hook.includes("document.createElement('audio')"), true)
  assert.equal(hook.includes('audioElement.autoplay = true'), true)
  assert.equal(view.includes('aria-live="polite"'), true)
  assert.equal(app.includes("VITE_AMARELO_REALTIME_VOICE === 'true'"), true)

  for (const source of [hook, view]) {
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
