import { createOpenAI } from '@ai-sdk/openai'
import { generateSpeech } from 'ai'
import { NextResponse } from 'next/server'

const MAXIMUM_TEXT_LENGTH = 800
const DEFAULT_MODEL = 'gpt-4o-mini-tts'
const DEFAULT_VOICE = 'coral'

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { fallback: 'browser' },
      {
        headers: { 'x-voice-source': 'browser-fallback' },
        status: 200
      }
    )
  }

  const body = await readBody(request)

  if (!body) {
    return NextResponse.json(
      { error: 'Texto de voz inválido.' },
      { status: 400 }
    )
  }

  try {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const result = await generateSpeech({
      instructions:
        'Fale em português brasileiro, com voz acolhedora, calma e natural. Faça pausas curtas e nunca soe clínica ou infantilizada.',
      model: openai.speech(process.env.AI_VOICE_MODEL || DEFAULT_MODEL),
      outputFormat: 'mp3',
      text: body.text,
      voice: process.env.AI_VOICE_NAME || DEFAULT_VOICE
    })

    return new NextResponse(new Uint8Array(result.audio.uint8Array), {
      headers: {
        'cache-control': 'private, no-store',
        'content-type': 'audio/mpeg',
        'x-voice-source': 'ai'
      }
    })
  } catch {
    return NextResponse.json(
      { fallback: 'browser' },
      {
        headers: { 'x-voice-source': 'browser-fallback' },
        status: 200
      }
    )
  }
}

async function readBody(request: Request): Promise<{ text: string } | null> {
  try {
    const body = (await request.json()) as { text?: unknown }
    const text = typeof body.text === 'string' ? body.text.trim() : ''

    if (!text || text.length > MAXIMUM_TEXT_LENGTH) {
      return null
    }

    return { text }
  } catch {
    return null
  }
}
