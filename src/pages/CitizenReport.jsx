import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, LocateFixed, MapPin, PlayCircle } from 'lucide-react'
import PublicHeader from '../components/layout/PublicHeader.jsx'
import MediaUploadCard from '../components/common/MediaUploadCard.jsx'
import LocationMap from '../components/common/LocationMap.jsx'
import MetricCard from '../components/common/MetricCard.jsx'
import { uploadImage, runSegmentation, submitCitizenReport, reverseGeocode } from '../services/api.js'
import { getCurrentPosition, getDeviceTimezone } from '../utils/geolocation.js'

const DEFAULT_CENTER = { latitude: 34.0837, longitude: 74.7973 }

function severityFromCoverage(coverage) {
  if (coverage >= 7) return 'high'
  if (coverage >= 4) return 'moderate'
  return 'low'
}

export default function CitizenReport() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [mediaType, setMediaType] = useState(null)
  const [analysisStatus, setAnalysisStatus] = useState('idle')
  const [analysis, setAnalysis] = useState(null)

  const [locationStatus, setLocationStatus] = useState('idle')
  const [locationError, setLocationError] = useState('')
  const [position, setPosition] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [locationName, setLocationName] = useState('')
  const [geocoding, setGeocoding] = useState(false)

  const [description, setDescription] = useState('')
  const [reporterName, setReporterName] = useState('')
  const [submitStatus, setSubmitStatus] = useState('idle')
  const [submitted, setSubmitted] = useState(null)

  const analyzedFileRef = useRef(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function handleSelect(selected, type) {
    setFile(selected)
    setMediaType(type)
    setPreviewUrl(URL.createObjectURL(selected))
    setAnalysis(null)
    setAnalysisStatus('idle')

    if (type === 'image') {
      setAnalysisStatus('running')
      analyzedFileRef.current = selected
      await uploadImage(selected)
      const job = await runSegmentation(selected)
      if (analyzedFileRef.current !== selected) return
      // Same pattern as Segmentation.jsx: use the real prediction when the
      // backend provides it, fall back to the existing mock generator when
      // it doesn't (USE_MOCK=true today).
      const coveragePercent = job.coveragePercent ?? Number((Math.random() * 8 + 3).toFixed(1))
      setAnalysis({
        coveragePercent,
        objectsFound: job.objectsFound ?? Math.floor(Math.random() * 16 + 6),
        severity: severityFromCoverage(coveragePercent)
      })
      setAnalysisStatus('complete')
    }
  }

  function handleClear() {
    setFile(null)
    setMediaType(null)
    setPreviewUrl(null)
    setAnalysis(null)
    setAnalysisStatus('idle')
    analyzedFileRef.current = null
  }

  async function runReverseGeocode(latitude, longitude) {
    setGeocoding(true)
    try {
      const result = await reverseGeocode(latitude, longitude)
      setLocationName(result.label)
    } catch {
      setLocationName('Could not look up an address for this point')
    } finally {
      setGeocoding(false)
    }
  }

  async function handleRequestLocation() {
    setLocationStatus('requesting')
    setLocationError('')
    try {
      const result = await getCurrentPosition()
      const { latitude, longitude, accuracy: acc } = result.coords
      setPosition({ latitude, longitude })
      setAccuracy(Math.round(acc))
      setLocationStatus('granted')
      runReverseGeocode(latitude, longitude)
    } catch (error) {
      setLocationStatus('denied')
      setLocationError(
        error.code === 1
          ? 'Location permission was denied. Tap the map below to set your location manually.'
          : 'Could not get your location. Tap the map below to set it manually.'
      )
      setPosition(DEFAULT_CENTER)
      setAccuracy(null)
    }
  }

  function handleMarkerMove(latitude, longitude) {
    setPosition({ latitude, longitude })
    setAccuracy(null)
    runReverseGeocode(latitude, longitude)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!position) return
    setSubmitStatus('submitting')
    const result = await submitCitizenReport({
      mediaType,
      mediaPreviewUrl: previewUrl,
      description: description || 'Plastic waste spotted, no additional notes provided',
      submittedBy: reporterName || 'Anonymous',
      severity: analysis?.severity || 'unknown',
      latitude: position.latitude,
      longitude: position.longitude,
      gpsAccuracy: accuracy,
      locationName: locationName || null,
      timezone: getDeviceTimezone(),
      aiPrediction: analysis
        ? { coveragePercent: analysis.coveragePercent, severity: analysis.severity, objectsFound: analysis.objectsFound }
        : { status: 'pending_backend' },
      segmentationResult: { status: 'pending_backend', maskUrl: null },
      detectionResult: { status: 'pending_backend', boundingBoxes: [] },
      classificationResult: { status: 'pending_backend', categories: [] }
    })
    setSubmitted(result)
    setSubmitStatus('complete')
  }

  function resetForm() {
    setSubmitted(null)
    handleClear()
    setDescription('')
    setReporterName('')
    setPosition(null)
    setAccuracy(null)
    setLocationName('')
    setLocationStatus('idle')
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-surface-sunk dark:bg-night-bg">
        <PublicHeader active="/report" />
        <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary dark:bg-primary/15">
            <CheckCircle2 size={22} />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-ink dark:text-night-ink">Report submitted</h1>
          <p className="mt-2 text-sm text-ink-muted dark:text-night-ink-muted">
            Reference <span className="num font-medium text-ink dark:text-night-ink">{submitted.reportId}</span> is now
            with the review team, marked as submitted.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              to="/community-reports"
              className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              View community reports
            </Link>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-muted dark:border-night-border dark:text-night-ink-muted dark:hover:bg-night-muted"
            >
              File another report
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-sunk dark:bg-night-bg">
      <PublicHeader active="/report" />

      <div className="mx-auto max-w-2xl px-6 py-10 sm:px-10">
        <h1 className="text-xl font-semibold text-ink dark:text-night-ink">Report plastic pollution</h1>
        <p className="mt-1.5 text-sm text-ink-muted dark:text-night-ink-muted">
          Upload a photo or video, share your location, and send it to the review team in a couple
          of minutes.
        </p>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-ink dark:text-night-ink">1. Upload a photo or video</p>
          <MediaUploadCard
            file={file}
            previewUrl={previewUrl}
            mediaType={mediaType}
            onSelect={handleSelect}
            onClear={handleClear}
          />

          {mediaType === 'image' && analysisStatus === 'running' && (
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted dark:text-night-ink-muted">
              <PlayCircle size={15} className="animate-pulse" /> Analysing photo
            </p>
          )}

          {analysis && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              <MetricCard label="Coverage" value={analysis.coveragePercent} unit="%" tone="primary" />
              <MetricCard label="Objects" value={analysis.objectsFound} />
              <MetricCard
                label="Severity"
                value={analysis.severity[0].toUpperCase() + analysis.severity.slice(1)}
                tone={analysis.severity === 'high' ? 'danger' : analysis.severity === 'moderate' ? 'warning' : 'primary'}
              />
            </div>
          )}
        </div>

        {file && (mediaType === 'video' || analysisStatus === 'complete') && (
          <div className="mt-8">
            <p className="mb-2 text-sm font-medium text-ink dark:text-night-ink">2. Confirm your location</p>

            {locationStatus === 'idle' && (
              <button
                type="button"
                onClick={handleRequestLocation}
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-border py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted dark:border-night-border dark:text-night-ink-muted dark:hover:bg-night-muted"
              >
                <LocateFixed size={16} />
                Share my location
              </button>
            )}

            {locationStatus === 'requesting' && (
              <p className="text-sm text-ink-muted dark:text-night-ink-muted">Waiting for location permission</p>
            )}

            {locationError && <p className="mb-3 text-xs text-warning-dark dark:text-warning">{locationError}</p>}

            {position && (
              <div className="space-y-3">
                <LocationMap latitude={position.latitude} longitude={position.longitude} onMove={handleMarkerMove} />
                <p className="text-xs text-ink-faint dark:text-night-ink-faint">
                  Drag the pin or tap the map to adjust the exact spot before you submit.
                </p>
                <div className="flex items-start gap-2 rounded-sm bg-surface-muted px-3 py-2.5 text-sm dark:bg-night-muted">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-ink-faint dark:text-night-ink-faint" />
                  <div>
                    <p className="num text-ink dark:text-night-ink">
                      {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
                      {accuracy && <span className="text-ink-faint dark:text-night-ink-faint"> &middot; &plusmn;{accuracy}m</span>}
                    </p>
                    <p className="mt-0.5 text-ink-muted dark:text-night-ink-muted">
                      {geocoding ? 'Looking up address' : locationName || 'Address unavailable'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {position && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <p className="text-sm font-medium text-ink dark:text-night-ink">3. Add any details</p>

            <div>
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-ink dark:text-night-ink">
                What did you see
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="For example, plastic bottles and wrappers collecting near the water's edge"
                className="w-full rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none dark:border-night-border dark:bg-night-surface dark:text-night-ink"
              />
            </div>

            <div>
              <label htmlFor="reporter" className="mb-1.5 block text-sm font-medium text-ink dark:text-night-ink">
                Your name, optional
              </label>
              <input
                id="reporter"
                type="text"
                value={reporterName}
                onChange={(event) => setReporterName(event.target.value)}
                placeholder="Leave blank to report anonymously"
                className="w-full rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none dark:border-night-border dark:bg-night-surface dark:text-night-ink"
              />
            </div>

            <button
              type="submit"
              disabled={submitStatus === 'submitting'}
              className="w-full rounded-sm bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
            >
              {submitStatus === 'submitting' ? 'Submitting' : 'Submit report'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
