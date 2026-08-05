import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Download, PlayCircle } from 'lucide-react'
import PageHeader from '../components/common/PageHeader.jsx'
import UploadCard from '../components/common/UploadCard.jsx'
import MetricCard from '../components/common/MetricCard.jsx'
import DataTable from '../components/common/DataTable.jsx'
import { getCategoryDistribution, runSegmentation } from '../services/api.js'
import { formatClockTime, formatShortDate } from '../utils/format.js'

export default function Segmentation() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [status, setStatus] = useState('idle')
  const [statusNote, setStatusNote] = useState('')
  const [error, setError] = useState('')
  const [activeView, setActiveView] = useState('original')
  const [result, setResult] = useState(null)
  const [runs, setRuns] = useState([])
  const [classes, setClasses] = useState(null)

  useEffect(() => {
    getCategoryDistribution().then(setClasses)
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // Original always exists once a file is picked; mask and overlay come
  // straight from the backend response; heatmap only appears if the
  // backend ever returns one (it doesn't today), never fabricated here.
  const viewTabs = useMemo(() => {
    const tabs = [
      { id: 'original', label: 'Original Image', url: previewUrl },
      { id: 'mask', label: 'Segmentation Mask', url: result?.maskUrl || null },
      { id: 'overlay', label: 'Overlay', url: result?.overlayUrl || null }
    ]
    if (result?.heatmapUrl) {
      tabs.push({ id: 'heatmap', label: 'Heatmap', url: result.heatmapUrl })
    }
    return tabs
  }, [previewUrl, result])

  const activeTab = viewTabs.find((tab) => tab.id === activeView) || viewTabs[0]

  function handleSelect(selected) {
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setStatus('idle')
    setStatusNote('')
    setError('')
    setResult(null)
    setActiveView('original')
  }

  function handleClear() {
    setFile(null)
    setPreviewUrl(null)
    setStatus('idle')
    setStatusNote('')
    setError('')
    setResult(null)
    setActiveView('original')
  }

  async function handleRun() {
    if (!file) return
    setStatus('running')
    setStatusNote('')
    setError('')
    setResult(null)
    try {
      const job = await runSegmentation(file, {
        onRetry: () => setStatusNote('The AI server is waking up, retrying automatically. This can take up to a minute.')
      })
      setResult(job)
      setStatus('complete')
      setStatusNote('')
      setActiveView('overlay')
      setRuns((current) => [
        {
          id: job.jobId,
          zone: 'Manual upload',
          capturedAt: new Date().toISOString(),
          coveragePercent: job.coveragePercent,
          objectsFound: job.objectsFound,
          processingTime: job.processingTime
        },
        ...current
      ])
    } catch (runError) {
      setStatus('error')
      setStatusNote('')
      setError(runError.message)
    }
  }

  async function handleDownloadMask() {
    if (!result?.maskUrl) return
    try {
      const response = await fetch(result.maskUrl)
      if (!response.ok) throw new Error('Mask download failed')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `${result.jobId || 'segmentation'}_mask.png`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setError('Could not download the mask image. It may have expired on the server, run the analysis again.')
    }
  }

  const columns = useMemo(
    () => [
      { key: 'id', header: 'Scan ID' },
      { key: 'zone', header: 'Zone' },
      { key: 'capturedAt', header: 'Captured', render: (row) => `${formatShortDate(row.capturedAt)}, ${formatClockTime(row.capturedAt)}` },
      { key: 'coveragePercent', header: 'Coverage', render: (row) => `${row.coveragePercent}%` },
      { key: 'objectsFound', header: 'Objects Found' },
      { key: 'processingTime', header: 'Processing Time' }
    ],
    []
  )

  return (
    <div>
      <PageHeader
        title="Segmentation"
        subtitle="Upload a Dal Lake survey frame to generate a plastic coverage mask"
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <UploadCard file={file} previewUrl={previewUrl} onSelect={handleSelect} onClear={handleClear} />

          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              disabled={!file || status === 'running'}
              onClick={handleRun}
              className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlayCircle size={16} />
              {status === 'running' ? 'Running model' : 'Run AI'}
            </button>
            <button
              type="button"
              disabled={status !== 'complete' || !result?.maskUrl}
              onClick={handleDownloadMask}
              className="flex items-center justify-center gap-2 rounded-sm border border-border dark:border-night-border px-4 py-2.5 text-sm font-medium text-ink-muted dark:text-night-ink-muted transition-colors hover:bg-surface-muted dark:hover:bg-night-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} />
              Download Mask
            </button>
          </div>

          {status === 'running' && (
            <p className="mt-3 text-sm text-ink-muted dark:text-night-ink-muted">
              {statusNote || 'Sending the image to the AI server. The first run after a quiet period can take up to a minute while the server wakes up.'}
            </p>
          )}

          {error && (
            <p className="mt-3 flex items-start gap-2 text-sm text-danger dark:text-danger">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          {result && (
            <>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <MetricCard label="Coverage" value={result.coveragePercent} unit="%" tone="primary" />
                <MetricCard label="Objects Found" value={result.objectsFound} />
                <MetricCard label="Processing Time" value={result.processingTime} />
              </div>

              <div className="mt-4 rounded-sm border border-border dark:border-night-border p-3 text-xs text-ink-muted dark:text-night-ink-muted">
                <p className="mb-2 font-medium uppercase tracking-wide text-ink-faint dark:text-night-ink-faint">
                  Run details
                </p>
                <div className="space-y-1">
                  <p>Job <span className="num text-ink dark:text-night-ink">{result.jobId}</span> &middot; {result.status}</p>
                  <p>Model: <span className="text-ink dark:text-night-ink">{result.model}</span></p>
                  <p>File: <span className="num text-ink dark:text-night-ink">{result.filename}</span> ({result.imageWidth}&times;{result.imageHeight}px)</p>
                  <p>Largest plastic region: <span className="num text-ink dark:text-night-ink">{result.largestRegionPixels?.toLocaleString()}</span> px</p>
                </div>
                {result.classes && (
                  <div className="mt-3 space-y-1.5">
                    {result.classes.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.colorHex }} />
                        <span className="flex-1">{entry.name}</span>
                        <span className="num text-ink dark:text-night-ink">{entry.percentage}%</span>
                      </div>
                    ))}
                  </div>
                )}
                {result.note && (
                  <p className="mt-3 text-ink-faint dark:text-night-ink-faint">{result.note}</p>
                )}
              </div>
            </>
          )}

          {classes && (
            <div className="mt-4 rounded-sm border border-border dark:border-night-border p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint dark:text-night-ink-faint">
                Dal Lake waste classes
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {classes.map((entry) => (
                  <div key={entry.category} className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-night-ink-muted">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.category}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-3">
          <div className="flex gap-1 border-b border-border dark:border-night-border">
            {viewTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                disabled={!tab.url}
                className={`px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  activeView === tab.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-ink-faint dark:text-night-ink-faint hover:text-ink-muted dark:hover:text-night-ink-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex h-[360px] items-center justify-center overflow-hidden rounded-md border border-border dark:border-night-border bg-surface-muted dark:bg-night-muted">
            {activeTab?.url ? (
              <img
                src={activeTab.url}
                alt={`${activeTab.label} preview`}
                className="h-full w-full object-contain"
              />
            ) : (
              <p className="px-6 text-center text-sm text-ink-faint dark:text-night-ink-faint">
                {previewUrl
                  ? 'Run AI to generate the segmentation mask and overlay for this frame'
                  : 'Upload a Dal Lake frame on the left, then run the model to see the mask and overlay here'}
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-faint dark:text-night-ink-faint">
            Built on our Dal Lake annotation pipeline, 307 survey images and 1,760 polygon
            annotations across the six classes above, labelled in Roboflow using COCO instance
            segmentation.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold text-ink dark:text-night-ink">Recent Segmentation Runs</h3>
        {runs.length > 0 ? (
          <DataTable columns={columns} rows={runs} />
        ) : (
          <p className="text-sm text-ink-faint dark:text-night-ink-faint">
            Runs from this session will appear here after you analyse a frame.
          </p>
        )}
      </div>
    </div>
  )
}
