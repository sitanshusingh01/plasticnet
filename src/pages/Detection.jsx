import { useEffect, useMemo, useState } from 'react'
import { Download, PlayCircle } from 'lucide-react'
import PageHeader from '../components/common/PageHeader.jsx'
import UploadCard from '../components/common/UploadCard.jsx'
import DataTable from '../components/common/DataTable.jsx'
import { fetchDetectionRecords, runInference } from '../services/api.js'
import { formatClockTime } from '../utils/format.js'

const PLASTIC_TYPES = ['Polythene sheet', 'PET bottle', 'Food wrapper', 'Bottle cap', 'Thermocol block']

// Placeholder boxes drawn over the uploaded frame once a run completes. The
// detection model will return real normalized coordinates through the same
// runInference call, at which point this array gets replaced by job.boxes.
function generateBoxes() {
  return Array.from({ length: 4 }).map((_, index) => ({
    id: index,
    type: PLASTIC_TYPES[Math.floor(Math.random() * PLASTIC_TYPES.length)],
    confidence: (Math.random() * 0.22 + 0.75).toFixed(2),
    top: Math.random() * 55 + 8,
    left: Math.random() * 60 + 6,
    width: Math.random() * 16 + 10,
    height: Math.random() * 14 + 10
  }))
}

export default function Detection() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [status, setStatus] = useState('idle')
  const [boxes, setBoxes] = useState([])
  const [records, setRecords] = useState(null)

  useEffect(() => {
    fetchDetectionRecords().then(setRecords)
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
    setBoxes([])
  }

  function handleClear() {
    setFile(null)
    setPreviewUrl(null)
    setStatus('idle')
    setBoxes([])
  }

  async function handleRun() {
    if (!file) return
    setStatus('running')
    await runInference(file, 'detection')
    setBoxes(generateBoxes())
    setStatus('complete')
  }

  function handleExport() {
    if (!records) return
    const header = 'Object ID,Plastic Type,Confidence,Estimated Area (sq m),Zone,Timestamp'
    const rows = records.map((row) =>
      [row.id, row.type, row.confidence, row.area, row.zone, row.timestamp].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'plasticnet_detections.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const columns = useMemo(
    () => [
      { key: 'id', header: 'Object ID' },
      { key: 'type', header: 'Plastic Type' },
      { key: 'confidence', header: 'Confidence', render: (row) => `${Math.round(row.confidence * 100)}%` },
      { key: 'area', header: 'Estimated Area', render: (row) => `${row.area} sq m` },
      { key: 'zone', header: 'Zone' },
      { key: 'timestamp', header: 'Detected At', render: (row) => formatClockTime(row.timestamp) }
    ],
    []
  )

  return (
    <div>
      <PageHeader title="Object Detection" subtitle="Locate and count individual plastic objects in a survey frame" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <UploadCard file={file} previewUrl={previewUrl} onSelect={handleSelect} onClear={handleClear} />
          <button
            type="button"
            disabled={!file || status === 'running'}
            onClick={handleRun}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlayCircle size={16} />
            {status === 'running' ? 'Scanning frame' : 'Run Detection'}
          </button>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink dark:text-night-ink">Bounding Box Preview</p>
          <div className="relative flex h-[300px] items-center justify-center overflow-hidden rounded-md border border-border dark:border-night-border bg-surface-muted dark:bg-night-muted">
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Uploaded survey frame" className="h-full w-full object-cover" />
                {boxes.map((box) => (
                  <div
                    key={box.id}
                    className="absolute rounded-sm border-2 border-danger"
                    style={{ top: `${box.top}%`, left: `${box.left}%`, width: `${box.width}%`, height: `${box.height}%` }}
                  >
                    <span className="absolute -top-6 left-0 whitespace-nowrap rounded-sm bg-danger px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {box.type} &middot; {Math.round(box.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <p className="px-6 text-center text-sm text-ink-faint dark:text-night-ink-faint">
                Upload a frame to preview detected bounding boxes here
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink dark:text-night-ink">Detection Table</h3>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-sm border border-border dark:border-night-border px-3 py-1.5 text-xs font-medium text-ink-muted dark:text-night-ink-muted hover:bg-surface-muted dark:hover:bg-night-muted"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
        {records && <DataTable columns={columns} rows={records} />}
      </div>
    </div>
  )
}
