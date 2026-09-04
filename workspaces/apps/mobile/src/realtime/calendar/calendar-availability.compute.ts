export interface CalendarAvailability {
  readonly available: boolean
  readonly date: string
  readonly time: string
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/u

function isValidIsoDate(date: string): boolean {
  if (!ISO_DATE_PATTERN.test(date)) return false

  const parsed = new Date(`${date}T00:00:00.000Z`)
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  )
}

export function checkCalendarAvailability(
  date: string,
  time: string
): CalendarAvailability {
  if (!isValidIsoDate(date) || !TIME_PATTERN.test(time)) {
    return { available: false, date, time }
  }

  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay()
  const hour = Number(time.slice(0, 2))
  const weekday = day >= 1 && day <= 5
  const workingHour = hour >= 9 && hour < 17 && hour !== 12

  return {
    available: weekday && workingHour,
    date,
    time
  }
}
