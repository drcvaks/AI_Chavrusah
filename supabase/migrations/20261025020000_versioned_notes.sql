create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  author_thesis text not null check (char_length(btrim(author_thesis)) > 0),
  author_display_name text not null,
  current_version_id uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index notes_owner_updated on public.notes(owner_user_id,updated_at desc);
create table public.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  title_snapshot text not null,
  body text not null, summary text not null default '',
  author_thesis_snapshot text not null,
  created_by uuid not null references public.profiles(id),
  author_display_name text not null,
  created_at timestamptz not null default now(),
  change_reason text not null check (char_length(btrim(change_reason)) > 0),
  parent_version_id uuid,
  unique (note_id,version_number), unique (note_id,id),
  foreign key (note_id,parent_version_id) references public.note_versions(note_id,id)
);
alter table public.notes add constraint current_version_same_note
  foreign key (id,current_version_id) references public.note_versions(note_id,id) deferrable initially deferred;
create table public.note_sessions (
  note_id uuid not null references public.notes(id) on delete cascade,
  session_id uuid not null references public.learning_sessions(id) on delete cascade,
  primary key (note_id,session_id)
);
create index note_sessions_session on public.note_sessions(session_id);

alter table public.notes enable row level security;
alter table public.note_versions enable row level security;
alter table public.note_sessions enable row level security;
revoke all on public.notes, public.note_versions, public.note_sessions from public, anon, authenticated;
grant select on public.notes, public.note_versions, public.note_sessions to authenticated;
grant all on public.notes, public.note_versions, public.note_sessions to service_role;
create policy notes_read on public.notes for select to authenticated using (owner_user_id = (select auth.uid()));
create policy versions_read on public.note_versions for select to authenticated using (
  exists (select 1 from public.notes n where n.id = note_id and n.owner_user_id = (select auth.uid()))
);
create policy note_sessions_read on public.note_sessions for select to authenticated using (
  exists (select 1 from public.notes n where n.id = note_id and n.owner_user_id = (select auth.uid()))
  and exists (select 1 from public.learning_sessions s where s.id = session_id and s.user_id = (select auth.uid()))
);
-- All note writes use the checked transaction functions introduced in the next migration.
