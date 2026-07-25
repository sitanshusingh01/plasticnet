import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

const toneStyles = {
  neutral: 'bg-primary-light text-primary dark:bg-primary/15',
  warning: 'bg-warning-light text-warning-dark dark:bg-warning/15 dark:text-warning',
  danger: 'bg-danger-light text-danger dark:bg-danger/15 dark:text-danger'
}

// A handful of KPIs are "good when falling" (coverage, density). Everything
// else is good when rising. This list is short enough to just name here
// rather than threading another prop through every StatCard usage.
const INVERTED_METRICS = ['Plastic Coverage', 'Pollution Density']

function formatValue(value, format, unit) {
  if (format === 'percent') return `${value}%`
  if (format === 'decimal') return `${value}${unit ? ` ${unit}` : ''}`
  if (format === 'number') return `${value.toLocaleString('en-IN')}${unit || ''}`
  return value
}

export default function StatCard({ icon: Icon, label, value, format, unit, change, trend, caption, tone = 'neutral' }) {
  const inverted = INVERTED_METRICS.includes(label)
  const isPositiveChange = trend === 'up' ? !inverted : inverted

  return (
    <div className="rounded-md border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-raised dark:border-night-border dark:bg-night-surface">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-ink-muted dark:text-night-ink-muted">{label}</span>
        {Icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-sm ${toneStyles[tone]}`}>
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="num text-2xl font-semibold text-ink dark:text-night-ink">
          {formatValue(value, format, unit)}
        </span>
        {typeof change === 'number' && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositiveChange ? 'text-primary' : 'text-danger'}`}>
            {trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(change)}
            {format === 'percent' ? 'pt' : format === 'number' && !unit ? '%' : ''}
          </span>
        )}
      </div>

      {caption && <p className="mt-1.5 text-xs text-ink-faint dark:text-night-ink-faint">{caption}</p>}
    </div>
  )
}
