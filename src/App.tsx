import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/hooks/use-auth'
import { Layout } from '@/components/Layout'
import { RequireAuth, RequireAdmin } from '@/components/guards'
import { PageLoading } from '@/components/states'
import Home from '@/pages/Home'
import Events from '@/pages/Events'
import EventDetail from '@/pages/EventDetail'
import Archive from '@/pages/Archive'
import StoryDetail from '@/pages/StoryDetail'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'
import AccountLayout from '@/pages/account/AccountLayout'
import Profile from '@/pages/account/Profile'
import MyRegistrations from '@/pages/account/MyRegistrations'
import AdminLayout from '@/pages/admin/AdminLayout'
import NotFound from '@/pages/NotFound'

// Heavy, rarely-visited areas are code-split (recharts, QR generation, admin tables)
const Security = lazy(() => import('@/pages/account/Security'))
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminEvents = lazy(() => import('@/pages/admin/AdminEvents'))
const AdminEventRegistrations = lazy(() => import('@/pages/admin/AdminEventRegistrations'))
const AdminVolunteers = lazy(() => import('@/pages/admin/AdminVolunteers'))
const VolunteerDetail = lazy(() => import('@/pages/admin/VolunteerDetail'))
const AdminStories = lazy(() => import('@/pages/admin/AdminStories'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <div className="grain-overlay" aria-hidden="true" />
      <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route element={<Layout />}>
          {/* Public community area */}
          <Route index element={<Home />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<EventDetail />} />
          <Route path="archive" element={<Archive />} />
          <Route path="archive/:id" element={<StoryDetail />} />

          {/* Authentication */}
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />

          {/* Signed-in volunteer area */}
          <Route element={<RequireAuth />}>
            <Route path="account" element={<AccountLayout />}>
              <Route index element={<Profile />} />
              <Route path="registrations" element={<MyRegistrations />} />
              <Route path="security" element={<Security />} />
            </Route>
          </Route>

          {/* Coordinator admin area (2FA-enforced) */}
          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="events" element={<AdminEvents />} />
              <Route path="events/:id" element={<AdminEventRegistrations />} />
              <Route path="volunteers" element={<AdminVolunteers />} />
              <Route path="volunteers/:id" element={<VolunteerDetail />} />
              <Route path="stories" element={<AdminStories />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </Suspense>
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{ style: { border: '1.5px solid #16120F', borderRadius: 14 } }}
      />
    </AuthProvider>
  )
}
