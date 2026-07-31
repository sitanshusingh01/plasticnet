import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileVideo, ImageOff, MapPin } from 'lucide-react'
import PublicHeader from '../components/layout/PublicHeader.jsx'
import ZoneBadge from '../components/common/ZoneBadge.jsx'
import Loader from '../components/common/Loader.jsx'
import { getCitizenReports } from '../services/api.js'
import { formatRelativeTime, formatClockTime, formatShortDate } from '../utils/format.js'

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function exportCsv(reports) {
  const header = [
    'Report ID', 'Filename', 'Media Type', 'Description', 'Reported By', 'Status', 'Severity',
    'Latitude', 'Longitude', 'GPS Accuracy', 'Location Name', 'Timezone', 'Reported At'
  ].join(',')
  const rows = reports.map((report) =>
    [
      report.reportId,
      report.filename,
      report.mediaType,
      `"${(report.description || '').replace(/"/g, "'")}"`,
      report.submittedBy,
      report.reportStatus,
      report.severity,
      report.latitude,
      report.longitude,
      report.gpsAccuracy ?? '',
      `"${(report.locationName || '').replace(/"/g, "'")}"`,
      report.timezone,
      report.uploadedAt
    ].join(',')
  )
  downloadBlob([header, ...rows].join('\n'), 'community_reports.csv', 'text/csv')
}

function exportJson(reports) {
  downloadBlob(JSON.stringify(reports, null, 2), 'community_reports.json', 'application/json')
}

export default function CommunityReports() {
  const [reports, setReports] = useState(null)

  useEffect(() => {
    getCitizenReports().then(setReports)
  }, [])

  return (
    <div className="min-h-screen bg-surface-sunk dark:bg-night-bg">
      <PublicHeader active="/community-reports" />

      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-xl font-semibold text-ink dark:text-night-ink">Community reports</h1>
            <p className="mt-1.5 text-sm text-ink-muted dark:text-night-ink-muted">
              Every pollution report filed by residents and volunteers, most recent first
            </p>
          </div>
          <Link
            to="/report"
            className="shrink-0 rounded-sm bg-primary px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary-dark"
          >
            Report pollution
          </Link>
        </div>

        {reports && reports.length > 0 && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => exportCsv(reports)}
              className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-muted dark:border-night-border dark:text-night-ink-muted dark:hover:bg-night-muted"
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => exportJson(reports)}
              className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-muted dark:border-night-border dark:text-night-ink-muted dark:hover:bg-night-muted"
            >
              <Download size={13} /> Export JSON
            </button>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {!reports ? (
            <Loader label="Loading community reports" />
          ) : (
            reports.map((report) => (
              <div
                key={report.reportId}
                className="overflow-hidden rounded-md border border-border bg-surface shadow-card dark:border-night-border dark:bg-night-surface sm:flex"
              >
                <div className="flex h-40 w-full items-center justify-center bg-surface-muted dark:bg-night-muted sm:h-auto sm:w-44 sm:shrink-0">
                  {report.mediaPreviewUrl && report.mediaType === 'image' && (
                    <img src={report.mediaPreviewUrl} alt="Reported pollution" className="h-full w-full object-cover" />
                  )}
                  {report.mediaPreviewUrl && report.mediaType === 'video' && (
                    <video src={report.mediaPreviewUrl} className="h-full w-full object-cover" muted />
                  )}
                  {!report.mediaPreviewUrl && report.mediaType === 'video' && (
                    <div className="flex flex-col items-center gap-1.5 text-ink-faint dark:text-night-ink-faint">
                      <FileVideo size={22} />
                      <span className="text-xs">Video report</span>
                    </div>
                  )}
                  {!report.mediaPreviewUrl && report.mediaType !== 'video' && (
                    <div className="flex flex-col items-center gap-1.5 text-ink-faint dark:text-night-ink-faint">
                      <ImageOff size={22} />
                      <span className="text-xs">No preview on file</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="num text-sm font-medium text-ink dark:text-night-ink">{report.reportId}</span>
                    <div className="flex gap-1.5">
                      <ZoneBadge kind="risk" value={report.severity} />
                      <ZoneBadge kind="report" value={report.reportStatus} />
                    </div>
                  </div>

                  <p className="mt-2 text-sm text-ink-muted dark:text-night-ink-muted">{report.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-faint dark:text-night-ink-faint">
                    <span>
                      {formatShortDate(report.uploadedAt)}, {formatClockTime(report.uploadedAt)} ({report.timezone})
                    </span>
                    <span>{formatRelativeTime(report.uploadedAt)}</span>
                  </div>

                  <div className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-faint dark:text-night-ink-faint">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    <span>
                      {report.locationName || 'Location name unavailable'}
                      {typeof report.latitude === 'number' && (
                        <span className="num">
                          {' '}
                          &middot; {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                          {report.gpsAccuracy ? ` (±${report.gpsAccuracy}m)` : ''}
                        </span>
                      )}
                    </span>
                  </div>

                  {report.wasteCategorySummary?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {report.wasteCategorySummary.map((entry) => (
                        <span
                          key={entry.category}
                          className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted dark:bg-night-muted dark:text-night-ink-muted"
                        >
                          {entry.category} &middot; {entry.count}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="mt-3 text-xs text-ink-faint dark:text-night-ink-faint">Reported by {report.submittedBy}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
