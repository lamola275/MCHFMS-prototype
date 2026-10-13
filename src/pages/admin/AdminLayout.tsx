import { NavLink, Outlet, Link } from 'react-router'
import { LayoutDashboard, CalendarDays, Users, BookOpen, ArrowLeft } from 'lucide-react'

const SECTIONS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/events', label: 'Events', icon: CalendarDays, end: false },
  { to: '/admin/volunteers', label: 'Volunteers', icon: Users, end: false },
  { to: '/admin/stories', label: 'Heritage archive', icon: BookOpen, end: false },
]

export default function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label-caps text-clay">Coordinator area</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Admin dashboard</h1>
        </div>
        <Link to="/" className="btn-ghost-ink !px-4 !py-2 !text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to the site
        </Link>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Admin sections">
        {SECTIONS.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.end}
            className={({ isActive }) => `pill !py-2 !text-xs ${isActive ? 'pill-active' : ''}`}
          >
            <s.icon className="h-3.5 w-3.5" /> {s.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  )
}
