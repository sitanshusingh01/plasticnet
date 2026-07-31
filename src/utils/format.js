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

// Backend storage keys media by a generated name rather than whatever the
// user's device called it, avoids collisions and keeps a consistent,
// sortable pattern once files actually land in cloud storage.
export function buildReportFilename(reportId, mediaType, isoTimestamp) {
  const date = new Date(isoTimestamp)
  const pad = (value) => String(value).padStart(2, '0')
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  const extension = mediaType === 'video' ? 'mp4' : 'jpg'
  return `PLASTICNET_${stamp}_${reportId}.${extension}`
}
