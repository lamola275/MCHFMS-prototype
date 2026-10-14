import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Mail, Phone, Wrench, ShieldCheck, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { Profile, Registration } from '@/lib/types'
import { friendlyError } from '@/lib/errors'
import { formatDateLong, formatDateShort, formatDateTime } from '@/lib/format'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageLoading, ErrorState, EmptyState } from '@/components/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function VolunteerDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) {
      setError('Missing volunteer id.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [pRes, rRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('event_registrations')
          .select('*, events(title, event_date, venue)')
          .eq('volunteer_id', id)
          .order('created_at', { ascending: false }),
      ])
      if (pRes.error) throw pRes.error
      if (rRes.error) throw rRes.error
      if (!pRes.data) {
        setError('This volunteer could not be found.')
        return
      }
      setProfile(pRes.data as Profile)
      setRegistrations((rRes.data ?? []) as Registration[])
    } catch (err) {
      setError(friendlyError(err, 'We could not load this volunteer.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const toggleRole = async () => {
    if (!profile) return
    const newRole = profile.role === 'admin' ? 'volunteer' : 'admin'
    try {
      const { error: uErr } = await supabase.from('profiles').update({ role: newRole }).eq('id', profile.id)
      if (uErr) throw uErr
      toast.success(
        newRole === 'admin'
          ? `${profile.full_name} is now a coordinator (admin).`
          : `${profile.full_name} is no longer an admin.`,
      )
      await load()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not change the role.'))
    }
  }

  if (loading) return <PageLoading label="Loading volunteer…" />
  if (error || !profile) return <ErrorState title="Volunteer unavailable" body={error} onRetry={() => void load()} />

  const isSelf = user?.id === profile.id

  return (
    <div className="space-y-6">
      <Link to="/admin/volunteers" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/60 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All volunteers
      </Link>

      <div className="frame flex flex-wrap items-start justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-ink bg-clay font-display text-xl font-semibold text-cream">
              {profile.full_name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold">{profile.full_name}</h2>
              <p className="text-xs uppercase tracking-[0.14em] text-ink/50">
                {profile.role === 'admin' ? 'Coordinator (admin)' : 'Volunteer'} · joined {formatDateLong(profile.created_at.slice(0, 10))}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/70">
            <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-clay" /> {profile.email}</span>
            <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-clay" /> {profile.phone || 'No phone on record'}</span>
            <span className="flex items-center gap-2"><Wrench className="h-4 w-4 text-clay" /> {profile.primary_skill || 'No skill listed'}</span>
          </div>
        </div>

        {!isSelf ? (
          <ConfirmDialog
            trigger={
              <button className={`${profile.role === 'admin' ? 'btn-ghost-ink' : 'btn-ink'} !px-4 !py-2 !text-xs`}>
                {profile.role === 'admin' ? (
                  <><ShieldOff className="h-3.5 w-3.5" /> Revoke admin</>
                ) : (
                  <><ShieldCheck className="h-3.5 w-3.5" /> Make coordinator</>
                )}
              </button>
            }
            title={profile.role === 'admin' ? `Revoke admin rights from ${profile.full_name}?` : `Make ${profile.full_name} a coordinator?`}
            description={
              profile.role === 'admin'
                ? 'They will lose access to this dashboard immediately. They will need to re-enable 2FA if promoted again.'
                : 'They will be able to manage events, volunteers and the archive. They must set up two-factor authentication before the dashboard unlocks.'
            }
            confirmLabel={profile.role === 'admin' ? 'Revoke admin' : 'Make coordinator'}
            destructive={profile.role === 'admin'}
            onConfirm={toggleRole}
          />
        ) : (
          <span className="pill pill-static">This is you</span>
        )}
      </div>

      <section>
        <h3 className="font-display text-xl font-semibold">Participation history</h3>
        {registrations.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No event history" body="This volunteer has not registered for any events yet." />
          </div>
        ) : (
          <div className="frame mt-4 overflow-hidden p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-[1.5px] border-ink bg-tan/50 hover:bg-tan/50">
                    <TableHead className="font-bold text-ink">Event</TableHead>
                    <TableHead className="font-bold text-ink">Event date</TableHead>
                    <TableHead className="font-bold text-ink">Venue</TableHead>
                    <TableHead className="font-bold text-ink">Registered on</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.map((r) => (
                    <TableRow key={r.id} className="border-b border-ink/10">
                      <TableCell>
                        {r.events ? (
                          <Link to={`/events/${r.event_id}`} className="font-semibold hover:underline">
                            {r.events.title}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {r.events ? formatDateShort(r.events.event_date) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{r.events?.venue ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatDateTime(r.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
