import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PublicHeader from '../components/layout/PublicHeader.jsx'
import DataTable from '../components/common/DataTable.jsx'
import ZoneBadge from '../components/common/ZoneBadge.jsx'
import Loader from '../components/common/Loader.jsx'
import { getCitizenReports } from '../services/api.js'
import { formatRelativeTime } from '../utils/format.js'

const COLUMNS = [
  { key: 'zone', header: 'Zone' },
  { key: 'description', header: 'What was reported' },
  { key: 'submittedBy', header: 'Reported by' },
  { key: 'status', header: 'Status', render: (row) => <ZoneBadge kind="report" value={row.status} /> },
  { key: 'timestamp', header: 'When', render: (row) => formatRelativeTime(row.timestamp) }
]

export default function CommunityReports() {
  const [reports, setReports] = useState(null)

  useEffect(() => {
    getCitizenReports().then(setReports)
  }, [])

  return (
    <div className="min-h-screen bg-surface-sunk dark:bg-night-bg">
      <PublicHeader active="/community-reports" />

      <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-xl font-semibold text-ink dark:text-night-ink">Community reports</h1>
            <p className="mt-1.5 text-sm text-ink-muted dark:text-night-ink-muted">
              Every pollution report filed by residents and volunteers across Dal Lake, most recent first
            </p>
          </div>
          <Link
            to="/report"
            className="shrink-0 rounded-sm bg-primary px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary-dark"
          >
            Report pollution
          </Link>
        </div>

        <div className="mt-6">
          {!reports ? <Loader label="Loading community reports" /> : <DataTable columns={COLUMNS} rows={reports} />}
        </div>
      </div>
    </div>
  )
}
