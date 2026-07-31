import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, FileVideo, ImageOff, Loader2, MapPin } from 'lucide-react'
import PageHeader from '../components/common/PageHeader.jsx'
import DataTable from '../components/common/DataTable.jsx'
import ZoneBadge from '../components/common/ZoneBadge.jsx'
import LocationMap from '../components/common/LocationMap.jsx'
import Loader from '../components/common/Loader.jsx'
import { getRecentReports, getCitizenReports, exportReport, updateReportStatus } from '../services/api.js'
import { REPORT_STATUSES } from '../data/mockData.js'
import { formatRelativeTime, formatClockTime, formatShortDate } from '../utils/format.js'

const REPORT_COLUMNS = [
  { key: 'id', header: 'Report ID' },
  { key: 'title', header: 'Title' },
  { key: 'format', header: 'Format' },
  { key: 'generatedOn', header: 'Generated', render: (row) => `${formatShortDate(row.generatedOn)}, ${formatClockTime(row.generatedOn)}` }
]

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function statusLabel(status) {
  return status
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

export default function Reports() {
  const [reports, setReports] = useState(null)
  const [citizenReports, setCitizenReports] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    getRecentReports().then(setReports)
    refreshCitizenReports()
  }, [])

  function refreshCitizenReports() {
    getCitizenReports().then((data) => {
      setCitizenReports(data)
    })
  }

  const filteredReports = useMemo(() => {
    if (!citizenReports) return null
    if (statusFilter === 'all') return citizenReports
    return citizenReports.filter((report) => report.reportStatus === statusFilter)
  }, [citizenReports, statusFilter])

  const selectedReport = citizenReports?.find((report) => report.reportId === selectedId) || null

  const CITIZEN_COLUMNS = useMemo(
    () => [
      { key: 'reportId', header: 'Report ID' },
      { key: 'description', header: 'Description' },
      { key: 'severity', header: 'Severity', render: (row) => <ZoneBadge kind="risk" value={row.severity} /> },
      { key: 'reportStatus', header: 'Status', render: (row) => <ZoneBadge kind="report" value={row.reportStatus} /> },
      { key: 'uploadedAt', header: 'Reported', render: (row) => formatRelativeTime(row.uploadedAt) }
    ],
    []
  )

  async function handleGenerate() {
    setGenerating(true)
    const result = await exportReport('pdf')
    setReports((current) => [
      {
        id: result.reportId,
        title: 'Zone Summary, generated on demand',
        generatedOn: result.generatedAt,
        format: 'PDF'
      },
      ...(current || [])
    ])
    setGenerating(false)
  }

  function exportCitizenCsv() {
    if (!filteredReports) return
    const header = 'Report ID,Filename,Media Type,Description,Severity,Status,Latitude,Longitude,Location Name,Timezone,Reported At'
    const rows = filteredReports.map((row) =>
      [
        row.reportId,
        row.filename,
        row.mediaType,
        `"${row.description.replace(/"/g, "'")}"`,
        row.severity,
        row.reportStatus,
        row.latitude,
        row.longitude,
        `"${(row.locationName || '').replace(/"/g, "'")}"`,
        row.timezone,
        row.uploadedAt
      ].join(',')
    )
    downloadBlob([header, ...rows].join('\n'), 'citizen_reports.csv', 'text/csv')
  }

  function exportCitizenJson() {
    if (!filteredReports) return
    downloadBlob(JSON.stringify(filteredReports, null, 2), 'citizen_reports.json', 'application/json')
  }

  async function handleStatusChange(newStatus) {
    if (!selectedReport) return
    setUpdatingStatus(true)
    await updateReportStatus(selectedReport.reportId, newStatus)
    refreshCitizenReports()
    setUpdatingStatus(false)
  }

  return (
    <div>
      <PageHeader
        title="Reports and Export"
        subtitle="Generate summaries and review the citizen reporting queue"
        actions={
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            {generating ? 'Generating' : 'Generate report'}
          </button>
        }
      />

      <div className="rounded-md border border-border bg-surface p-5 shadow-card dark:border-night-border dark:bg-night-surface">
        <h3 className="text-sm font-semibold text-ink dark:text-night-ink">Recent Reports</h3>
        <p className="mt-0.5 text-xs text-ink-faint dark:text-night-ink-faint">
          PDF summaries generated for the Pollution Control Board and Municipal Corporation Srinagar
        </p>
        <div className="mt-4">{!reports ? <Loader /> : <DataTable columns={REPORT_COLUMNS} rows={reports} />}</div>
      </div>

      <div className="mt-6 rounded-md border border-border bg-surface p-5 shadow-card dark:border-night-border dark:bg-night-surface">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink dark:text-night-ink">Citizen Report Queue</h3>
            <p className="mt-0.5 text-xs text-ink-faint dark:text-night-ink-faint">
              Click a report to review media, location and update its status
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-xs text-ink dark:border-night-border dark:bg-night-surface dark:text-night-ink"
            >
              <option value="all">All statuses</option>
              {REPORT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportCitizenCsv}
              className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-muted dark:border-night-border dark:text-night-ink-muted dark:hover:bg-night-muted"
            >
              <Download size={13} /> CSV
            </button>
            <button
              type="button"
              onClick={exportCitizenJson}
              className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-muted dark:border-night-border dark:text-night-ink-muted dark:hover:bg-night-muted"
            >
              <Download size={13} /> JSON
            </button>
          </div>
        </div>
        <div className="mt-4">
          {!filteredReports ? (
            <Loader />
          ) : (
            <DataTable
              columns={CITIZEN_COLUMNS}
              rows={filteredReports}
              keyField="reportId"
              onRowClick={(row) => setSelectedId(row.reportId)}
              activeRowKey={selectedId}
            />
          )}
        </div>
      </div>

      {selectedReport && (
        <div className="mt-6 rounded-md border border-border bg-surface p-5 shadow-card dark:border-night-border dark:bg-night-surface">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="num text-sm font-semibold text-ink dark:text-night-ink">{selectedReport.reportId}</h3>
            <div className="flex items-center gap-2">
              <select
                value={selectedReport.reportStatus}
                onChange={(event) => handleStatusChange(event.target.value)}
                disabled={updatingStatus}
                className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-xs text-ink dark:border-night-border dark:bg-night-surface dark:text-night-ink"
              >
                {REPORT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleStatusChange('resolved')}
                disabled={updatingStatus || selectedReport.reportStatus === 'resolved'}
                className="rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-50"
              >
                Mark resolved
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="flex h-48 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-muted dark:border-night-border dark:bg-night-muted">
                {selectedReport.mediaPreviewUrl && selectedReport.mediaType === 'image' && (
                  <img src={selectedReport.mediaPreviewUrl} alt="Report media" className="h-full w-full object-cover" />
                )}
                {selectedReport.mediaPreviewUrl && selectedReport.mediaType === 'video' && (
                  <video src={selectedReport.mediaPreviewUrl} controls className="h-full w-full object-contain bg-black" />
                )}
                {!selectedReport.mediaPreviewUrl && (
                  <div className="flex flex-col items-center gap-1.5 text-ink-faint dark:text-night-ink-faint">
                    {selectedReport.mediaType === 'video' ? <FileVideo size={22} /> : <ImageOff size={22} />}
                    <span className="text-xs">No media on file for this session</span>
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm text-ink-muted dark:text-night-ink-muted">{selectedReport.description}</p>
              <dl className="mt-3 space-y-1 text-xs text-ink-faint dark:text-night-ink-faint">
                <div className="flex justify-between"><dt>Filename</dt><dd className="num">{selectedReport.filename}</dd></div>
                <div className="flex justify-between"><dt>Uploaded</dt><dd>{formatShortDate(selectedReport.uploadedAt)}, {formatClockTime(selectedReport.uploadedAt)}</dd></div>
                <div className="flex justify-between"><dt>Timezone</dt><dd>{selectedReport.timezone}</dd></div>
                <div className="flex justify-between"><dt>GPS accuracy</dt><dd>{selectedReport.gpsAccuracy ? `±${selectedReport.gpsAccuracy}m` : 'Not captured'}</dd></div>
                <div className="flex justify-between"><dt>Reported by</dt><dd>{selectedReport.submittedBy}</dd></div>
              </dl>
            </div>

            <div>
              {typeof selectedReport.latitude === 'number' && (
                <LocationMap latitude={selectedReport.latitude} longitude={selectedReport.longitude} interactive={false} height={200} />
              )}
              <div className="mt-2 flex items-start gap-1.5 text-xs text-ink-muted dark:text-night-ink-muted">
                <MapPin size={13} className="mt-0.5 shrink-0" />
                <span className="num">
                  {selectedReport.locationName || 'Location name unavailable'}
                  {typeof selectedReport.latitude === 'number' && ` · ${selectedReport.latitude.toFixed(5)}, ${selectedReport.longitude.toFixed(5)}`}
                </span>
              </div>
              {selectedReport.wasteCategorySummary?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedReport.wasteCategorySummary.map((entry) => (
                    <span key={entry.category} className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted dark:bg-night-muted dark:text-night-ink-muted">
                      {entry.category} &middot; {entry.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-ink-faint dark:text-night-ink-faint">
        Bundled ZIP exports with source media are planned for Phase 2, once uploaded files are stored
        on the backend rather than only in the browser session.
      </p>
    </div>
  )
}
