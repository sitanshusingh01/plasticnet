import { useEffect, useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import PageHeader from '../components/common/PageHeader.jsx'
import DataTable from '../components/common/DataTable.jsx'
import ZoneBadge from '../components/common/ZoneBadge.jsx'
import Loader from '../components/common/Loader.jsx'
import { getRecentReports, getCitizenReports, exportReport } from '../services/api.js'
import { formatRelativeTime, formatClockTime, formatShortDate } from '../utils/format.js'

const REPORT_COLUMNS = [
  { key: 'id', header: 'Report ID' },
  { key: 'title', header: 'Title' },
  { key: 'format', header: 'Format' },
  { key: 'generatedOn', header: 'Generated', render: (row) => `${formatShortDate(row.generatedOn)}, ${formatClockTime(row.generatedOn)}` }
]

const CITIZEN_COLUMNS = [
  { key: 'id', header: 'Report ID' },
  { key: 'zone', header: 'Zone' },
  { key: 'description', header: 'Description' },
  { key: 'severity', header: 'Severity', render: (row) => <ZoneBadge kind="risk" value={row.severity} /> },
  { key: 'status', header: 'Status', render: (row) => <ZoneBadge kind="report" value={row.status} /> },
  { key: 'timestamp', header: 'Reported', render: (row) => formatRelativeTime(row.timestamp) }
]

export default function Reports() {
  const [reports, setReports] = useState(null)
  const [citizenReports, setCitizenReports] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    getRecentReports().then(setReports)
    getCitizenReports().then(setCitizenReports)
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    const result = await exportReport('pdf')
    setReports((current) => [
      {
        id: result.reportId,
        title: 'Dal Lake Zone Summary, generated on demand',
        generatedOn: result.generatedAt,
        format: 'PDF'
      },
      ...(current || [])
    ])
    setGenerating(false)
  }

  function handleExportCitizenReports() {
    if (!citizenReports) return
    const header = 'Report ID,Zone,Description,Severity,Status,Submitted By,Reported At'
    const rows = citizenReports.map((row) =>
      [row.id, row.zone, `"${row.description.replace(/"/g, "'")}"`, row.severity, row.status, row.submittedBy, row.timestamp].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'dal_lake_citizen_reports.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Reports and Export"
        subtitle="Generate summaries for the Municipal Corporation and review the citizen reporting queue"
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink dark:text-night-ink">Citizen Report Queue</h3>
            <p className="mt-0.5 text-xs text-ink-faint dark:text-night-ink-faint">
              Every report filed through the public portal, for verification and cleanup prioritisation
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCitizenReports}
            className="flex shrink-0 items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-muted dark:border-night-border dark:text-night-ink-muted dark:hover:bg-night-muted"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
        <div className="mt-4">
          {!citizenReports ? <Loader /> : <DataTable columns={CITIZEN_COLUMNS} rows={citizenReports} />}
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-faint dark:text-night-ink-faint">
        Bundled ZIP exports with source imagery are planned for Phase 2, once uploaded photos are
        stored on the backend rather than only in the browser session.
      </p>
    </div>
  )
}
