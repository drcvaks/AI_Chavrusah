alter table private.source_catalog enable row level security;
alter table private.source_policy_clock enable row level security;

create table public.source_hits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.learning_sessions(id) on delete cascade,
  source_key text not null, provider text not null, canonical_ref text not null,
  title text not null, he_title text, categories text[] not null, work_key text not null,
  author_keys text[] not null, version_key text not null, version_title text not null,
  language text not null, retrieved_text text not null, is_mock boolean not null,
  policy_rule_id uuid not null references public.source_policy_rules(id),
  policy_decision text not null check(policy_decision in ('APPROVED','ON_REQUEST_AUTHORIZED')),
  authorization_id uuid references public.source_authorizations(id) on delete set null,
  policy_snapshot jsonb not null, retrieved_at timestamptz not null default now(),
  provenance_metadata jsonb not null
);
create index source_hits_owner_session on public.source_hits(user_id,session_id,retrieved_at desc);
alter table public.source_hits enable row level security;
revoke all on public.source_hits from public,anon,authenticated;
grant all on public.source_hits to service_role;
grant select(id,user_id) on public.source_hits to authenticated;
create policy own_source_hit_ids on public.source_hits for select to authenticated using(user_id = (select auth.uid()));
-- Only ownership IDs support citation-link RLS; no client column grant exposes text.

alter table public.note_anchor_sources add column source_hit_id uuid references public.source_hits(id) on delete set null;
create table public.note_sources (
  note_version_id uuid not null references public.note_versions(id) on delete cascade,
  source_hit_id uuid not null references public.source_hits(id) on delete cascade,
  usage_type text not null default 'BACKGROUND', claim_locator text,
  primary key(note_version_id,source_hit_id)
);
create index note_sources_hit on public.note_sources(source_hit_id);
alter table public.note_sources enable row level security;
revoke all on public.note_sources from public,anon,authenticated;
grant select on public.note_sources to authenticated;
grant all on public.note_sources to service_role;
create policy own_note_source_links on public.note_sources for select to authenticated using (
  exists(select 1 from public.note_versions v join public.notes n on n.id = v.note_id where v.id = note_version_id and n.owner_user_id = (select auth.uid()))
  and exists(select 1 from public.source_hits h where h.id = source_hit_id and h.user_id = (select auth.uid()))
);
-- Linking verified evidence to notes is a later feature, not an unvalidated client write.

create function public.source_gateway_descriptor(p_actor uuid,p_source_key text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('source_key',c.source_key,'provider',c.provider,'canonical_ref',c.canonical_ref,'title',c.title,
    'category_keys',c.category_keys,'work_key',c.work_key,'author_keys',c.author_keys,'version_key',c.version_key,
    'version_title',c.version_title,'language',c.language,'is_mock',c.is_mock) from private.source_catalog c
  where c.source_key = p_source_key and (c.test_owner_id is null or c.test_owner_id = p_actor);
$$;
create function public.source_gateway_mock_text(p_actor uuid,p_source_key text) returns text
language sql stable security definer set search_path = '' as $$
  select retrieved_text from private.source_catalog where source_key = p_source_key and provider = 'mock' and is_mock
    and (test_owner_id is null or test_owner_id = p_actor);
$$;
create function public.source_gateway_decide(p_actor uuid,p_session_id uuid,p_source_key text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select private.evaluate_source(p_actor,p_session_id,p_source_key);
$$;
create function public.source_gateway_catalog(p_actor uuid,p_session_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.learning_sessions where id = p_session_id and user_id = p_actor) then
    raise exception 'Learning session unavailable' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(public.source_gateway_descriptor(p_actor,c.source_key) || jsonb_build_object('decision',private.evaluate_source(p_actor,p_session_id,c.source_key)) order by c.source_key)
    from private.source_catalog c where c.test_owner_id is null or c.test_owner_id = p_actor),'[]'::jsonb);
end;
$$;

create function public.source_gateway_publish(p_actor uuid,p_session_id uuid,p_source_key text,p_text text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare decision jsonb; source private.source_catalog; saved public.source_hits;
begin
  -- Serialize publication with policy changes, grants and revocations.
  perform 1 from private.source_policy_clock where singleton for share;
  perform 1 from public.learning_sessions where id = p_session_id and user_id = p_actor for share;
  if not found then raise exception 'Learning session unavailable' using errcode = '42501'; end if;
  decision := private.evaluate_source(p_actor,p_session_id,p_source_key);
  if coalesce((decision ->> 'allowed')::boolean,false) is not true then
    raise exception 'Source blocked by current policy or permission' using errcode = 'PT403';
  end if;
  select * into strict source from private.source_catalog where source_key = p_source_key;
  if source.provider <> 'mock' or not source.is_mock or p_text is distinct from source.retrieved_text then
    raise exception 'Provider text does not match the retrieved mock fixture' using errcode = '22023';
  end if;
  insert into public.source_hits(user_id,session_id,source_key,provider,canonical_ref,title,categories,work_key,author_keys,version_key,version_title,language,retrieved_text,is_mock,
    policy_rule_id,policy_decision,authorization_id,policy_snapshot,provenance_metadata)
  values(p_actor,p_session_id,p_source_key,source.provider,source.canonical_ref,source.title,source.category_keys,source.work_key,source.author_keys,source.version_key,source.version_title,source.language,p_text,true,
    (decision ->> 'rule_id')::uuid,case when decision ->> 'state' = 'APPROVED' then 'APPROVED' else 'ON_REQUEST_AUTHORIZED' end,
    (decision ->> 'authorization_id')::uuid,decision,jsonb_build_object('provider','mock','synthetic',true,'warning','Synthetic fixture; not Torah text','source_key',p_source_key))
  returning * into saved;
  return to_jsonb(saved);
end;
$$;

create function public.source_gateway_open(p_actor uuid,p_hit_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare hit public.source_hits; decision jsonb;
begin
  perform 1 from private.source_policy_clock where singleton for share;
  select * into hit from public.source_hits where id = p_hit_id and user_id = p_actor;
  if not found then raise exception 'Source record unavailable' using errcode = '42501'; end if;
  perform 1 from public.learning_sessions where id = hit.session_id and user_id = p_actor for share;
  decision := private.evaluate_source(p_actor,hit.session_id,hit.source_key);
  if coalesce((decision ->> 'allowed')::boolean,false) is not true then
    raise exception 'Saved source blocked by current policy or permission' using errcode = 'PT403';
  end if;
  return to_jsonb(hit) || jsonb_build_object('current_access',decision);
end;
$$;
create function public.source_gateway_history(p_actor uuid,p_session_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.learning_sessions where id = p_session_id and user_id = p_actor) then
    raise exception 'Learning session unavailable' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'title',h.title,'canonical_ref',h.canonical_ref,'retrieved_at',h.retrieved_at,'is_mock',h.is_mock,
    'policy_decision',h.policy_decision,'policy_rule_id',h.policy_rule_id,'decision',private.evaluate_source(p_actor,p_session_id,h.source_key)) order by h.retrieved_at desc)
    from public.source_hits h where h.user_id = p_actor and h.session_id = p_session_id),'[]'::jsonb);
end;
$$;

revoke all on function public.source_gateway_descriptor(uuid,text),public.source_gateway_mock_text(uuid,text),public.source_gateway_decide(uuid,uuid,text),
  public.source_gateway_catalog(uuid,uuid),public.source_gateway_publish(uuid,uuid,text,text),public.source_gateway_open(uuid,uuid),public.source_gateway_history(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.source_gateway_descriptor(uuid,text),public.source_gateway_mock_text(uuid,text),public.source_gateway_decide(uuid,uuid,text),
  public.source_gateway_catalog(uuid,uuid),public.source_gateway_publish(uuid,uuid,text,text),public.source_gateway_open(uuid,uuid),public.source_gateway_history(uuid,uuid)
  to service_role;
