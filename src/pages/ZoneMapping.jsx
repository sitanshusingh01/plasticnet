import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { AlertTriangle, MapPin, RefreshCw, ShieldAlert, X } from 'lucide-react'
import PageHeader from '../components/common/PageHeader.jsx'
import Loader from '../components/common/Loader.jsx'
import { getZonesGeoJSON, getZoneDetail, overrideZoneRisk } from '../services/api.js'
import { formatRelativeTime } from '../utils/format.js'
import 'leaflet/dist/leaflet.css'

// Risk colour is decided entirely by the backend (Zone.current_risk).
// This lookup only renders whatever string comes back, it never computes
// a risk level itself.
const RISK_STYLE = {
  white: { fill: '#FFFFFF', label: 'No Reports' },
  yellow: { fill: '#F4D03F', label: 'Low Risk' },
  orange: { fill: '#E67E22', label: 'Moderate Risk' },
  red: { fill: '#C0392B', label: 'High Risk' }
}

const OVERRIDE_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' }
]

function zoneStyle(feature) {
  const risk = feature.properties.risk || 'white'
  const style = RISK_STYLE[risk] || RISK_STYLE.white
  return {
    fillColor: style.fill,
    fillOpacity: risk === 'white' ? 0.15 : 0.55,
    color: '#000000',
    weight: 1.5
  }
}

export default function ZoneMapping() {
  const [geojson, setGeojson] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loadVersion, setLoadVersion] = useState(0)

  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState('')

  const [overrideLevel, setOverrideLevel] = useState('low')
  const [officerName, setOfficerName] = useState('')
  const [reason, setReason] = useState('')
  const [overrideStatus, setOverrideStatus] = useState('idle')

  useEffect(() => {
    setGeojson(null)
    setLoadError('')
    getZonesGeoJSON()
      .then(setGeojson)
      .catch((error) => setLoadError(error.message))
  }, [loadVersion])

  function handleZoneClick(zoneId) {
    setSelectedZoneId(zoneId)
    setDetail(null)
    setDetailError('')
    setOverrideStatus('idle')
    setOfficerName('')
    setReason('')
    getZoneDetail(zoneId)
      .then((data) => setDetail(data.properties))
      .catch((error) => setDetailError(error.message))
  }

  function onEachFeature(feature, layer) {
    layer.on('click', () => handleZoneClick(feature.properties.zoneId))
  }

  async function handleOverrideSubmit(event) {
    event.preventDefault()
    if (!officerName.trim() || !reason.trim()) return
    setOverrideStatus('submitting')
    try {
      const updated = await overrideZoneRisk(selectedZoneId, {
        riskLevel: overrideLevel,
        officerName: officerName.trim(),
        reason: reason.trim()
      })
      setDetail((current) => ({ ...current, ...updated.properties }))
      setOverrideStatus('complete')
      setLoadVersion((v) => v + 1) // refresh the map layer so the new colour shows there too
    } catch (error) {
      setOverrideStatus('error')
      setDetailError(error.message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Zone Mapping"
        subtitle="Live monitoring zones across Dal Lake, coloured by backend-computed risk"
      />

      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-md border border-border bg-surface p-3 text-xs dark:border-night-border dark:bg-night-surface">
        {Object.entries(RISK_STYLE).map(([key, style]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm border border-ink/30"
              style={{ backgroundColor: style.fill }}
            />
            <span className="text-ink-muted dark:text-night-ink-muted">{style.label}</span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="overflow-hidden rounded-md border border-border dark:border-night-border xl:col-span-2">
          {loadError && (
            <div className="flex h-[560px] flex-col items-center justify-center gap-3 bg-surface-muted p-6 text-center dark:bg-night-muted">
              <AlertTriangle size={24} className="text-danger" />
              <p className="text-sm text-ink-muted dark:text-night-ink-muted">
                Could not load monitoring zones. {loadError}
              </p>
              <button
                type="button"
                onClick={() => setLoadVersion((v) => v + 1)}
                className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface dark:border-night-border dark:text-night-ink-muted"
              >
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          )}

          {!loadError && !geojson && (
            <div className="flex h-[560px] items-center justify-center bg-surface-muted dark:bg-night-muted">
              <Loader label="Loading zone boundaries, this can take a minute if the server was idle" />
            </div>
          )}

          {!loadError && geojson && (
            <MapContainer
              center={[geojson.features[0]?.properties.centroidLat || 34.12, geojson.features[0]?.properties.centroidLng || 74.87]}
              zoom={13}
              scrollWheelZoom
              style={{ height: '560px', width: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <GeoJSON
                key={`zones-${loadVersion}`}
                data={geojson}
                style={zoneStyle}
                onEachFeature={onEachFeature}
              />
            </MapContainer>
          )}
        </div>

        <div className="rounded-md border border-border bg-surface p-4 dark:border-night-border dark:bg-night-surface">
          {!selectedZoneId && (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-center">
              <MapPin size={22} className="text-ink-faint dark:text-night-ink-faint" />
              <p className="text-sm text-ink-faint dark:text-night-ink-faint">
                Click a zone on the map to see its details
              </p>
            </div>
          )}

          {selectedZoneId && (
            <div>
              <div className="flex items-center justify-between">
                <h3 className="num text-sm font-semibold text-ink dark:text-night-ink">{selectedZoneId}</h3>
                <button
                  type="button"
                  onClick={() => setSelectedZoneId(null)}
                  className="text-ink-faint hover:text-ink dark:text-night-ink-faint"
                >
                  <X size={16} />
                </button>
              </div>

              {detailError && <p className="mt-3 text-xs text-danger">{detailError}</p>}
              {!detail && !detailError && <Loader label="Loading zone detail" />}

              {detail && (
                <div className="mt-3 space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-ink dark:text-night-ink">{detail.name}</p>
                    <span
                      className="mt-1 inline-block rounded-full border border-ink/20 px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: RISK_STYLE[detail.risk]?.fill, color: detail.risk === 'white' ? '#1B2A22' : '#FFFFFF' }}
                    >
                      {RISK_STYLE[detail.risk]?.label || detail.risk}
                      {detail.riskSource === 'override' && ' (manual)'}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <dt className="text-ink-faint dark:text-night-ink-faint">Total reports</dt>
                    <dd className="text-right num text-ink dark:text-night-ink">{detail.totalReports}</dd>
                    <dt className="text-ink-faint dark:text-night-ink-faint">Pending</dt>
                    <dd className="text-right num text-ink dark:text-night-ink">{detail.pendingReports}</dd>
                    <dt className="text-ink-faint dark:text-night-ink-faint">Resolved</dt>
                    <dd className="text-right num text-ink dark:text-night-ink">{detail.resolvedReports}</dd>
                    <dt className="text-ink-faint dark:text-night-ink-faint">Avg. coverage</dt>
                    <dd className="text-right num text-ink dark:text-night-ink">{detail.averageCoverage}%</dd>
                    <dt className="text-ink-faint dark:text-night-ink-faint">Trend</dt>
                    <dd className="text-right text-ink dark:text-night-ink">{detail.trend?.replace('-', ' ') || 'n/a'}</dd>
                    <dt className="text-ink-faint dark:text-night-ink-faint">Last updated</dt>
                    <dd className="text-right text-ink dark:text-night-ink">{detail.lastUpdated ? formatRelativeTime(detail.lastUpdated) : 'never'}</dd>
                  </dl>

                  {detail.latestReport && (
                    <div className="rounded-sm bg-surface-muted p-2.5 text-xs dark:bg-night-muted">
                      <p className="font-medium text-ink dark:text-night-ink">Latest report</p>
                      <p className="mt-0.5 text-ink-muted dark:text-night-ink-muted">
                        {detail.latestReport.coveragePercent}% coverage, {detail.latestReport.severity}, {formatRelativeTime(detail.latestReport.submittedAt)}
                      </p>
                    </div>
                  )}

                  {detail.authorityRemarks && (
                    <div className="rounded-sm bg-surface-muted p-2.5 text-xs dark:bg-night-muted">
                      <p className="font-medium text-ink dark:text-night-ink">Authority remarks</p>
                      <p className="mt-0.5 text-ink-muted dark:text-night-ink-muted">{detail.authorityRemarks}</p>
                      {detail.overrideBy && <p className="mt-1 text-ink-faint dark:text-night-ink-faint">&mdash; {detail.overrideBy}</p>}
                    </div>
                  )}

                  <form onSubmit={handleOverrideSubmit} className="space-y-2 border-t border-border pt-3 dark:border-night-border">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-ink dark:text-night-ink">
                      <ShieldAlert size={13} /> Manual risk override
                    </p>
                    <select
                      value={overrideLevel}
                      onChange={(event) => setOverrideLevel(event.target.value)}
                      className="w-full rounded-sm border border-border bg-surface px-2 py-1.5 text-xs dark:border-night-border dark:bg-night-surface dark:text-night-ink"
                    >
                      {OVERRIDE_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>{level.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={officerName}
                      onChange={(event) => setOfficerName(event.target.value)}
                      placeholder="Officer name"
                      required
                      className="w-full rounded-sm border border-border bg-surface px-2 py-1.5 text-xs dark:border-night-border dark:bg-night-surface dark:text-night-ink"
                    />
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Reason for override"
                      rows={2}
                      required
                      className="w-full rounded-sm border border-border bg-surface px-2 py-1.5 text-xs dark:border-night-border dark:bg-night-surface dark:text-night-ink"
                    />
                    <button
                      type="submit"
                      disabled={overrideStatus === 'submitting'}
                      className="w-full rounded-sm bg-primary py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-60"
                    >
                      {overrideStatus === 'submitting' ? 'Saving' : 'Apply override'}
                    </button>
                    {overrideStatus === 'complete' && <p className="text-xs text-primary">Override applied.</p>}
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
