export default function Loader({ label = 'Loading data' }) {
  return (
    <div className="flex items-center gap-2.5 py-10 text-sm text-ink-faint dark:text-night-ink-faint">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary dark:border-night-border dark:border-t-primary" />
      {label}
    </div>
  )
}
