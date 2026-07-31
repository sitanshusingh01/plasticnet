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
  segmentationSamples,
  recentReports,
  citizenReports,
  currentUser
} from '../data/mockData'
import { buildReportFilename } from '../utils/format.js'

// The backend isn't live yet. USE_MOCK stays true until the FastAPI service
// is deployed, at which point this flips and every function below calls the
// real endpoint instead of returning static data. Base URL will come from
// an env var (VITE_API_BASE_URL) once that happens. Nothing outside this
// file should ever import mockData directly, components go through here.
const USE_MOCK = true

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 10000
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
  if (USE_MOCK) {
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
  if (USE_MOCK) return delay(kpiMetrics)
  // GET /dashboard/stats
  const { data } = await client.get('/dashboard/stats')
  return data
}

export async function getDetectionTrend() {
  if (USE_MOCK) return delay(dailyDetectionTrend)
  // GET /dashboard/detection-trend?range=14d
  const { data } = await client.get('/dashboard/detection-trend')
  return data
}

export async function getWeeklyCollection() {
  if (USE_MOCK) return delay(weeklyCollection)
  // GET /dashboard/weekly-collection
  const { data } = await client.get('/dashboard/weekly-collection')
  return data
}

export async function getCategoryDistribution() {
  if (USE_MOCK) return delay(categoryDistribution)
  // GET /classification/category-distribution
  const { data } = await client.get('/classification/category-distribution')
  return data
}

export async function getCoverageTrend() {
  if (USE_MOCK) return delay(coverageTrend)
  // GET /dashboard/coverage-trend
  const { data } = await client.get('/dashboard/coverage-trend')
  return data
}

export async function getPollutionIndexTrend() {
  if (USE_MOCK) return delay(pollutionIndexTrend)
  // GET /dashboard/pollution-index-trend
  const { data } = await client.get('/dashboard/pollution-index-trend')
  return data
}

export async function getMonitoringZones() {
  if (USE_MOCK) return delay(monitoringZones)
  // GET /zones
  const { data } = await client.get('/zones')
  return data
}

// Zone coordinates and plastic share doubling as heatmap intensity until
// the backend produces a proper pixel level density grid per zone.
export async function getPollutionHeatmap() {
  if (USE_MOCK) {
    return delay(
      monitoringZones.map((zone) => ({
        zone: zone.name,
        coordinates: zone.coordinates,
        intensity: zone.plasticShare
      }))
    )
  }
  // GET /zones/heatmap
  const { data } = await client.get('/zones/heatmap')
  return data
}

export async function getLiveAlerts() {
  if (USE_MOCK) return delay(liveAlerts, 250)
  // GET /alerts?limit=10
  const { data } = await client.get('/alerts')
  return data
}

export async function getDetectionRecords() {
  if (USE_MOCK) return delay(detectionRecords)
  // GET /detections?zone=&type=&page=
  const { data } = await client.get('/detections')
  return data
}

export async function getClassificationSummary() {
  if (USE_MOCK) return delay(classificationSummary)
  // GET /classification/summary
  const { data } = await client.get('/classification/summary')
  return data
}

// Rolls up the numbers an authority reviewer cares about across
// classification and pollution trend, useful for a single dashboard call
// instead of firing three separate requests.
export async function getAuthorityAnalytics() {
  if (USE_MOCK) {
    return delay({
      categoryDistribution,
      classificationSummary,
      coverageTrend,
      pollutionIndexTrend
    })
  }
  // GET /authority/analytics
  const { data } = await client.get('/authority/analytics')
  return data
}

export async function getSegmentationSamples() {
  if (USE_MOCK) return delay(segmentationSamples)
  // GET /segmentation/recent
  const { data } = await client.get('/segmentation/recent')
  return data
}

export async function getRecentReports() {
  if (USE_MOCK) return delay(recentReports, 300)
  // GET /reports/recent
  const { data } = await client.get('/reports/recent')
  return data
}

export async function getCitizenReports() {
  if (USE_MOCK) return delay([...citizenReportStore].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)), 300)
  // GET /citizen-reports
  const { data } = await client.get('/citizen-reports')
  return data
}

// Builds the full report record client side today. Once FastAPI exists,
// the server assigns reportId and filename instead and this becomes a
// straightforward POST with the media file attached.
export async function submitCitizenReport(report) {
  if (USE_MOCK) {
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
  if (USE_MOCK) {
    citizenReportStore = citizenReportStore.map((report) =>
      report.reportId === reportId ? { ...report, reportStatus } : report
    )
    return delay(citizenReportStore.find((report) => report.reportId === reportId), 300)
  }
  // PATCH /citizen-reports/:id
  const { data } = await client.patch(`/citizen-reports/${reportId}`, { reportStatus })
  return data
}

// Nominatim is a free OpenStreetMap service, this call is real even in
// mock mode since it has nothing to do with our own backend. If it fails
// or is rate limited, the caller falls back to showing raw coordinates.
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

// Called right after a file is picked, before segmentation or detection
// runs. Today this just stands in a mock reference, once the backend
// exists it will actually hand the file to FastAPI and get back a
// storage key that runSegmentation and runDetection can reuse.
export async function uploadImage(file) {
  if (USE_MOCK) {
    return delay(
      {
        imageId: `IMG-${Math.floor(Math.random() * 9000 + 1000)}`,
        filename: file?.name || 'upload.jpg',
        sizeBytes: file?.size || 0
      },
      450
    )
  }
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post('/images/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}

async function runInference(file, mode) {
  if (USE_MOCK) {
    return delay(
      {
        jobId: `JOB-${Math.floor(Math.random() * 9000 + 1000)}`,
        status: 'queued',
        mode,
        filename: file?.name || 'upload.jpg'
      },
      900
    )
  }
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post(`/${mode}/run`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}

export function runSegmentation(file) {
  // The trained YOLOv8 instance segmentation model will eventually sit
  // behind this call, producing the mask, overlay and heatmap layers.
  return runInference(file, 'segmentation')
}

export function runDetection(file) {
  return runInference(file, 'detection')
}

// Report generation is mocked as an instant success today. Once connected,
// this will call the backend to render a PDF or CSV export and hand back
// a signed download URL instead of a fake one.
export async function exportReport(format = 'pdf') {
  if (USE_MOCK) {
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
