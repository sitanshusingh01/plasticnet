import axios from 'axios'
import {
  kpiMetrics,
  dailyDetectionTrend,
  weeklyCollection,
  categoryDistribution,
  coverageTrend,
  pollutionIndexTrend,
  monitoringZones,
  liveAlerts,
  detectionRecords,
  classificationSummary,
  recentReports,
  citizenReports,
  currentUser
} from '../data/mockData'
import { buildReportFilename } from '../utils/format.js'

// Segmentation is live: runSegmentation() below always calls the deployed
// FastAPI backend on Render and never returns mock data. The rest of the
// dashboard (analytics, alerts, reports, auth, detection) still has no
// backend endpoints, so those functions keep serving the same sample data
// they always have, gated by USE_MOCK_DASHBOARD, until those endpoints
// exist. Nothing outside this file should ever import mockData directly.
const USE_MOCK_DASHBOARD = true

// Base URL for the inference API. VITE_API_BASE_URL is read at build time
// (see .env.example); the deployed Render service is the fallback so a
// build without the env var still points at the real backend.
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'https://plasticnet-backend.onrender.com/api'
).replace(/\/+$/, '')

// The backend returns maskUrl/overlayUrl as paths relative to its own
// origin (e.g. /outputs/JOB-xxxx_mask.png). This strips the trailing /api
// so those paths can be turned into absolute URLs the browser can load
// from the GitHub Pages origin.
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '')

// 120s timeout: a Render free-instance cold start has to spin up the
// container, load the model and run a warmup pass before the first
// request is served, which can take well over a minute. A short timeout
// here would turn every cold start into a spurious failure.
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000
})

function delay(data, ms = 380) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

// citizenReports from mockData is treated as seed data, a fresh copy lives
// here so submitted reports and status changes are visible immediately
// across the app for the rest of the browser session. This resets on
// reload, which is expected, there's no database behind it yet.
let citizenReportStore = [...citizenReports]

let reportSequence = citizenReportStore.length

export async function login(email, password) {
  if (USE_MOCK_DASHBOARD) {
    return delay({
      token: 'mock-token-8f2c',
      user: { ...currentUser, email }
    }, 600)
  }
  // POST /auth/login
  const { data } = await client.post('/auth/login', { email, password })
  return data
}

export async function getDashboardStats() {
  if (USE_MOCK_DASHBOARD) return delay(kpiMetrics)
  // GET /dashboard/stats
  const { data } = await client.get('/dashboard/stats')
  return data
}

export async function getDetectionTrend() {
  if (USE_MOCK_DASHBOARD) return delay(dailyDetectionTrend)
  // GET /dashboard/detection-trend?range=14d
  const { data } = await client.get('/dashboard/detection-trend')
  return data
}

export async function getWeeklyCollection() {
  if (USE_MOCK_DASHBOARD) return delay(weeklyCollection)
  // GET /dashboard/weekly-collection
  const { data } = await client.get('/dashboard/weekly-collection')
  return data
}

export async function getCategoryDistribution() {
  if (USE_MOCK_DASHBOARD) return delay(categoryDistribution)
  // GET /classification/category-distribution
  const { data } = await client.get('/classification/category-distribution')
  return data
}

export async function getCoverageTrend() {
  if (USE_MOCK_DASHBOARD) return delay(coverageTrend)
  // GET /dashboard/coverage-trend
  const { data } = await client.get('/dashboard/coverage-trend')
  return data
}

export async function getPollutionIndexTrend() {
  if (USE_MOCK_DASHBOARD) return delay(pollutionIndexTrend)
  // GET /dashboard/pollution-index-trend
  const { data } = await client.get('/dashboard/pollution-index-trend')
  return data
}

export async function getMonitoringZones() {
  if (USE_MOCK_DASHBOARD) return delay(monitoringZones)
  // GET /zones
  const { data } = await client.get('/zones')
  return data
}

export async function getLiveAlerts() {
  if (USE_MOCK_DASHBOARD) return delay(liveAlerts, 250)
  // GET /alerts?limit=10
  const { data } = await client.get('/alerts')
  return data
}

export async function getDetectionRecords() {
  if (USE_MOCK_DASHBOARD) return delay(detectionRecords)
  // GET /detections?zone=&type=&page=
  const { data } = await client.get('/detections')
  return data
}

export async function getClassificationSummary() {
  if (USE_MOCK_DASHBOARD) return delay(classificationSummary)
  // GET /classification/summary
  const { data } = await client.get('/classification/summary')
  return data
}

export async function getRecentReports() {
  if (USE_MOCK_DASHBOARD) return delay(recentReports, 300)
  // GET /reports/recent
  const { data } = await client.get('/reports/recent')
  return data
}

export async function getCitizenReports() {
  if (USE_MOCK_DASHBOARD) return delay([...citizenReportStore].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)), 300)
  // GET /citizen-reports
  const { data } = await client.get('/citizen-reports')
  return data
}

// Builds the full report record client side today. Once report persistence
// exists on the backend, the server assigns reportId and filename instead
// and this becomes a straightforward POST with the media file attached.
export async function submitCitizenReport(report) {
  if (USE_MOCK_DASHBOARD) {
    reportSequence += 1
    const reportId = `CR-${500 + reportSequence}`
    const uploadedAt = new Date().toISOString()
    const record = {
      reportId,
      filename: buildReportFilename(reportId, report.mediaType, uploadedAt),
      reportStatus: 'submitted',
      uploadedAt,
      ...report
    }
    citizenReportStore = [record, ...citizenReportStore]
    return delay(record, 500)
  }
  // POST /citizen-reports (multipart, media file plus the fields below)
  const { data } = await client.post('/citizen-reports', report)
  return data
}

// Authority side status update. Community Reports and the authority queue
// both read from the same store, so a resolved report shows up as
// resolved everywhere on the very next fetch, no separate sync step.
export async function updateReportStatus(reportId, reportStatus) {
  if (USE_MOCK_DASHBOARD) {
    citizenReportStore = citizenReportStore.map((report) =>
      report.reportId === reportId ? { ...report, reportStatus } : report
    )
    return delay(citizenReportStore.find((report) => report.reportId === reportId), 300)
  }
  // PATCH /citizen-reports/:id
  const { data } = await client.patch(`/citizen-reports/${reportId}`, { reportStatus })
  return data
}

// Nominatim is a free OpenStreetMap service, this call is real and has
// nothing to do with our own backend. If it fails or is rate limited, the
// caller falls back to showing raw coordinates.
export async function reverseGeocode(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=14`
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('Reverse geocoding failed')
  const data = await response.json()
  const address = data.address || {}
  const parts = [
    address.suburb || address.neighbourhood || address.locality,
    address.city || address.town || address.village,
    address.state
  ].filter(Boolean)
  return {
    label: parts.length ? parts.join(', ') : data.display_name || 'Unknown location',
    address
  }
}

// ---------------------------------------------------------------------------
// Real segmentation, no mock path below this line.
// ---------------------------------------------------------------------------

// True for the failure modes a sleeping Render instance produces: no
// response at all (connection refused / dropped while the container spins
// up), a gateway error from Render's proxy while the service is starting
// (502/503/504), or our own timeout expiring during the cold start.
function isColdStartError(error) {
  if (!error) return false
  if (error.code === 'ECONNABORTED') return true
  if (!error.response) return true
  return [502, 503, 504].includes(error.response.status)
}

// Normalises any axios failure into an Error whose message is safe and
// useful to show directly in the UI. Backend error bodies are
// {"detail": "human readable message"} (FastAPI HTTPException), which is
// written to be user-facing, so it's preferred whenever present.
function toApiError(error) {
  if (error.response) {
    const status = error.response.status
    const rawDetail = error.response.data?.detail
    // FastAPI HTTPException carries a string detail; FastAPI validation
    // errors (422) carry an array of {loc, msg, type} objects instead.
    let detail = null
    if (typeof rawDetail === 'string') {
      detail = rawDetail
    } else if (Array.isArray(rawDetail) && rawDetail.length) {
      detail = rawDetail
        .map((item) => (typeof item?.msg === 'string' ? item.msg : null))
        .filter(Boolean)
        .join('; ') || null
    }
    const fallbackByStatus = {
      400: 'The uploaded file could not be processed. Use a JPG, PNG or WEBP image.',
      404: 'The segmentation endpoint was not found on the backend. The backend deployment may be out of date.',
      413: 'The image is too large for the backend to accept. Upload a smaller image.',
      422: 'The upload was not accepted by the backend. Choose an image file and try again.',
      429: 'Too many requests in a short time. Wait a moment and try again.',
      500: 'The AI backend hit an unexpected error processing this image. Try again or use a different image.',
      503: 'The AI backend is temporarily unavailable. Try again in a minute.'
    }
    const apiError = new Error(detail || fallbackByStatus[status] || `The AI backend returned an error (HTTP ${status}).`)
    apiError.status = status
    return apiError
  }
  if (error.code === 'ECONNABORTED') {
    return new Error('The AI backend took too long to respond. It may be waking up from sleep, try again in a minute.')
  }
  return new Error('Could not reach the AI backend. Check your connection, or the server may be waking up, try again shortly.')
}

// Backend mask/overlay URLs are relative to the backend origin; make them
// absolute so <img> tags on the GitHub Pages origin can load them.
function toAbsoluteOutputUrl(path) {
  if (!path) return null
  return /^https?:\/\//.test(path) ? path : `${API_ORIGIN}${path}`
}

// Runs one real segmentation prediction on the deployed backend.
// POST {API_BASE_URL}/segmentation/run, multipart field name "file".
// Retries exactly once if the first attempt fails in a way consistent
// with a Render cold start; onRetry (optional) is called before the
// retry so the UI can tell the user the backend is waking up.
export async function runSegmentation(file, { onRetry } = {}) {
  const send = () => {
    const form = new FormData()
    form.append('file', file)
    // No manual Content-Type header: axios sets multipart/form-data with
    // the correct boundary automatically for FormData bodies.
    return client.post('/segmentation/run', form)
  }

  let data
  try {
    ({ data } = await send())
  } catch (firstError) {
    if (!isColdStartError(firstError)) {
      throw toApiError(firstError)
    }
    if (onRetry) onRetry()
    try {
      ({ data } = await send())
    } catch (secondError) {
      throw toApiError(secondError)
    }
  }

  return {
    ...data,
    maskUrl: toAbsoluteOutputUrl(data.maskUrl),
    overlayUrl: toAbsoluteOutputUrl(data.overlayUrl),
    heatmapUrl: toAbsoluteOutputUrl(data.heatmapUrl)
  }
}

// There is no detection model or /detection/run endpoint on the backend
// yet (the deployed models are binary segmentation only), so the
// Detection page still runs on illustrative sample output. This stub
// exists so that page keeps working until a real detection endpoint
// ships; it is not part of the segmentation pipeline.
export async function runDetection(file) {
  return delay(
    {
      jobId: `JOB-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: 'queued',
      mode: 'detection',
      filename: file?.name || 'upload.jpg'
    },
    900
  )
}

// Report generation is mocked as an instant success today. Once connected,
// this will call the backend to render a PDF or CSV export and hand back
// a signed download URL instead of a fake one.
export async function exportReport(format = 'pdf') {
  if (USE_MOCK_DASHBOARD) {
    return delay(
      {
        reportId: `RPT-${Math.floor(Math.random() * 900 + 100)}`,
        format,
        generatedAt: new Date().toISOString(),
        downloadUrl: null
      },
      500
    )
  }
  // POST /reports/export
  const { data } = await client.post('/reports/export', { format })
  return data
}
