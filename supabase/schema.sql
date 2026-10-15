-- ── 1. TABLES ───────────────────────────────────────────────────────────────

-- Volunteer profiles: extends Supabase auth.users 1-to-1.
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null check (char_length(full_name) between 2 and 100),
  email         text not null unique,
  phone         text,
  primary_skill text,
  role          text not null default 'volunteer' check (role in ('volunteer', 'admin')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Events & programmes offered by the Foundation.
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 3 and 150),
  description text not null default '',
  category    text not null default 'Community Programme',
  event_date  date not null,
  start_time  time,
  venue       text not null check (char_length(venue) between 2 and 150),
  capacity    integer not null check (capacity between 1 and 100000),
  image_url   text,
  status      text not null default 'published' check (status in ('draft', 'published', 'cancelled')),
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Junction table: one volunteer registers for one event, once.
create table if not exists public.event_registrations (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  volunteer_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'registered' check (status in ('registered', 'cancelled')),
  created_at   timestamptz not null default now(),
  unique (event_id, volunteer_id) -- no duplicate registrations, enforced in the DB
);

-- The public heritage archive.
create table if not exists public.heritage_stories (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 3 and 200),
  category    text not null default 'Cultural Heritage',
  contributor text,
  content     text not null check (char_length(content) >= 20),
  image_url   text,
  published   boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 2. INDEXES ──────────────────────────────────────────────────────────────

create index if not exists idx_events_date           on public.events (event_date);
create index if not exists idx_events_status         on public.events (status);
create index if not exists idx_registrations_event   on public.event_registrations (event_id);
create index if not exists idx_registrations_vol     on public.event_registrations (volunteer_id);
create index if not exists idx_stories_published     on public.heritage_stories (published, category);

-- ── 3. HELPER FUNCTIONS ─────────────────────────────────────────────────────

-- True when the current signed-in user is an admin. SECURITY DEFINER so the
-- check itself is not blocked by RLS (avoids policy recursion).
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Public, safe registration counter (counts are not sensitive; the rows are).
create or replace function public.event_registration_count(p_event_id uuid)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::integer
  from public.event_registrations
  where event_id = p_event_id and status = 'registered';
$$;

-- Aggregated, anonymous community statistics for the public homepage.
create or replace function public.community_stats()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return json_build_object(
    'upcoming_events', (select count(*) from public.events
                        where status = 'published' and event_date >= current_date),
    'archive_stories', (select count(*) from public.heritage_stories where published),
    'volunteers',      (select count(*) from public.profiles),
    'registrations',   (select count(*) from public.event_registrations)
  );
end;
$$;

-- ── 4. TRIGGERS ─────────────────────────────────────────────────────────────

-- 4a. Create a volunteer profile automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, primary_skill)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Community Member'),
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'primary_skill'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4b. Enforce capacity + event availability at the database level.
--     This is the server-side guarantee for "no overbooking": even a hand-made
--     API call cannot register a volunteer for a full, unpublished or past event.
create or replace function public.check_event_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_status   text;
  v_date     date;
  v_count    integer;
begin
  select capacity, status, event_date
    into v_capacity, v_status, v_date
    from public.events
   where id = new.event_id;

  if v_status is null then
    raise exception 'This event is not open for registration.';
  end if;
  if v_status <> 'published' then
    raise exception 'This event is not open for registration.';
  end if;
  if v_date < current_date then
    raise exception 'This event has already passed.';
  end if;

  select count(*) into v_count
    from public.event_registrations
   where event_id = new.event_id and status = 'registered';

  if v_count >= v_capacity then
    raise exception 'This event is fully booked.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_event_capacity on public.event_registrations;
create trigger trg_check_event_capacity
  before insert on public.event_registrations
  for each row execute function public.check_event_capacity();

-- 4c. Stop privilege escalation: only an existing admin may change roles.
--     (Calls made directly from the SQL Editor / service role carry no JWT and
--     are allowed — that is how the FIRST admin is promoted.)
create or replace function public.guard_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Only an administrator can change user roles.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_role_changes on public.profiles;
create trigger trg_guard_role_changes
  before update on public.profiles
  for each row execute function public.guard_role_changes();

-- 4d. Keep updated_at fresh on editable tables.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_profiles on public.profiles;
create trigger trg_touch_profiles
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_events on public.events;
create trigger trg_touch_events
  before update on public.events
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_stories on public.heritage_stories;
create trigger trg_touch_stories
  before update on public.heritage_stories
  for each row execute function public.touch_updated_at();

-- ── 5. ROW LEVEL SECURITY ───────────────────────────────────────────────────

alter table public.profiles            enable row level security;
alter table public.events              enable row level security;
alter table public.event_registrations enable row level security;
alter table public.heritage_stories    enable row level security;

-- Profiles: users see & edit only themselves; admins see everyone.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Events: drafts are admin-only; published & cancelled are public.
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select using (status <> 'draft' or public.is_admin());

drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert with check (public.is_admin());

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete using (public.is_admin());

-- Registrations: volunteers manage only their own; admins see & manage all.
drop policy if exists registrations_select on public.event_registrations;
create policy registrations_select on public.event_registrations
  for select using (auth.uid() = volunteer_id or public.is_admin());

drop policy if exists registrations_insert on public.event_registrations;
create policy registrations_insert on public.event_registrations
  for insert with check (auth.uid() = volunteer_id);

drop policy if exists registrations_update on public.event_registrations;
create policy registrations_update on public.event_registrations
  for update using (auth.uid() = volunteer_id or public.is_admin())
  with check (auth.uid() = volunteer_id or public.is_admin());

drop policy if exists registrations_delete on public.event_registrations;
create policy registrations_delete on public.event_registrations
  for delete using (auth.uid() = volunteer_id or public.is_admin());

-- Stories: published stories are public; everything else is admin-only.
drop policy if exists stories_select on public.heritage_stories;
create policy stories_select on public.heritage_stories
  for select using (published = true or public.is_admin());

drop policy if exists stories_insert on public.heritage_stories;
create policy stories_insert on public.heritage_stories
  for insert with check (public.is_admin());

drop policy if exists stories_update on public.heritage_stories;
create policy stories_update on public.heritage_stories
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists stories_delete on public.heritage_stories;
create policy stories_delete on public.heritage_stories
  for delete using (public.is_admin());

-- ── 6. FUNCTION PERMISSIONS ─────────────────────────────────────────────────

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

revoke all on function public.event_registration_count(uuid) from public;
grant execute on function public.event_registration_count(uuid) to anon, authenticated;

revoke all on function public.community_stats() from public;
grant execute on function public.community_stats() to anon, authenticated;

-- ── 7. SEED CONTENT ─────────────────────────────────────────────────────────
-- Six events (two already held, four upcoming) and six archive stories so the
-- system is demonstrable the moment it is connected.

insert into public.events (title, description, category, event_date, start_time, venue, capacity, image_url, status) values
(
  '16 June Commemoration 2026',
  'Our annual gathering at the memorial site to honour the Munsieville Four, executed on 16 June 1964. The programme includes a candle-lighting ceremony, wreath laying, praise poetry and short talks by community elders and youth representatives.' || E'\n\n' || 'Volunteers assist with marshalling, the register, catering and guiding guests. Please wear comfortable shoes and bring a hat; the ceremony is outdoors.',
  'Commemoration', '2026-06-16', '09:00', 'Munsieville Four Memorial Site, Munsieville', 200, 'asset:event-commemoration', 'published'
),
(
  'Youth Heritage Dialogue',
  'An afternoon conversation between elders and young people about growing up in Munsieville, the meaning of 16 June, and how heritage can shape career and life choices today.' || E'\n\n' || 'Volunteers help with seating, refreshments and recording key moments for the archive.',
  'Heritage Education', '2026-09-12', '14:00', 'Munsieville Community Hall', 60, 'asset:event-workshop', 'published'
),
(
  'Oral History & Story-Collection Workshop',
  'A practical workshop where volunteers learn how to record, transcribe and archive community memories ethically — then put it into practice by interviewing attending elders in pairs.' || E'\n\n' || 'Bring a phone that can record audio and a notebook. All stories collected (with permission) become part of the digital heritage archive.',
  'Workshop', '2026-11-14', '10:00', 'Munsieville Community Hall', 40, 'asset:event-workshop', 'published'
),
(
  'Year-End Community Clean-Up & Braai',
  'We close the year by caring for the memorial grounds and the streets around them, followed by a shared braai for all volunteers and their families.' || E'\n\n' || 'Gloves, refuse bags and tools are provided. Children are welcome under supervision.',
  'Community Programme', '2026-12-05', '08:00', 'Munsieville Four Memorial Site, Munsieville', 80, 'asset:story-heritage', 'published'
),
(
  'African Cultural Caravan 2027',
  'The Caravan returns! A travelling celebration of African culture — drumming, dance, storytelling, craft markets and food — bringing together artists, cultural practitioners and families from across Mogale City.' || E'\n\n' || 'This is our biggest volunteer day of the year: stage hands, marshals, photographers, registration desk and catering teams are all needed.',
  'Cultural Festival', '2027-04-24', '10:00', 'Munsieville Sports Grounds', 150, 'asset:event-caravan', 'published'
),
(
  '16 June Commemoration 2027',
  'The 63rd anniversary commemoration of the Munsieville Four. A full community programme: dawn candle ceremony at the memorial, a march through the township, and an afternoon of speeches, music and shared food at the community hall.' || E'\n\n' || 'Volunteer briefings take place on the two Saturdays before the event — details are emailed to registered volunteers.',
  'Commemoration', '2027-06-16', '06:00', 'Munsieville Four Memorial Site & Community Hall', 250, 'asset:event-commemoration', 'published'
)
on conflict do nothing;

insert into public.heritage_stories (title, category, contributor, content, image_url, published) values
(
  'Why we gather every 16 June',
  'Munsieville Four',
  'Foundation Coordinators',
  'On 16 June 1964, four men from Munsieville were executed during the apartheid era. Their names are spoken aloud at the memorial every year, because a name spoken is a person remembered.' || E'\n\n' || 'The date is shared with the Soweto uprising anniversary, and that coincidence is not lost on our community: in Munsieville, remembrance of the Four is inseparable from the wider story of young people who stood up against injustice.' || E'\n\n' || 'The Foundation exists so that this memory does not fade with the generation that carries it personally. Every candle lit, every poem recited, every child who learns the names is part of that work.',
  'asset:event-commemoration', true
),
(
  'Growing up in old Munsieville',
  'Community Memory',
  'Gogo M. S.',
  'When I was a girl, everybody knew everybody''s mother. If you were naughty at the corner, the news reached your house before you did!' || E'\n\n' || 'The streets were dust then, and on Sundays the whole township smelled of Sunday lunch. We did not have much, but we had each other — stokvels, burial societies, the church choirs. That is the Munsieville I carry in my heart.' || E'\n\n' || 'I tell these things to my grandchildren so they know: community is not a place, it is a practice.',
  'asset:story-heritage', true
),
(
  'The African Cultural Caravan: drums on the move',
  'Arts & Music',
  'Foundation Coordinators',
  'The African Cultural Caravan is exactly what its name promises: culture that travels. Drummers, dancers, poets, crafters and cooks move together from place to place, turning every stop into a festival.' || E'\n\n' || 'For the Foundation, the Caravan is more than entertainment. It is how heritage stays alive — not behind glass, but in rhythm, in food, in the hands of a child learning a drum pattern from a master.' || E'\n\n' || 'Every edition is documented for the archive: the performers, the songs, the stories told between sets.',
  'asset:event-caravan', true
),
(
  'Keeping our mother tongue alive through story',
  'Cultural Heritage',
  'Ntate T. K.',
  'A language dies first in the stories that are no longer told. When the elders stop telling and the children stop listening, something irreplaceable is gone.' || E'\n\n' || 'That is why our story-collection workshops matter. We record the proverbs, the praise poems, the funny family tales — in the languages they were born in — and we keep them safe where the next generation can find them.' || E'\n\n' || 'If you have a story in your mother tongue, the archive is waiting for it.',
  'asset:event-workshop', true
),
(
  'From mining camp to community: how Munsieville grew',
  'Liberation History',
  'Foundation Coordinators',
  'Munsieville grew alongside the gold mines of the West Rand, shaped by the people who came to work them and the families they raised here. Like many townships, its geography was written by apartheid planning — but its character was written by its people.' || E'\n\n' || 'Stokvels and savings clubs built what the state would not. Churches and shebeens became meeting places, organising places, mourning places. Through forced removals and repression across the region, the community held.' || E'\n\n' || 'Understanding this history is not about living in the past. It is about knowing the strength we inherit.',
  'asset:story-heritage', true
),
(
  'Beadwork, colour and identity',
  'Cultural Heritage',
  'Mme R. D.',
  'Every colour in our beadwork speaks. Red for the blood and the struggle, white for purity and hope, green for the land that feeds us. When I bead, I am writing a letter without words.' || E'\n\n' || 'I learned from my mother, who learned from hers. Now the young ones at the Caravan workshops learn from me. The patterns change with each generation — and that is right. Tradition is not a cage; it is a root.',
  'asset:story-culture', true
)
on conflict do nothing;
