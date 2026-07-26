import { Link } from 'react-router-dom'
import { BadgeCheck, Camera, MapPinned, ScanSearch, ShieldCheck, Users } from 'lucide-react'
import WaterlinePattern from '../components/common/WaterlinePattern.jsx'
import PublicHeader from '../components/layout/PublicHeader.jsx'
import { datasetInfo } from '../data/mockData.js'

const STEPS = [
  {
    icon: Camera,
    title: 'Photograph the shoreline',
    body: 'Anyone standing at Dal Lake can capture a frame of the water, no special equipment needed.'
  },
  {
    icon: ScanSearch,
    title: 'The model reads the frame',
    body: 'Our segmentation model, trained only on Dal Lake imagery, marks plastic coverage and object type.'
  },
  {
    icon: BadgeCheck,
    title: 'The authority team follows up',
    body: 'Reports land in a shared queue where officers can verify, prioritise and schedule a cleanup.'
  }
]

const DATASET_STATS = [
  { value: datasetInfo.totalImages, label: 'Dal Lake survey images' },
  { value: datasetInfo.totalAnnotations.toLocaleString('en-IN'), label: 'Polygon annotations' },
  { value: datasetInfo.classes.length, label: 'Waste categories' }
]

export default function Home() {
  return (
    <div className="min-h-screen bg-surface-sunk dark:bg-night-bg">
      <PublicHeader active="/" />

      <section className="relative mx-4 overflow-hidden rounded-lg bg-sidebar sm:mx-10">
        <WaterlinePattern className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative mx-auto max-w-2xl px-6 py-16 text-center sm:py-20">
          <p className="text-xs font-medium uppercase tracking-widest text-primary-light/80">
            AI Powered Dal Lake Plastic Monitoring Platform
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Protecting Dal Lake using computer vision and environmental analytics
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
            A shared space for residents, shikara operators and the municipal team to track plastic
            pollution across Dal Lake, backed by a segmentation model trained only on Dal Lake imagery.
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

          <div className="mx-auto mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6">
            <div>
              <p className="num text-xl font-semibold text-white">18,742</p>
              <p className="mt-0.5 text-xs text-white/50">Objects logged</p>
            </div>
            <div>
              <p className="num text-xl font-semibold text-white">6</p>
              <p className="mt-0.5 text-xs text-white/50">Dal Lake zones</p>
            </div>
            <div>
              <p className="num text-xl font-semibold text-white">71/100</p>
              <p className="mt-0.5 text-xs text-white/50">Health index</p>
            </div>
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
              Upload a photo from the shore, see what the model finds, and file a report if a spot
              needs attention.
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
            <h3 className="mt-3 text-base font-semibold text-ink dark:text-night-ink">For the authority team</h3>
            <p className="mt-1.5 text-sm text-ink-muted dark:text-night-ink-muted">
              Review detections zone by zone, track pollution trends over time, and export reports
              for the Municipal Corporation and Pollution Control Board.
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

      <section className="border-t border-border px-6 py-14 dark:border-night-border sm:px-10">
        <div className="mx-auto max-w-4xl text-center">
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-ink-muted dark:bg-night-muted dark:text-night-ink-muted">
            <MapPinned size={17} />
          </span>
          <h2 className="mt-3 text-lg font-semibold text-ink dark:text-night-ink">Built on our own Dal Lake dataset</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink-muted dark:text-night-ink-muted">
            Every image in the training set was captured at Dal Lake and annotated by the research
            team at {datasetInfo.affiliation.replace(' research project', '')}, using {datasetInfo.annotationTool} in{' '}
            {datasetInfo.annotationType} format.
          </p>
          <div className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-4">
            {DATASET_STATS.map((stat) => (
              <div key={stat.label}>
                <p className="num text-xl font-semibold text-ink dark:text-night-ink">{stat.value}</p>
                <p className="mt-0.5 text-xs text-ink-faint dark:text-night-ink-faint">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-xs text-ink-faint dark:text-night-ink-faint sm:px-10">
        PlasticNet AI, a Dal Lake conservation project with NIT Srinagar and Municipal Corporation Srinagar
      </footer>
    </div>
  )
}
