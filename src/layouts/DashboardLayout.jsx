import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { X } from 'lucide-react'
import Sidebar from '../components/layout/Sidebar.jsx'
import Navbar from '../components/layout/Navbar.jsx'
import { useDashboard } from '../hooks/useDashboard.js'

export default function DashboardLayout() {
  const { state } = useDashboard()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface-sunk dark:bg-night-bg">
      <Sidebar collapsed={state.sidebarCollapsed} variant="desktop" />

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <Sidebar collapsed={false} variant="mobile" />
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="absolute right-3 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-sm text-white/70 hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className={`transition-all duration-200 ${state.sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]'}`}>
        <Navbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
