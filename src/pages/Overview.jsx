import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Boxes, Droplets, Gauge, HeartPulse, MapPin, Radio, ScanLine, TriangleAlert } from 'lucide-react'
import PageHeader from '../components/common/PageHeader.jsx'
import StatCard from '../components/common/StatCard.jsx'
import ChartCard from '../components/common/ChartCard.jsx'
import ZoneBadge from '../components/common/ZoneBadge.jsx'
import DataTable from '../components/common/DataTable.jsx'
import Loader from '../components/common/Loader.jsx'
import {
  getDashboardStats,
  getDetectionTrend,
  getWeeklyCollection,
  getCategoryDistribution,
  getCoverageTrend,
  getPollutionIndexTrend,
  getMonitoringZones,
  getLiveAlerts,
  getCitizenReports
} from '../services/api.js'
import { formatRelativeTime, formatClockTime } from '../utils/format.js'

const ICONS = {
  'total-objects': Boxes,
  coverage: Droplets,
  'polluted-area': MapPin,
  density: Gauge,
  'risk-level': TriangleAlert,
  'today-detections': ScanLine,
  ehi: HeartPulse,
  'active-zones': Radio
}

const TONES = {
  'risk-level': 'warning'
}

const ALERT_TONE = {
  detection: 'bg-lake-light text-lake-dark',
  warning: 'bg-warning-light text-warning-dark',
  camera: 'bg-danger-light text-danger',
  upload: 'bg-primary-light text-primary',
  processing: 'bg-surface-muted dark:bg-night-muted text-ink-muted dark:text-night-ink-muted'
}

const CITIZEN_REPORT_COLUMNS = [
  { key: 'reportId', header: 'Report ID' },
  { key: 'zone', header: 'Zone' },
  { key: 'description', header: 'Description' },
  { key: 'submittedBy', header: 'Submitted By' },
  { key: 'reportStatus', header: 'Status', render: (row) => <ZoneBadge kind="report" value={row.reportStatus} /> },
  { key: 'uploadedAt', header: 'Reported', render: (row) => formatRelativeTime(row.uploadedAt) }
]

export default function Overview() {
  const [metrics, setMetrics] = useState(null)
  const [trend, setTrend] = useState(null)
  const [collection, setCollection] = useState(null)
  const [categories, setCategories] = useState(null)
  const [coverage, setCoverage] = useState(null)
  const [pollutionIndex, setPollutionIndex] = useState(null)
  const [zones, setZones] = useState(null)
  const [alerts, setAlerts] = useState(null)
  const [citizenReports, setCitizenReports] = useState(null)

  useEffect(() => {
    getDashboardStats().then(setMetrics)
    getDetectionTrend().then(setTrend)
    getWeeklyCollection().then(setCollection)
    getCategoryDistribution().then(setCategories)
    getCoverageTrend().then(setCoverage)
    getPollutionIndexTrend().then(setPollutionIndex)
    getMonitoringZones().then(setZones)
    getLiveAlerts().then(setAlerts)
    getCitizenReports().then(setCitizenReports)
  }, [])

  return (
    <div>
      <PageHeader
        title="Dashboard Overview"
        subtitle="Live status across Dal Lake's six monitoring zones, updated every scan cycle"
      />

      {!metrics ? (
        <Loader label="Loading zone metrics" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <StatCard key={metric.id} icon={ICONS[metric.id]} tone={TONES[metric.id] || 'neutral'} {...metric} />
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard title="Daily Detection Trend" subtitle="Objects logged per day across Dal Lake, last 14 days" className="xl:col-span-2">
          {!trend ? (
            <Loader />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ left: -20, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="detectionFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E8449" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#1E8449" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#DDE2D6" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8A968D' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8A968D' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#DDE2D6' }} />
                <Area type="monotone" dataKey="detections" stroke="#1E8449" strokeWidth={2} fill="url(#detectionFill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Waste Category Distribution" subtitle="Share of objects classified across our 6 dataset classes">
          {!categories ? (
            <Loader />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categories} dataKey="count" nameKey="category" innerRadius={52} outerRadius={78} paddingAngle={2}>
                    {categories.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#DDE2D6' }} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {categories.map((entry) => (
                  <li key={entry.category} className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-night-ink-muted">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.category}
                    <span className="ml-auto num text-ink-faint dark:text-night-ink-faint">{entry.share}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Weekly Plastic Collection" subtitle="Kilograms recovered from Dal Lake by field teams">
          {!collection ? (
            <Loader />
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={collection} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} stroke="#DDE2D6" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#8A968D' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8A968D' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#DDE2D6' }} />
                <Bar dataKey="kilograms" fill="#2E86C1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Coverage Trend" subtitle="Plastic surface coverage across Dal Lake, six month view">
          {!coverage ? (
            <Loader />
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={coverage} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} stroke="#DDE2D6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8A968D' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8A968D' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#DDE2D6' }} />
                <Line type="monotone" dataKey="coverage" stroke="#F4D03F" strokeWidth={2.4} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Dal Lake Pollution Index" subtitle="Composite severity score, higher means more waste observed">
          {!pollutionIndex ? (
            <Loader />
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={pollutionIndex} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} stroke="#DDE2D6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8A968D' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8A968D' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#DDE2D6' }} />
                <Line type="monotone" dataKey="index" stroke="#C0392B" strokeWidth={2.4} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-md border border-border dark:border-night-border bg-surface dark:bg-night-surface p-5 shadow-card xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink dark:text-night-ink">Dal Lake Monitoring Zones</h3>
              <p className="mt-0.5 text-xs text-ink-faint dark:text-night-ink-faint">Northern Shore, Central Dal and four other zones inside the lake</p>
            </div>
          </div>

          {!zones ? (
            <Loader />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {zones.map((zone) => (
                <div key={zone.id} className="rounded-sm border border-border dark:border-night-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink dark:text-night-ink">{zone.name}</p>
                      <p className="text-xs text-ink-faint dark:text-night-ink-faint">{zone.zoneCode}</p>
                    </div>
                    <ZoneBadge kind="risk" value={zone.risk} />
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="num text-lg font-semibold text-ink dark:text-night-ink">{zone.plasticShare}%</p>
                      <p className="text-xs text-ink-faint dark:text-night-ink-faint">Plastic coverage</p>
                    </div>
                    <div className="text-right">
                      <ZoneBadge kind="status" value={zone.status} />
                      <p className="mt-1.5 text-xs text-ink-faint dark:text-night-ink-faint">Scanned {formatRelativeTime(zone.lastScan)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-border dark:border-night-border bg-surface dark:bg-night-surface p-5 shadow-card">
          <h3 className="text-sm font-semibold text-ink dark:text-night-ink">Live Alerts</h3>
          <p className="mt-0.5 text-xs text-ink-faint dark:text-night-ink-faint">Latest activity across all Dal Lake zones</p>

          {!alerts ? (
            <Loader />
          ) : (
            <ul className="scroll-thin mt-4 max-h-[420px] space-y-3 overflow-y-auto">
              {alerts.map((alert) => (
                <li key={alert.id} className="flex gap-3">
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${ALERT_TONE[alert.type]?.split(' ')[0] || 'bg-surface-muted dark:bg-night-muted'}`} />
                  <div>
                    <p className="text-sm leading-snug text-ink dark:text-night-ink">{alert.message}</p>
                    <p className="mt-0.5 text-xs text-ink-faint dark:text-night-ink-faint">
                      {alert.zone} &middot; {formatClockTime(alert.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-md border border-border dark:border-night-border bg-surface dark:bg-night-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink dark:text-night-ink">Recent Citizen Reports</h3>
            <p className="mt-0.5 text-xs text-ink-faint dark:text-night-ink-faint">
              Submitted through the public citizen reporting portal
            </p>
          </div>
          <Link to="/reports" className="text-xs font-medium text-primary hover:underline">
            View full queue
          </Link>
        </div>
        <div className="mt-4">
          {!citizenReports ? <Loader /> : <DataTable columns={CITIZEN_REPORT_COLUMNS} rows={citizenReports} keyField="reportId" />}
        </div>
      </div>
    </div>
  )
}
