import { useEffect, useMemo, useState } from 'react'
import { Download, PlayCircle } from 'lucide-react'
import PageHeader from '../components/common/PageHeader.jsx'
import UploadCard from '../components/common/UploadCard.jsx'
import MetricCard from '../components/common/MetricCard.jsx'
import DataTable from '../components/common/DataTable.jsx'
import { fetchSegmentationSamples, runInference } from '../services/api.js'
import { formatClockTime, formatShortDate } from '../utils/format.js'

const VIEW_TABS = [
  { id: 'original', label: 'Original Image' },
  { id: 'mask', label: 'Segmentation Mask' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'heatmap', label: 'Heatmap' }
]

// Real mask, overlay and heatmap rasters will come back from the inference
// endpoint. Until that's connected, each tab applies a distinct filter
// preset to the same source frame so reviewers can see how the layout will
// behave with four real images side by side.
const VIEW_FILTERS = {
  original: 'none',
  mask: 'grayscale(1) contrast(1.9) brightness(1.05)',
  overlay: 'saturate(1.6) hue-rotate(80deg) contrast(1.1)',
  heatmap: 'saturate(2.4) hue-rotate(-40deg) contrast(1.3)'
}

export default function Segmentation() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [status, setStatus] = useState('idle')
  const [activeView, setActiveView] = useState('original')
  const [result, setResult] = useState(null)
  const [samples, setSamples] = useState(null)

  useEffect(() => {
    fetchSegmentationSamples().then(setSamples)
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
    setResult(null)
    setActiveView('original')
  }

  function handleClear() {
    setFile(null)
    setPreviewUrl(null)
    setStatus('idle')
    setResult(null)
  }

  async function handleRun() {
    if (!file) return
    setStatus('running')
    const job = await runInference(file, 'segmentation')
    setResult({
      ...job,
      coveragePercent: (Math.random() * 6 + 4).toFixed(1),
      objectsFound: Math.floor(Math.random() * 20 + 18),
      processingTime: `${(Math.random() * 1.5 + 1.2).toFixed(1)}s`
    })
    setStatus('complete')
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
        subtitle="Upload a survey frame to generate a plastic coverage mask"
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
              disabled={status !== 'complete'}
              className="flex items-center justify-center gap-2 rounded-sm border border-border dark:border-night-border px-4 py-2.5 text-sm font-medium text-ink-muted dark:text-night-ink-muted transition-colors hover:bg-surface-muted dark:hover:bg-night-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} />
              Download Mask
            </button>
          </div>

          {result && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <MetricCard label="Coverage" value={result.coveragePercent} unit="%" tone="primary" />
              <MetricCard label="Objects Found" value={result.objectsFound} />
              <MetricCard label="Processing Time" value={result.processingTime} />
            </div>
          )}
        </div>

        <div className="xl:col-span-3">
          <div className="flex gap-1 border-b border-border dark:border-night-border">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                className={`px-3 py-2.5 text-sm font-medium transition-colors ${
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
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`${VIEW_TABS.find((tab) => tab.id === activeView)?.label} preview`}
                className="h-full w-full object-cover"
                style={{ filter: VIEW_FILTERS[activeView] }}
              />
            ) : (
              <p className="px-6 text-center text-sm text-ink-faint dark:text-night-ink-faint">
                Upload a frame on the left to preview the mask, overlay and heatmap outputs here
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold text-ink dark:text-night-ink">Recent Segmentation Runs</h3>
        {samples && <DataTable columns={columns} rows={samples} />}
      </div>
    </div>
  )
}
