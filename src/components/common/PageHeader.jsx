export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-border pb-5 dark:border-night-border sm:flex-row sm:items-end">
      <div>
        <h1 className="text-xl font-semibold text-ink dark:text-night-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted dark:text-night-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
