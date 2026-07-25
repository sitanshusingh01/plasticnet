import { useRef, useState } from 'react'
import { ImageUp, X } from 'lucide-react'

export default function UploadCard({ file, previewUrl, onSelect, onClear, label = 'Drop a lake survey image here, or browse' }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) onSelect(dropped)
  }

  if (file && previewUrl) {
    return (
      <div className="relative overflow-hidden rounded-md border border-border bg-surface-muted dark:border-night-border dark:bg-night-muted">
        <img src={previewUrl} alt="Uploaded survey frame" className="h-64 w-full object-cover" />
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
        <p className="text-sm font-medium text-ink dark:text-night-ink">{label}</p>
        <p className="mt-1 text-xs text-ink-faint dark:text-night-ink-faint">Supports JPG and PNG, up to 15 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png, image/jpeg"
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0]
          if (selected) onSelect(selected)
        }}
      />
    </button>
  )
}
