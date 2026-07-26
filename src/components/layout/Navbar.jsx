import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun } from 'lucide-react'
import { useDashboard } from '../../hooks/useDashboard.js'
import { getLiveAlerts } from '../../services/api.js'

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})

export default function Navbar({ onOpenMobileNav }) {
  const { state, dispatch } = useDashboard()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [today, setToday] = useState(new Date())
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    const timer = setInterval(() => setToday(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    getLiveAlerts().then(setAlerts)
  }, [])

  function handleLogout() {
    dispatch({ type: 'LOGOUT' })
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-surface px-4 dark:border-night-border dark:bg-night-surface sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex h-9 w-9 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-muted dark:text-night-ink-muted dark:hover:bg-night-muted lg:hidden"
        >
          <Menu size={18} />
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="hidden h-9 w-9 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-muted dark:text-night-ink-muted dark:hover:bg-night-muted lg:flex"
        >
          {state.sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <span className="hidden text-sm text-ink-muted dark:text-night-ink-muted md:block">{dateFormatter.format(today)}</span>
      </div>

      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint dark:text-night-ink-faint" />
        <input
          type="text"
          placeholder="Search zones, reports, object IDs"
          className="w-full rounded-sm border border-border bg-surface-sunk py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none dark:border-night-border dark:bg-night-muted dark:text-night-ink dark:placeholder:text-night-ink-faint"
        />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <button
          type="button"
          onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
          className="flex h-9 w-9 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-muted dark:text-night-ink-muted dark:hover:bg-night-muted"
        >
          {state.theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((open) => !open)}
            className="relative flex h-9 w-9 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-muted dark:text-night-ink-muted dark:hover:bg-night-muted"
          >
            <Bell size={17} />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-md border border-border bg-surface p-2 shadow-raised dark:border-night-border dark:bg-night-surface">
              <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint dark:text-night-ink-faint">Recent Activity</p>
              <ul className="scroll-thin max-h-72 overflow-y-auto">
                {alerts.slice(0, 4).map((alert) => (
                  <li key={alert.id} className="rounded-sm px-2 py-2 text-sm hover:bg-surface-muted dark:hover:bg-night-muted">
                    <p className="text-ink dark:text-night-ink">{alert.message}</p>
                    <p className="mt-0.5 text-xs text-ink-faint dark:text-night-ink-faint">{alert.zone}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="ml-1 flex items-center gap-2.5 border-l border-border pl-2.5 dark:border-night-border">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
            {state.user.initials}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-ink dark:text-night-ink">{state.user.name}</p>
            <p className="text-xs text-ink-faint dark:text-night-ink-faint">{state.user.role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-faint hover:bg-surface-muted hover:text-danger dark:text-night-ink-faint dark:hover:bg-night-muted"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
