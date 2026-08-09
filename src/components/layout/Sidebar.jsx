import { NavLink } from 'react-router-dom'
import {
  ArrowLeft,
  LayoutDashboard,
  Layers,
  ScanSearch,
  Shapes,
  TrendingUp,
  Video,
  Film,
  Map,
  BadgeCheck,
  FileOutput,
  Leaf
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard Overview', icon: LayoutDashboard, ready: true },
  { to: '/segmentation', label: 'Segmentation', icon: Layers, ready: true },
  { to: '/detection', label: 'Object Detection', icon: ScanSearch, ready: true },
  { to: '/classification', label: 'Classification', icon: Shapes, ready: true },
  { to: '/regression', label: 'Regression Analysis', icon: TrendingUp, ready: false },
  { to: '/live-camera', label: 'Live Camera', icon: Video, ready: false },
  { to: '/media-processing', label: 'Image and Video Processing', icon: Film, ready: false },
  { to: '/gis-mapping', label: 'GIS Mapping', icon: Map, ready: true },
  { to: '/validation', label: 'Validation', icon: BadgeCheck, ready: false },
  { to: '/reports', label: 'Reports and Export', icon: FileOutput, ready: true }
]

export default function Sidebar({ collapsed, variant = 'desktop' }) {
  const visibility = variant === 'desktop' ? 'hidden lg:flex' : 'flex'
  const stacking = variant === 'desktop' ? 'z-30' : 'z-50'

  return (
    <aside
      className={`fixed inset-y-0 left-0 ${stacking} ${visibility} flex-col bg-sidebar transition-all duration-200 ${
        collapsed ? 'w-[76px]' : 'w-[248px]'
      }`}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
          <Leaf size={17} />
        </span>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">PlasticNet AI</p>
            <p className="text-[11px] text-white/50">Authority Portal</p>
          </div>
        )}
      </div>

      <nav className="scroll-thin flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-sidebar-active text-white font-medium'
                      : 'text-white/65 hover:bg-sidebar-hover hover:text-white'
                  }`
                }
              >
                <item.icon size={17} strokeWidth={1.8} className="shrink-0" />
                {!collapsed && (
                  <span className="flex flex-1 items-center justify-between">
                    <span>{item.label}</span>
                    {!item.ready && (
                      <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/50">
                        Phase 2
                      </span>
                    )}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {!collapsed && (
        <div className="border-t border-white/10 px-5 py-4">
          <NavLink
            to="/"
            className="mb-2 flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white"
          >
            <ArrowLeft size={13} />
            Public site
          </NavLink>
          <p className="text-[11px] leading-relaxed text-white/40">
            Built with NIT Srinagar for Dal Lake conservation monitoring
          </p>
        </div>
      )}
    </aside>
  )
}
