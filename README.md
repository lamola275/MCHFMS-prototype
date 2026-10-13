# MCHFMS — Munsieville Cultural Heritage Foundation Management System

A community web application for the **Munsieville Cultural Heritage Foundation**, a non-profit
arts, culture and heritage organisation in Munsieville, Mogale City (Gauteng, South Africa).
Built from the high-level design in our Task 1 report, it brings three modules — **Events**,
**Volunteers** and the **Heritage Archive** — together behind one coordinator-friendly system.

**Group 17** · Rethabile Rute (ST10467950) · Tlou Prince Lamola (ST10506644) ·
Bogoshi Thato Maphile (ST10122582) · Disema Ramohaladi (ST10529815)

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

## Setup guide

1. **[INSTALLATION-GUIDE.md](INSTALLATION-GUIDE.md)** — install Node.js, the project packages, and run the app (start here if nothing is set up yet).
2. **[SUPABASE-SETUP-GUIDE.md](SUPABASE-SETUP-GUIDE.md)** — create the cloud database, connect it, and set up your admin account. A 15-minute walkthrough with a troubleshooting table.

The short version, once Node.js is installed:

```bash
# 1. Create a Supabase project and run supabase/schema.sql in its SQL Editor
# 2. Copy Project Settings → API → Project URL + anon key, then:
cp .env.example .env        # paste your two values into .env
npm install
npm run dev                 # http://localhost:3000
# 3. Register an account in the app, then in the SQL Editor:
#    update public.profiles set role = 'admin' where email = 'you@example.com';
# 4. Sign out/in, enable 2FA under Account → Security & 2FA → /admin unlocks
```

## Putting it on GitHub & adding the lecturer

```bash
git init
git add .
git commit -m "feat: MCHFMS task 2 application (React + Supabase)"
git branch -M main
git remote add origin https://github.com/<your-user>/mchfms.git
git push -u origin main
```

Then in the GitHub repo: **Settings → Collaborators → Add people** → enter the lecturer's
GitHub username → they receive an invite with read access.

> **Never commit `.env`** — it is git-ignored. The anon key is safe to use in the browser
> (data is protected by Row Level Security), but keep it out of the repo anyway.

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
