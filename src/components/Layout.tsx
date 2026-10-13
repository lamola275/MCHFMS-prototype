import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { Menu, X, UserRound, CalendarCheck2, ShieldCheck, LogOut, LayoutDashboard } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BrandLockup, BrandMark } from '@/components/Brand'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/events', label: 'Events & Programmes' },
  { to: '/archive', label: 'Heritage Archive' },
]

function Header() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('You have been signed out.')
      navigate('/')
    } catch {
      toast.error('Could not sign out. Please try again.')
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b-[1.5px] border-ink bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="Munsieville Heritage home">
          <BrandLockup />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-ink text-cream' : 'text-ink hover:bg-ink/8'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-white py-1.5 pl-2 pr-3.5 text-sm font-semibold transition-colors hover:bg-ink hover:text-cream">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-clay text-cream">
                  <UserRound className="h-4 w-4" />
                </span>
                <span className="max-w-[110px] truncate">{profile?.full_name?.split(' ')[0] ?? 'Account'}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 border-[1.5px] border-ink">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-semibold">{profile?.full_name ?? 'Community member'}</span>
                  <span className="block truncate text-xs text-ink/55">{profile?.email ?? user.email}</span>
                  {isAdmin && <span className="pill pill-static mt-2 !px-2 !py-0.5 !text-[9px]">Administrator</span>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/account/registrations')} className="cursor-pointer gap-2">
                  <CalendarCheck2 className="h-4 w-4" /> My registrations
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/account')} className="cursor-pointer gap-2">
                  <UserRound className="h-4 w-4" /> My profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/account/security')} className="cursor-pointer gap-2">
                  <ShieldCheck className="h-4 w-4" /> Security & 2FA
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate('/admin')} className="cursor-pointer gap-2 font-semibold text-clay">
                      <LayoutDashboard className="h-4 w-4" /> Admin dashboard
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void handleSignOut()} className="cursor-pointer gap-2">
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login" className="btn-ghost-ink hidden !px-4 !py-2 sm:inline-flex">
                Sign in
              </Link>
              <Link to="/register" className="btn-clay hidden !px-4 !py-2 sm:inline-flex">
                Join as a volunteer
              </Link>
            </>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="rounded-full border-[1.5px] border-ink p-2 md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] border-l-[1.5px] border-ink bg-cream p-0">
              <div className="flex items-center justify-between border-b-[1.5px] border-ink px-5 py-4">
                <BrandMark className="h-8 w-8 text-clay" />
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-full border-[1.5px] border-ink p-1.5">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 p-4" aria-label="Mobile">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `rounded-xl border-[1.5px] px-4 py-3 text-sm font-semibold ${
                        isActive ? 'border-ink bg-ink text-cream' : 'border-transparent hover:border-ink'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
                {user && isAdmin && (
                  <NavLink
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border-[1.5px] border-clay px-4 py-3 text-sm font-semibold text-clay"
                  >
                    Admin dashboard
                  </NavLink>
                )}
                {!user && (
                  <div className="mt-3 flex flex-col gap-2">
                    <Link to="/login" onClick={() => setOpen(false)} className="btn-ghost-ink w-full">
                      Sign in
                    </Link>
                    <Link to="/register" onClick={() => setOpen(false)} className="btn-clay w-full">
                      Join as a volunteer
                    </Link>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="bg-charcoal text-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <BrandLockup dark />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream/65">
            Preserving and promoting the legacy of the Munsieville Four and Munsieville's liberation heritage through
            arts, culture and community programmes in Mogale City, Gauteng.
          </p>
          <p className="mt-4 font-display text-lg italic text-tan">“Their memory is our mandate.”</p>
        </div>
        <div>
          <p className="label-caps text-cream/50">Explore</p>
          <ul className="mt-4 space-y-2.5 text-sm font-medium">
            <li><Link className="link-dotted" to="/events">Events & programmes</Link></li>
            <li><Link className="link-dotted" to="/archive">Heritage archive</Link></li>
            <li><Link className="link-dotted" to="/register">Become a volunteer</Link></li>
            <li><Link className="link-dotted" to="/login">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-caps text-cream/50">Commemoration</p>
          <ul className="mt-4 space-y-2.5 text-sm font-medium text-cream/80">
            <li>16 June — Annual commemoration</li>
            <li>African Cultural Caravan</li>
            <li>Oral history & heritage workshops</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-[11px] uppercase tracking-[0.16em] text-cream/45 sm:flex-row sm:px-6">
          <span>Munsieville Cultural Heritage Foundation · MCHFMS</span>
          <span>Group 17 · Work-Integrated Learning Project</span>
        </div>
      </div>
    </footer>
  )
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
