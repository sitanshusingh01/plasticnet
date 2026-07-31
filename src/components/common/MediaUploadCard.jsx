import { useRef, useState } from 'react'
import { FileVideo, ImageUp, X } from 'lucide-react'

function detectMediaType(file) {
  if (file.type.startsWith('video/')) return 'video'
  return 'image'
}

export default function MediaUploadCard({ file, previewUrl, mediaType, onSelect, onClear }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFiles(fileList) {
    const selected = fileList?.[0]
    if (!selected) return
    onSelect(selected, detectMediaType(selected))
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  if (file && previewUrl) {
    return (
      <div className="relative overflow-hidden rounded-md border border-border bg-surface-muted dark:border-night-border dark:bg-night-muted">
        {mediaType === 'video' ? (
          <video src={previewUrl} controls muted preload="metadata" className="h-64 w-full bg-black object-contain" />
        ) : (
          <img src={previewUrl} alt="Uploaded pollution report" className="h-64 w-full object-cover" />
        )}
        <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-2.5 dark:border-night-border dark:bg-night-surface">
          <span className="truncate text-xs text-ink-muted dark:text-night-ink-muted">{file.name}</span>
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-ink-faint hover:bg-surface-muted hover:text-danger dark:text-night-ink-faint dark:hover:bg-night-muted"
          >
            <X size={13} /> Remove
          </button>
        </div>
        {mediaType === 'video' && (
          <p className="border-t border-border px-4 py-2 text-xs text-ink-faint dark:border-night-border dark:text-night-ink-faint">
            AI analysis will run on extracted frames once the backend is connected. This report will
            still be sent to the authority team as a video reference.
          </p>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex h-64 w-full flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed transition-colors ${
        isDragging
          ? 'border-primary bg-primary-light dark:bg-primary/10'
          : 'border-border bg-surface-muted hover:border-primary/60 dark:border-night-border dark:bg-night-muted'
      }`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-primary shadow-card dark:bg-night-surface">
        <ImageUp size={20} />
      </span>
      <div className="text-center">
        <p className="text-sm font-medium text-ink dark:text-night-ink">Drop a photo or video here, or browse</p>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-ink-faint dark:text-night-ink-faint">
          <FileVideo size={12} /> One file only, JPG, PNG or MP4, up to 50 MB
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png, image/jpeg, video/mp4, video/quicktime"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </button>
  )
}
