export default function MetricCard({ label, value, unit, tone = 'default' }) {
  const toneText = {
    default: 'text-ink dark:text-night-ink',
    primary: 'text-primary',
    warning: 'text-warning-dark dark:text-warning',
    danger: 'text-danger'
  }

  return (
    <div className="rounded-sm bg-surface-muted px-4 py-3 dark:bg-night-muted">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint dark:text-night-ink-faint">{label}</p>
      <p className={`num mt-1 text-lg font-semibold ${toneText[tone]}`}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-ink-faint dark:text-night-ink-faint">{unit}</span>}
      </p>
    </div>
  )
}
