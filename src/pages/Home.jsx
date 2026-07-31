import { Link } from 'react-router-dom'
import { BadgeCheck, Camera, Leaf, ScanSearch, ShieldCheck, Users } from 'lucide-react'
import WaterlinePattern from '../components/common/WaterlinePattern.jsx'
import PublicHeader from '../components/layout/PublicHeader.jsx'

const STEPS = [
  {
    icon: Camera,
    title: 'Snap a photo or video',
    body: 'Anyone can capture what they see, no special equipment or account needed.'
  },
  {
    icon: ScanSearch,
    title: 'The model takes a look',
    body: 'Our AI reads the frame and estimates plastic coverage, object count and severity.'
  },
  {
    icon: BadgeCheck,
    title: 'The review team follows up',
    body: 'Reports land in a shared queue where the team can verify, prioritise and schedule cleanup.'
  }
]

export default function Home() {
  return (
    <div className="min-h-screen bg-surface-sunk dark:bg-night-bg">
      <PublicHeader active="/" />

      <section className="relative mx-4 overflow-hidden rounded-lg bg-sidebar sm:mx-10">
        <WaterlinePattern className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative mx-auto max-w-2xl px-6 py-16 text-center sm:py-20">
          <p className="text-xs font-medium uppercase tracking-widest text-primary-light/80">
            AI Powered Plastic Pollution Reporting
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Spot plastic pollution, report it in minutes
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
            Upload a photo or video, share your location, and send it straight to the people who can
            act on it. No sign up required.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/report"
              className="w-full rounded-sm bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark sm:w-auto"
            >
              Report pollution
            </Link>
            <Link
              to="/community-reports"
              className="w-full rounded-sm border border-white/20 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              View community reports
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
        <h2 className="text-center text-lg font-semibold text-ink dark:text-night-ink">How it works</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="rounded-md border border-border bg-surface p-5 shadow-card dark:border-night-border dark:bg-night-surface">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary dark:bg-primary/15">
                <step.icon size={17} />
              </span>
              <p className="mt-3 text-xs font-medium text-ink-faint dark:text-night-ink-faint">Step {index + 1}</p>
              <h3 className="mt-1 text-sm font-semibold text-ink dark:text-night-ink">{step.title}</h3>
              <p className="mt-1.5 text-sm text-ink-muted dark:text-night-ink-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16 sm:px-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-md border border-border bg-surface p-6 shadow-card dark:border-night-border dark:bg-night-surface">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lake-light text-lake-dark dark:bg-lake/15 dark:text-lake">
              <Users size={17} />
            </span>
            <h3 className="mt-3 text-base font-semibold text-ink dark:text-night-ink">For citizens</h3>
            <p className="mt-1.5 text-sm text-ink-muted dark:text-night-ink-muted">
              Upload a photo or video, see what the model finds, and file a report if a spot needs
              attention.
            </p>
            <Link
              to="/report"
              className="mt-4 inline-block rounded-sm bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Report pollution
            </Link>
          </div>

          <div className="rounded-md border border-border bg-surface p-6 shadow-card dark:border-night-border dark:bg-night-surface">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary dark:bg-primary/15">
              <ShieldCheck size={17} />
            </span>
            <h3 className="mt-3 text-base font-semibold text-ink dark:text-night-ink">For the review team</h3>
            <p className="mt-1.5 text-sm text-ink-muted dark:text-night-ink-muted">
              Review incoming reports, track pollution trends over time, and export data for
              reporting and cleanup planning.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block rounded-sm border border-border px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted dark:border-night-border dark:text-night-ink-muted dark:hover:bg-night-muted"
            >
              Sign in to the dashboard
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center dark:border-night-border sm:px-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-1.5 text-xs text-ink-faint dark:text-night-ink-faint">
          <span className="flex items-center gap-1.5 font-medium text-ink-muted dark:text-night-ink-muted">
            <Leaf size={13} className="text-primary" /> PlasticNet AI
          </span>
          <p>An AI powered environmental monitoring project, currently in active development.</p>
        </div>
      </footer>
    </div>
  )
}
