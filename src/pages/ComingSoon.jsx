import PageHeader from '../components/common/PageHeader.jsx'

export default function ComingSoon({ title, description, icon: Icon, points = [] }) {
  return (
    <div>
      <PageHeader title={title} subtitle="Scheduled for the next development phase" />

      <div className="flex flex-col items-center rounded-md border border-dashed border-border dark:border-night-border bg-surface dark:bg-night-surface px-6 py-16 text-center">
        {Icon && (
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
            <Icon size={22} />
          </span>
        )}
        <h2 className="text-lg font-semibold text-ink dark:text-night-ink">{description}</h2>
        <p className="mt-2 max-w-md text-sm text-ink-muted dark:text-night-ink-muted">
          This module is part of the research team's Phase 2 build and will connect to the same
          monitoring pipeline once the underlying model is ready.
        </p>

        {points.length > 0 && (
          <ul className="mt-6 space-y-2 text-left">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-ink-muted dark:text-night-ink-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {point}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
