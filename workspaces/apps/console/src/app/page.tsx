import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'

import { DashboardView } from '@dashboard/views/dashboard'

export default function HomePage() {
  return (
    <>
      <DashboardView />
      <SpeedInsights />
      <Analytics />
    </>
  )
}
