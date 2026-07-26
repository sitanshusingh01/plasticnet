import { Link } from 'react-router-dom'
import { Leaf } from 'lucide-react'

export default function PublicHeader({ active }) {
  const links = [
    { to: '/report', label: 'Report Pollution' },
    { to: '/community-reports', label: 'Community Reports' }
  ]

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-10">
      <Link to="/" className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-white">
          <Leaf size={16} />
        </span>
        <span className="text-sm font-semibold text-ink dark:text-night-ink">PlasticNet AI</span>
      </Link>

      <nav className="flex items-center gap-4">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`text-sm font-medium transition-colors ${
              active === link.to
                ? 'text-primary'
                : 'text-ink-muted hover:text-ink dark:text-night-ink-muted dark:hover:text-night-ink'
            }`}
          >
            {link.label}
          </Link>
        ))}
        <Link
          to="/login"
          className="rounded-sm border border-border px-3.5 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted dark:border-night-border dark:text-night-ink-muted dark:hover:bg-night-muted"
        >
          Authority sign in
        </Link>
      </nav>
    </header>
  )
}
