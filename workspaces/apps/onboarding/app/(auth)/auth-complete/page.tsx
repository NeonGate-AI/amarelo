import { redirect } from 'next/navigation'

export default function AuthCompletePage() {
  redirect(process.env.NEXT_PUBLIC_CONSOLE_URL ?? 'http://localhost:3001')
}
