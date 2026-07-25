import axios from 'axios'
import {
  kpiMetrics,
  dailyDetectionTrend,
  weeklyCollection,
  categoryDistribution,
  coverageTrend,
  monthlyPollutionTrend,
  monitoringRegions,
  liveAlerts,
  detectionRecords,
  classificationSummary,
  segmentationSamples,
  recentReports
} from '../data/mockData'

// The backend isn't live yet. USE_MOCK stays true until the FastAPI service
// is deployed, at which point this flips and every function below calls the
// real endpoint instead of returning static data. Base URL will come from
// an env var (VITE_API_BASE_URL) once that happens.
const USE_MOCK = true

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 10000
})

function delay(data, ms = 380) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

export async function fetchOverviewMetrics() {
  if (USE_MOCK) return delay(kpiMetrics)
  // GET /overview/metrics
  const { data } = await client.get('/overview/metrics')
  return data
}

export async function fetchDetectionTrend() {
  if (USE_MOCK) return delay(dailyDetectionTrend)
  // GET /overview/detection-trend?range=14d
  const { data } = await client.get('/overview/detection-trend')
  return data
}

export async function fetchWeeklyCollection() {
  if (USE_MOCK) return delay(weeklyCollection)
  // GET /overview/weekly-collection
  const { data } = await client.get('/overview/weekly-collection')
  return data
}

export async function fetchCategoryDistribution() {
  if (USE_MOCK) return delay(categoryDistribution)
  // GET /overview/category-distribution
  const { data } = await client.get('/overview/category-distribution')
  return data
}

export async function fetchCoverageTrend() {
  if (USE_MOCK) return delay(coverageTrend)
  // GET /overview/coverage-trend
  const { data } = await client.get('/overview/coverage-trend')
  return data
}

export async function fetchPollutionTrend() {
  if (USE_MOCK) return delay(monthlyPollutionTrend)
  // GET /overview/pollution-trend
  const { data } = await client.get('/overview/pollution-trend')
  return data
}

export async function fetchMonitoringRegions() {
  if (USE_MOCK) return delay(monitoringRegions)
  // GET /regions
  const { data } = await client.get('/regions')
  return data
}

export async function fetchLiveAlerts() {
  if (USE_MOCK) return delay(liveAlerts, 250)
  // GET /alerts?limit=10
  const { data } = await client.get('/alerts')
  return data
}

export async function fetchDetectionRecords() {
  if (USE_MOCK) return delay(detectionRecords)
  // GET /detections?zone=&type=&page=
  const { data } = await client.get('/detections')
  return data
}

export async function fetchClassificationSummary() {
  if (USE_MOCK) return delay(classificationSummary)
  // GET /classification/summary
  const { data } = await client.get('/classification/summary')
  return data
}

export async function fetchSegmentationSamples() {
  if (USE_MOCK) return delay(segmentationSamples)
  // GET /segmentation/recent
  const { data } = await client.get('/segmentation/recent')
  return data
}

export async function fetchRecentReports() {
  if (USE_MOCK) return delay(recentReports, 300)
  // GET /reports/recent
  const { data } = await client.get('/reports/recent')
  return data
}

// Segmentation and detection both accept an uploaded frame and hand back
// a job id today. Once the CV pipeline is deployed behind FastAPI this will
// POST multipart form data to /segmentation/run or /detection/run and the
// caller should poll /jobs/:id for status.
export async function runInference(file, mode = 'segmentation') {
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

export async function loginRequest(email, password) {
  if (USE_MOCK) {
    return delay({
      token: 'mock-token-8f2c',
      user: { email, name: 'Er. Aadil Rashid', role: 'Environmental Officer' }
    }, 600)
  }
  // POST /auth/login
  const { data } = await client.post('/auth/login', { email, password })
  return data
}
