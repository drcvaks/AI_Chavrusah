create table public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  depth_mode public.learning_depth_mode not null default 'READING',
  context_type text not null default 'OTHER' check (context_type in ('DAF_YOMI','PARSHA','PERSONAL_QUESTION','SHIUR','REVIEW','OTHER')),
  mesechta text, daf text, sefer text, parsha text, topic text,
  started_at timestamptz not null default now(), ended_at timestamptz,
  constraint session_time_order check (ended_at is null or ended_at >= started_at)
);
create index learning_sessions_owner_time on public.learning_sessions(user_id, started_at desc);
alter table public.learning_sessions enable row level security;
revoke all on public.learning_sessions from public, anon, authenticated;
grant select on public.learning_sessions to authenticated;
grant insert (user_id,title,depth_mode,context_type,mesechta,daf,sefer,parsha,topic) on public.learning_sessions to authenticated;
grant update (title,depth_mode,context_type,mesechta,daf,sefer,parsha,topic,ended_at) on public.learning_sessions to authenticated;
grant all on public.learning_sessions to service_role;
create policy sessions_read on public.learning_sessions for select to authenticated using (user_id = (select auth.uid()));
create policy sessions_insert on public.learning_sessions for insert to authenticated with check (user_id = (select auth.uid()));
create policy sessions_update on public.learning_sessions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.learning_sessions(id) on delete cascade,
  speaker text not null check (speaker in ('USER','AI')),
  text text not null, created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index messages_session_time on public.messages(session_id,created_at);
alter table public.messages enable row level security;
revoke all on public.messages from public, anon, authenticated;
grant select on public.messages to authenticated;
grant all on public.messages to service_role;
create policy messages_read on public.messages for select to authenticated using (
  exists (select 1 from public.learning_sessions s where s.id = session_id and s.user_id = (select auth.uid()))
);
-- Transcript writes arrive with a later conversation milestone; clients cannot spoof AI messages.
