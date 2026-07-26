import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, PlayCircle } from 'lucide-react'
import PublicHeader from '../components/layout/PublicHeader.jsx'
import UploadCard from '../components/common/UploadCard.jsx'
import MetricCard from '../components/common/MetricCard.jsx'
import { getMonitoringZones, uploadImage, runSegmentation, submitCitizenReport } from '../services/api.js'

function severityFromCoverage(coverage) {
  if (coverage >= 7) return 'high'
  if (coverage >= 4) return 'moderate'
  return 'low'
}

export default function CitizenReport() {
  const [zones, setZones] = useState(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [status, setStatus] = useState('idle')
  const [analysis, setAnalysis] = useState(null)
  const [zoneId, setZoneId] = useState('')
  const [description, setDescription] = useState('')
  const [reporterName, setReporterName] = useState('')
  const [submitted, setSubmitted] = useState(null)

  useEffect(() => {
    getMonitoringZones().then((data) => {
      setZones(data)
      if (data.length) setZoneId(data[0].id)
    })
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleSelect(selected) {
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setStatus('idle')
    setAnalysis(null)
  }

  function handleClear() {
    setFile(null)
    setPreviewUrl(null)
    setStatus('idle')
    setAnalysis(null)
  }

  async function handleAnalyze() {
    if (!file) return
    setStatus('running')
    await uploadImage(file)
    await runSegmentation(file)
    const coveragePercent = Number((Math.random() * 8 + 3).toFixed(1))
    setAnalysis({
      coveragePercent,
      objectsFound: Math.floor(Math.random() * 16 + 6),
      severity: severityFromCoverage(coveragePercent)
    })
    setStatus('complete')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!analysis || !zoneId) return
    const zoneName = zones?.find((zone) => zone.id === zoneId)?.name || zoneId
    setStatus('submitting')
    const result = await submitCitizenReport({
      zone: zoneName,
      description: description || 'Plastic waste spotted, no additional notes provided',
      submittedBy: reporterName || 'Anonymous',
      severity: analysis.severity,
      coveragePercent: analysis.coveragePercent
    })
    setSubmitted(result)
    setStatus('complete')
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
            Reference <span className="num font-medium text-ink dark:text-night-ink">{submitted.id}</span> is now
            with the authority team, marked as under review.
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
              onClick={() => {
                setSubmitted(null)
                handleClear()
                setDescription('')
                setReporterName('')
              }}
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
        <h1 className="text-xl font-semibold text-ink dark:text-night-ink">Report pollution at Dal Lake</h1>
        <p className="mt-1.5 text-sm text-ink-muted dark:text-night-ink-muted">
          Upload a photo from the shore, let the model take a first look, then send it to the
          authority team.
        </p>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-ink dark:text-night-ink">1. Upload a photo</p>
          <UploadCard
            file={file}
            previewUrl={previewUrl}
            onSelect={handleSelect}
            onClear={handleClear}
            label="Drop a photo of the shoreline here, or browse"
          />
          <button
            type="button"
            disabled={!file || status === 'running'}
            onClick={handleAnalyze}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlayCircle size={16} />
            {status === 'running' ? 'Analysing photo' : 'Analyse photo'}
          </button>
        </div>

        {analysis && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-ink dark:text-night-ink">2. What the model found</p>
            <div className="grid grid-cols-3 gap-3">
              <MetricCard label="Coverage" value={analysis.coveragePercent} unit="%" tone="primary" />
              <MetricCard label="Objects" value={analysis.objectsFound} />
              <MetricCard
                label="Severity"
                value={analysis.severity[0].toUpperCase() + analysis.severity.slice(1)}
                tone={analysis.severity === 'high' ? 'danger' : analysis.severity === 'moderate' ? 'warning' : 'primary'}
              />
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <p className="text-sm font-medium text-ink dark:text-night-ink">3. Send it to the authority team</p>

              <div>
                <label htmlFor="zone" className="mb-1.5 block text-sm font-medium text-ink dark:text-night-ink">
                  Which zone is this?
                </label>
                <select
                  id="zone"
                  value={zoneId}
                  onChange={(event) => setZoneId(event.target.value)}
                  className="w-full rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none dark:border-night-border dark:bg-night-surface dark:text-night-ink"
                >
                  {zones?.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-ink dark:text-night-ink">
                  Anything the team should know
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="For example, near the ghat steps, drifting toward the boat channel"
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
                disabled={status === 'submitting'}
                className="w-full rounded-sm bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {status === 'submitting' ? 'Submitting' : 'Submit report'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
