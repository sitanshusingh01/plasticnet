import { REFERENCE_DATE } from '../data/mockData'

const timeFormatter = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' })
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

export function formatRelativeTime(isoString) {
  const then = new Date(isoString)
  const now = new Date(REFERENCE_DATE)
  const diffMinutes = Math.round((now - then) / 60000)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`

  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

export function formatClockTime(isoString) {
  return timeFormatter.format(new Date(isoString))
}

export function formatShortDate(isoString) {
  return dateFormatter.format(new Date(isoString))
}
