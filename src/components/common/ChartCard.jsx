export default function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`rounded-md border border-border bg-surface p-5 shadow-card dark:border-night-border dark:bg-night-surface ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink dark:text-night-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-faint dark:text-night-ink-faint">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
