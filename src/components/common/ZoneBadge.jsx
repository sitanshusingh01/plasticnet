const RISK_STYLES = {
  high: 'bg-danger-light text-danger dark:bg-danger/15',
  moderate: 'bg-warning-light text-warning-dark dark:bg-warning/15 dark:text-warning',
  low: 'bg-primary-light text-primary dark:bg-primary/15'
}

const STATUS_STYLES = {
  active: 'bg-primary-light text-primary dark:bg-primary/15',
  scheduled: 'bg-lake-light text-lake-dark dark:bg-lake/15 dark:text-lake',
  offline: 'bg-surface-muted text-ink-faint dark:bg-night-muted dark:text-night-ink-faint'
}

const REPORT_STYLES = {
  submitted: 'bg-lake-light text-lake-dark dark:bg-lake/15 dark:text-lake',
  'under-review': 'bg-warning-light text-warning-dark dark:bg-warning/15 dark:text-warning',
  'cleanup-scheduled': 'bg-primary-light text-primary dark:bg-primary/15',
  'cleanup-in-progress': 'bg-primary-light text-primary dark:bg-primary/20',
  resolved: 'bg-surface-muted text-ink-faint dark:bg-night-muted dark:text-night-ink-faint'
}

const RISK_LABELS = { high: 'High Risk', moderate: 'Moderate Risk', low: 'Low Risk' }
const STATUS_LABELS = { active: 'Active', scheduled: 'Scheduled', offline: 'Offline' }
const REPORT_LABELS = {
  submitted: 'Submitted',
  'under-review': 'Under Review',
  'cleanup-scheduled': 'Cleanup Scheduled',
  'cleanup-in-progress': 'Cleanup In Progress',
  resolved: 'Resolved'
}

const KIND_MAP = {
  risk: { styles: RISK_STYLES, labels: RISK_LABELS },
  status: { styles: STATUS_STYLES, labels: STATUS_LABELS },
  report: { styles: REPORT_STYLES, labels: REPORT_LABELS }
}

export default function ZoneBadge({ kind = 'risk', value }) {
  const { styles, labels } = KIND_MAP[kind]

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[value]}`}>
      {labels[value] || value}
    </span>
  )
}
