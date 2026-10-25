create table public.note_facets (
  note_id uuid not null references public.notes(id) on delete cascade,
  facet_type text not null check (facet_type in ('DOMAIN','CORPUS','CONTEXT','TOPIC')),
  facet_value text not null check (char_length(btrim(facet_value)) between 1 and 100),
  primary key (note_id,facet_type,facet_value)
);
create index note_facets_lookup on public.note_facets(facet_type,facet_value);
create table public.note_anchor_sources (
  note_id uuid not null references public.notes(id) on delete cascade,
  rank integer not null check (rank between 1 and 5),
  reference_label text not null check (char_length(btrim(reference_label)) between 1 and 300),
  why_central text not null default '',
  verification_status text not null default 'UNVERIFIED' check (verification_status = 'UNVERIFIED'),
  primary key (note_id,rank)
);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.learning_sessions(id) on delete set null,
  note_id uuid references public.notes(id) on delete set null,
  question_text text not null,
  status text not null default 'OPEN' check (status in ('OPEN','DEFERRED','RESOLVED')),
  created_at timestamptz not null default now()
);
create index questions_owner on public.questions(owner_user_id);
alter table public.note_facets enable row level security;
alter table public.note_anchor_sources enable row level security;
alter table public.questions enable row level security;
revoke all on public.note_facets,public.note_anchor_sources,public.questions from public,anon,authenticated;
grant select on public.note_facets,public.note_anchor_sources,public.questions to authenticated;
grant all on public.note_facets,public.note_anchor_sources,public.questions to service_role;
create policy facets_read on public.note_facets for select to authenticated using (
  exists (select 1 from public.notes n where n.id = note_id and n.owner_user_id = (select auth.uid()))
);
create policy anchors_read on public.note_anchor_sources for select to authenticated using (
  exists (select 1 from public.notes n where n.id = note_id and n.owner_user_id = (select auth.uid()))
);
create policy questions_read on public.questions for select to authenticated using (owner_user_id = (select auth.uid()));
-- The question inbox is future UI; no unvalidated client writes or cross-owner links are enabled.

create function public.save_learning_note(
  p_note_id uuid, p_expected_version_id uuid, p_title text, p_author_thesis text,
  p_body text, p_summary text, p_change_reason text, p_session_ids uuid[], p_facets jsonb, p_anchors jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); target uuid; previous uuid; version_id uuid := gen_random_uuid();
  version_no integer; author_name text;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select display_name into strict author_name from public.profiles where id = actor;
  if nullif(btrim(p_title),'') is null or char_length(btrim(p_title)) > 200
    or nullif(btrim(p_author_thesis),'') is null or p_body is null
    or p_summary is null or nullif(btrim(p_change_reason),'') is null then
    raise exception 'Title, author thesis, body, summary and change reason are required' using errcode = '22023';
  end if;
  if p_facets is null or jsonb_typeof(p_facets) <> 'array' or p_anchors is null or jsonb_typeof(p_anchors) <> 'array' then
    raise exception 'Facets and anchors must be arrays' using errcode = '22023';
  end if;
  if jsonb_array_length(p_anchors) > 5 then
    raise exception 'A note may have at most five anchor references' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(coalesce(p_session_ids,'{}'::uuid[])) sid
    where not exists (select 1 from public.learning_sessions s where s.id = sid and s.user_id = actor)) then
    raise exception 'A linked learning session is unavailable' using errcode = '42501';
  end if;
  if p_note_id is null then
    if p_expected_version_id is not null then raise exception 'New note cannot have a parent version' using errcode = '22023'; end if;
    target := gen_random_uuid(); previous := null; version_no := 1;
    insert into public.notes (id,owner_user_id,title,author_thesis,author_display_name,current_version_id)
      values (target,actor,btrim(p_title),btrim(p_author_thesis),author_name,version_id);
  else
    select id,current_version_id into target,previous from public.notes
      where id = p_note_id and owner_user_id = actor for update;
    if not found then raise exception 'Note unavailable' using errcode = '42501'; end if;
    if previous is distinct from p_expected_version_id then
      raise exception 'This note has changed. Reload it before saving your draft.' using errcode = '40001';
    end if;
    select version_number + 1 into strict version_no from public.note_versions where id = previous;
  end if;
  insert into public.note_versions (id,note_id,version_number,title_snapshot,body,summary,author_thesis_snapshot,created_by,author_display_name,change_reason,parent_version_id)
    values (version_id,target,version_no,btrim(p_title),p_body,p_summary,btrim(p_author_thesis),actor,author_name,btrim(p_change_reason),previous);
  update public.notes set title = btrim(p_title), author_thesis = btrim(p_author_thesis), current_version_id = version_id, updated_at = now() where id = target;
  delete from public.note_sessions where note_id = target;
  insert into public.note_sessions select target,sid from (select distinct unnest(coalesce(p_session_ids,'{}'::uuid[])) sid) s;
  delete from public.note_facets where note_id = target;
  insert into public.note_facets (note_id,facet_type,facet_value)
    select distinct target,item ->> 'facet_type',btrim(item ->> 'facet_value') from jsonb_array_elements(p_facets) item;
  delete from public.note_anchor_sources where note_id = target;
  insert into public.note_anchor_sources (note_id,rank,reference_label,why_central)
    select target,ordinality::integer,btrim(item ->> 'reference_label'),coalesce(item ->> 'why_central','')
      from jsonb_array_elements(p_anchors) with ordinality a(item,ordinality);
  return target;
end;
$$;
revoke all on function public.save_learning_note(uuid,uuid,text,text,text,text,text,uuid[],jsonb,jsonb) from public,anon;
grant execute on function public.save_learning_note(uuid,uuid,text,text,text,text,text,uuid[],jsonb,jsonb) to authenticated;

create function public.restore_learning_note(p_note_id uuid,p_version_id uuid,p_expected_version_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); current_id uuid; source public.note_versions; new_id uuid := gen_random_uuid();
  author_name text; next_no integer;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select current_version_id into current_id from public.notes where id = p_note_id and owner_user_id = actor for update;
  if not found then raise exception 'Note unavailable' using errcode = '42501'; end if;
  if current_id is distinct from p_expected_version_id then
    raise exception 'This note has changed. Reload it before restoring.' using errcode = '40001';
  end if;
  select * into source from public.note_versions where id = p_version_id and note_id = p_note_id;
  if not found then raise exception 'Version unavailable' using errcode = '22023'; end if;
  select display_name into strict author_name from public.profiles where id = actor;
  select version_number + 1 into strict next_no from public.note_versions where id = current_id;
  insert into public.note_versions (id,note_id,version_number,title_snapshot,body,summary,author_thesis_snapshot,created_by,author_display_name,change_reason,parent_version_id)
    values (new_id,p_note_id,next_no,source.title_snapshot,source.body,source.summary,source.author_thesis_snapshot,actor,author_name,'Restored version ' || source.version_number,current_id);
  update public.notes set title = source.title_snapshot,author_thesis = source.author_thesis_snapshot,current_version_id = new_id,updated_at = now() where id = p_note_id;
  return new_id;
end;
$$;
revoke all on function public.restore_learning_note(uuid,uuid,uuid) from public,anon;
grant execute on function public.restore_learning_note(uuid,uuid,uuid) to authenticated;
