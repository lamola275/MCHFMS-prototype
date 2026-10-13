# Supabase Setup Guide — MCHFMS

This guide takes you from zero to a fully working system: a cloud-hosted Supabase
Postgres database connected to the app, your first admin account, and two-factor
authentication enabled. Total time: **±15 minutes**.

You will need: an email address and a web browser. Everything here is free.

---

## Step 1 · Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (GitHub login works).
2. Click **New project**.
3. Fill in:
   - **Name**: `mchfms` (anything works)
   - **Database password**: generate a strong one and **save it somewhere safe** —
     you rarely need it, but keep it.
   - **Region**: pick the closest to you (e.g. `eu-west-1` for South Africa).
4. Click **Create new project** and wait ±2 minutes for provisioning.

## Step 2 · Create the database (tables, security, seed content)

1. In the left sidebar, open **SQL Editor** → click **New query**.
2. Open the file [`supabase/schema.sql`](supabase/schema.sql) in this repository,
   select **all of it**, copy, and paste it into the query box.
3. Click **Run** (bottom right). You should see "Success. No rows returned".

This one script creates:

- the 4 tables from the Task 1 ERD — `profiles` (Volunteer), `events` (Event),
  `event_registrations` (EventRegistration), `heritage_stories` (HeritageStory)
- **Row Level Security** policies on every table
- **Triggers**: auto-create a profile on sign-up, block over-capacity / duplicate /
  past-event registrations, block role self-promotion, maintain `updated_at`
- helper functions (`community_stats`, `event_registration_count`, `is_admin`)
- **seed content**: 6 events (including the 16 June Commemoration and the African
  Cultural Caravan) and 6 heritage stories

**Check it worked**: open **Table Editor** in the sidebar — you should see the four
tables, and `events` / `heritage_stories` should contain the seed rows.

## Step 3 · Get your API credentials

1. Go to **Project Settings** (gear icon, bottom of sidebar) → **API**.
2. Copy these two values:
   - **Project URL** — looks like `https://abcdefghijkl.supabase.co`
   - **anon public** key (under "Project API keys") — a long token starting with `eyJ…`

> The **anon** key is the correct one — never use the `service_role` key in the app.
> The anon key is safe in the browser because Row Level Security protects the data.

## Step 4 · Connect the app

**Running locally (development):**

```bash
cp .env.example .env
```

Open the new `.env` file and paste in your values:

```
VITE_SUPABASE_URL=https://abcdefghijkl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ…your-anon-key…
```

Then (re)start the dev server — env vars are read at startup:

```bash
npm run dev
```

**Deploying to a static host:** set the same two variables in the host's
environment settings, then run `npm run build` and publish the `dist/` folder.

**Check it worked:** the homepage loads with real events, archive stories and
statistics. (If the database is not configured, the site still opens, but data
sections show a small "database is not connected" notice — that's your cue to fix
the `.env`.)

## Step 5 · Make sign-ups instant (recommended for demos)

By default Supabase emails every new user a confirmation link — slow in a demo.

1. Go to **Authentication → Sign In / Providers → Email**.
2. Turn **Confirm email** **off** → Save.

(For a real production deployment, turn it back on.)

## Step 6 · Create your admin (coordinator) account

1. In the app, click **Join as a volunteer** and register with your own email.
2. Back in Supabase, open **SQL Editor** and run (with your email):

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

3. Sign out of the app and sign back in.
4. You'll be redirected to **Account → Security & 2FA**: click **Set up two-factor
   authentication**, scan the QR code with Google/Microsoft Authenticator (or any
   TOTP app), and enter the 6-digit code.
5. The admin dashboard now unlocks at **/admin**. From now on, signing in asks for
   your authenticator code after your password.

To add more coordinators later: they register normally, then you promote them from
**Admin → Volunteers → View → Make coordinator** (no SQL needed).

## Step 7 · Verify the system end-to-end

| Test | Where | Expected |
| --- | --- | --- |
| Register a volunteer account | /register | Lands on homepage, signed in |
| RSVP to an event | /events → event → Register | Success toast, seat count drops |
| RSVP to the same event again | same event | Rejected: "already registered" |
| Create an event as admin | /admin → Events → New event | Appears on public events page |
| Publish a story | /admin → Heritage archive | Appears in public /archive |
| Sign out, sign in with 2FA | /login | Asks for authenticator code |

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "The database is not connected yet" notice | `.env` missing/wrong, or dev server not restarted after editing it |
| `relation "public.events" does not exist` | Step 2 wasn't run — execute `supabase/schema.sql` in the SQL Editor |
| "Invalid API key" | You copied the wrong key — use **anon public**, not `service_role` |
| "You do not have permission…" | You're not signed in, or your account isn't admin (Step 6) |
| Stuck at "Coordinators only" | Run the `update … role = 'admin'` SQL again with the exact email, then sign out and in |
| Locked out by 2FA | In the SQL Editor: `delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'you@example.com');` then sign in and re-enrol |
| Reset emails arrive but link fails | Add your app URL under **Authentication → URL Configuration → Redirect URLs** |
