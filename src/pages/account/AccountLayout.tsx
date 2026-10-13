import { NavLink, Outlet } from 'react-router'
import { UserRound, CalendarCheck2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

const TABS = [
  { to: '/account', label: 'My profile', icon: UserRound, end: true },
  { to: '/account/registrations', label: 'My registrations', icon: CalendarCheck2, end: false },
  { to: '/account/security', label: 'Security & 2FA', icon: ShieldCheck, end: false },
]

export default function AccountLayout() {
  const { profile } = useAuth()

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <header>
        <p className="label-caps text-clay">Your account</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Sawubona{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>
      </header>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Account sections">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => `pill !py-2 !text-xs ${isActive ? 'pill-active' : ''}`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  )
}
