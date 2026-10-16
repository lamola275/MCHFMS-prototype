# MCHFMS — Munsieville Cultural Heritage Foundation Management System

A community web application for the Munsieville Cultural Heritage Foundation, a non-profit
arts, culture and heritage organisation in Munsieville, Mogale City (Gauteng, South Africa).
Built from the high-level design in our Task 1 report, it brings three modules — **Events**,
**Volunteers** and the **Heritage Archive** — together behind one coordinator-friendly system.

---

## Features

### Community (frontend)
- Browse, search and filter upcoming **events & programmes** with live seat availability
- **Register (RSVP)** as a volunteer for an event in two taps; cancel any time
- Personal dashboard: profile (contact details + primary skill) and full **registration history**
- Public, searchable **heritage archive** of stories about the Munsieville Four and local history
- Fully responsive + installable as a **PWA** on desktop and mobile (Add to Home Screen)

### Coordinators (admin backend)
- **Dashboard**: upcoming events, volunteers, stories and registrations at a glance, with charts
- **Events**: create / edit / cancel / delete, per-event registrant lists with **CSV export**
- **Volunteers**: directory, participation history, promote/revoke admin roles, **CSV export**
- **Heritage archive**: publish / edit / unpublish / delete stories
- Admin accounts are **required to enable two-factor authentication** before the dashboard unlocks

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite, Tailwind CSS, shadcn/ui |
| Cloud database | **Supabase** (hosted Postgres) with Row Level Security |
| Auth | Supabase Auth (email + password) with **TOTP two-factor** (Google/Microsoft Authenticator) |
| Hosting | Any static host — the app talks to Supabase directly |
| PWA | Web app manifest + service worker (offline app shell) |

## How the Task 2 requirements are met

| Requirement | Implementation |
| --- | --- |
| Cloud-based database | Supabase hosted Postgres — schema in `supabase/schema.sql` |
| Admin backend + user frontend | Public site + `/admin` coordinator dashboard guarded by role |
| Authentication | Supabase Auth email/password; sessions managed by the client SDK |
| Two-factor authentication | TOTP authenticator-app codes (enrol under Account → Security & 2FA), enforced for admins |
| SQL-injection mitigation | All data access via the Supabase client (parameterised PostgREST calls); zero string-built SQL |
| Data integrity | Unique constraint blocks duplicate registrations; a database trigger enforces capacity & event status server-side; check constraints validate lengths/ranges; a trigger blocks role self-promotion |
| Row-level security | Every table has RLS policies — users only ever see/edit their own data; public sees only published content |
| Error handling | Validated forms with inline messages (zod), friendly mapped server errors, toast feedback, empty/loading/error states on every screen, React error boundary, 404 page |
| Desktop + mobile | Responsive design + installable PWA |
| GitHub | This repository — small, frequent conventional commits |

## Putting it on GitHub

```bash
git init
git add .
git commit -m "feat: MCHFMS task 2 application (React + Supabase)"
git branch -M main
git remote add origin https://github.com/<your-user>/mchfms.git
git push -u origin main
```
## Project structure

```
├── supabase/schema.sql       # Database: tables, RLS, triggers, functions, seed data
├── public/                   # PWA manifest, service worker, icons
├── src/
│   ├── lib/                  # Supabase client, types, validation, error mapping, helpers
│   ├── hooks/use-auth.tsx    # Auth context (session, profile, admin flag)
│   ├── components/           # Layout, cards, guards, dialogs, states, setup screen
│   └── pages/
│       ├── …                 # Public: home, events, event detail, archive, story
│       ├── auth/             # Login (with 2FA step), register, password reset
│       ├── account/          # Profile, my registrations, security & 2FA
│       └── admin/            # Dashboard, events, registrants, volunteers, stories
```

## Testing the key rules

| Check | Expected result |
| --- | --- |
| Register for an event, then register again | Second attempt rejected: “already registered” (DB unique constraint) |
| Fill an event to capacity, register once more | Rejected: “fully booked” (DB trigger — even direct API calls are blocked) |
| Register for a past or draft event | Rejected by the same trigger |
| Sign up, try to read another user's registrations | Blocked by Row Level Security |
| Non-admin opens `/admin` | “Coordinators only” screen; API writes are rejected by RLS regardless |
| Admin without 2FA opens `/admin` | Redirected to Security page until an authenticator is enrolled |
