create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create table private.source_policy_clock (
  singleton boolean primary key default true check (singleton), revision bigint not null default 0
);
insert into private.source_policy_clock values (true,0);

create table public.source_policy_rules (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('CATEGORY','WORK','AUTHOR','VERSION')),
  scope_key text not null check (scope_key = lower(btrim(scope_key)) and char_length(scope_key) between 1 and 300),
  state text not null check (state in ('APPROVED','ON_REQUEST','EXCLUDED')),
  active boolean not null default true,
  revision bigint not null,
  reason text not null default '',
  created_by_admin uuid references public.profiles(id) on delete set null,
  admin_display_name text not null,
  created_at timestamptz not null default now(), retired_at timestamptz,
  retired_by_admin uuid references public.profiles(id) on delete set null,
  retired_by_display_name text, retirement_reason text, retirement_revision bigint,
  supersedes_rule_id uuid references public.source_policy_rules(id) deferrable initially deferred
);
create unique index source_policy_active_scope on public.source_policy_rules(scope_type,scope_key) where active;
alter table public.source_policy_rules enable row level security;
revoke all on public.source_policy_rules from public,anon,authenticated;
grant select on public.source_policy_rules to authenticated;
grant all on public.source_policy_rules to service_role;
create policy global_policy_read on public.source_policy_rules for select to authenticated using (true);

-- All fixtures are explicitly synthetic. Private text is NEVER a client table/API.
create table private.source_catalog (
  source_key text primary key, provider text not null, canonical_ref text not null,
  title text not null, category_keys text[] not null, work_key text not null,
  author_keys text[] not null, version_key text not null, version_title text not null,
  language text not null, retrieved_text text not null, is_mock boolean not null default true,
  test_owner_id uuid references public.profiles(id) on delete cascade
);
create function private.immutable_source_catalog() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Source snapshots are immutable; register a new source key for changed text or metadata' using errcode = '22023';
end;
$$;
revoke all on function private.immutable_source_catalog() from public,anon,authenticated;
create trigger immutable_source_catalog before update on private.source_catalog
  for each row execute function private.immutable_source_catalog();
insert into private.source_catalog (source_key,provider,canonical_ref,title,category_keys,work_key,author_keys,version_key,version_title,language,retrieved_text) values
 ('mock:sample-a','mock','MOCK A:1','Synthetic sample A',array['mock','mock/reading'],'mock:work-a',array['mock:author-a'],'mock:edition-a','Synthetic edition A','en','SYNTHETIC TEST FIXTURE A. This is not Torah text.'),
 ('mock:sample-b','mock','MOCK B:1','Synthetic sample B',array['mock','mock/reading'],'mock:work-b',array['mock:author-b'],'mock:edition-b','Synthetic edition B','en','SYNTHETIC TEST FIXTURE B. This is not Torah text.'),
 ('mock:sample-c','mock','MOCK C:1','Synthetic sample C',array['mock','mock/commentary'],'mock:work-c',array['mock:author-c'],'mock:edition-c','Synthetic edition C','en','SYNTHETIC TEST FIXTURE C. This is not Torah text.');

create table public.source_authorizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.learning_sessions(id) on delete cascade,
  source_key text not null,
  version_key text not null,
  policy_rule_id uuid not null references public.source_policy_rules(id),
  policy_revision bigint not null,
  confirmed_at timestamptz not null default now(), expires_at timestamptz not null,
  revoked_at timestamptz,
  unique(user_id,session_id,source_key,version_key,policy_rule_id)
);
create index source_authorizations_owner on public.source_authorizations(user_id,session_id);
alter table public.source_authorizations enable row level security;
revoke all on public.source_authorizations from public,anon,authenticated;
grant select on public.source_authorizations to authenticated;
grant all on public.source_authorizations to service_role;
create policy own_source_grants on public.source_authorizations for select to authenticated using (user_id = (select auth.uid()));

create function public.source_policy_configuration() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('revision',c.revision,'rules',coalesce((select jsonb_agg(to_jsonb(r) order by r.scope_type,r.scope_key) from public.source_policy_rules r where r.active),'[]'::jsonb))
  from private.source_policy_clock c where c.singleton and auth.uid() is not null;
$$;
revoke all on function public.source_policy_configuration() from public,anon;
grant execute on function public.source_policy_configuration() to authenticated;

create function public.manage_source_policy(p_id uuid,p_expected_revision bigint,p_scope_type text,p_scope_key text,p_state text,p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_revision bigint; previous public.source_policy_rules; new_id uuid := gen_random_uuid(); actor uuid := auth.uid(); actor_name text;
begin
  if not public.is_global_admin() then raise exception 'Global admin required' using errcode = '42501'; end if;
  select revision into current_revision from private.source_policy_clock where singleton for update;
  if current_revision is distinct from p_expected_revision then raise exception 'Policy changed. Reload before saving.' using errcode = 'PT409'; end if;
  select display_name into strict actor_name from public.profiles where id = actor;
  if p_id is not null then
    select * into previous from public.source_policy_rules where id = p_id and active;
    if not found then raise exception 'Active rule unavailable' using errcode = '22023'; end if;
    if p_scope_type is distinct from previous.scope_type or lower(btrim(p_scope_key)) is distinct from previous.scope_key then
      raise exception 'Retire a rule before changing its scope' using errcode = '22023';
    end if;
    update public.source_policy_rules set active = false,retired_at = now(),retired_by_admin = actor,
      retired_by_display_name = actor_name,retirement_reason = coalesce(p_reason,''),retirement_revision = current_revision + 1 where id = p_id;
  elsif p_state is null then raise exception 'Select a rule to retire' using errcode = '22023';
  end if;
  update private.source_policy_clock set revision = current_revision + 1 where singleton;
  if p_state is null then return p_id; end if;
  insert into public.source_policy_rules(id,scope_type,scope_key,state,revision,reason,created_by_admin,admin_display_name,supersedes_rule_id)
    values(new_id,p_scope_type,lower(btrim(p_scope_key)),p_state,current_revision+1,coalesce(p_reason,''),actor,actor_name,p_id);
  return new_id;
end;
$$;
revoke all on function public.manage_source_policy(uuid,bigint,text,text,text,text) from public,anon;
grant execute on function public.manage_source_policy(uuid,bigint,text,text,text,text) to authenticated;

create function private.evaluate_source(p_actor uuid,p_session uuid,p_key text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare source private.source_catalog; winning public.source_policy_rules; grant_row public.source_authorizations; current_revision bigint; session_open boolean; matched uuid[];
begin
  if p_actor is null or not exists(select 1 from public.learning_sessions where id = p_session and user_id = p_actor) then
    raise exception 'Learning session unavailable' using errcode = '42501';
  end if;
  select * into source from private.source_catalog where source_key = p_key and (test_owner_id is null or test_owner_id = p_actor);
  if not found then return jsonb_build_object('allowed',false,'state','DENIED','reason','UNKNOWN_SOURCE'); end if;
  if cardinality(source.category_keys)=0 or cardinality(source.author_keys)=0 or nullif(source.work_key,'') is null or nullif(source.version_key,'') is null then
    return jsonb_build_object('allowed',false,'state','DENIED','reason','INCOMPLETE_METADATA');
  end if;
  select revision into current_revision from private.source_policy_clock where singleton;
  select array_agg(id) into matched from public.source_policy_rules r where r.active and (
    (r.scope_type = 'CATEGORY' and r.scope_key = any(source.category_keys)) or
    (r.scope_type = 'AUTHOR' and r.scope_key = any(source.author_keys)) or
    (r.scope_type = 'WORK' and r.scope_key = source.work_key) or
    (r.scope_type = 'VERSION' and r.scope_key = source.version_key));
  select * into winning from public.source_policy_rules r where r.id = any(coalesce(matched,'{}'::uuid[]))
    order by (r.state = 'EXCLUDED') desc,
      case r.scope_type when 'VERSION' then 4 when 'WORK' then 3 when 'AUTHOR' then 2 else 1 end desc,
      case when r.scope_type = 'CATEGORY' then cardinality(string_to_array(r.scope_key,'/')) else 0 end desc,
      (r.state = 'ON_REQUEST') desc,r.scope_key,r.id limit 1;
  if not found then return jsonb_build_object('allowed',false,'state','DENIED','reason','NO_MATCHING_RULE','revision',current_revision); end if;
  if winning.state = 'ON_REQUEST' then
    select ended_at is null into session_open from public.learning_sessions where id = p_session;
    select * into grant_row from public.source_authorizations a where a.user_id = p_actor and a.session_id = p_session and a.source_key = p_key
      and a.version_key = source.version_key and a.policy_rule_id = winning.id and a.revoked_at is null and a.expires_at > now() and session_open;
  end if;
  return jsonb_build_object(
    'allowed',winning.state = 'APPROVED' or (winning.state = 'ON_REQUEST' and grant_row.id is not null),
    'state',winning.state,'reason',case when winning.state = 'EXCLUDED' then 'GLOBAL_EXCLUSION' when winning.state = 'APPROVED' then 'APPROVED_RULE' when not session_open then 'SESSION_CLOSED' when grant_row.id is not null then 'ON_REQUEST_AUTHORIZED' else 'EXPLICIT_PERMISSION_REQUIRED' end,
    'rule_id',winning.id,'rule_revision',winning.revision,'revision',current_revision,
    'matched_rule_ids',to_jsonb(matched),'authorization_id',grant_row.id,'authorization_expires_at',grant_row.expires_at,
    'source_key',p_key,'version_key',source.version_key
  );
end;
$$;
revoke all on function private.evaluate_source(uuid,uuid,text) from public,anon,authenticated;

create function public.authorize_source_once(p_session_id uuid,p_source_key text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare decision jsonb; grant_id uuid;
begin
  perform 1 from private.source_policy_clock where singleton for update;
  decision := private.evaluate_source(auth.uid(),p_session_id,p_source_key);
  if decision ->> 'state' <> 'ON_REQUEST' or not exists(select 1 from public.learning_sessions where id = p_session_id and ended_at is null) then
    raise exception 'Only an ON_REQUEST source in an open session can receive temporary permission' using errcode = '42501';
  end if;
  insert into public.source_authorizations(user_id,session_id,source_key,version_key,policy_rule_id,policy_revision,expires_at)
    values(auth.uid(),p_session_id,p_source_key,decision ->> 'version_key',(decision ->> 'rule_id')::uuid,(decision ->> 'revision')::bigint,now()+interval '60 minutes')
    on conflict(user_id,session_id,source_key,version_key,policy_rule_id) do update set confirmed_at = now(),expires_at = now()+interval '60 minutes',revoked_at = null
    returning id into grant_id;
  return grant_id;
end;
$$;
create function public.revoke_source_authorization(p_authorization_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from private.source_policy_clock where singleton for update;
  update public.source_authorizations set revoked_at = now() where id = p_authorization_id and user_id = auth.uid();
  if not found then raise exception 'Permission unavailable' using errcode = '42501'; end if;
end;
$$;
revoke all on function public.authorize_source_once(uuid,text),public.revoke_source_authorization(uuid) from public,anon;
grant execute on function public.authorize_source_once(uuid,text),public.revoke_source_authorization(uuid) to authenticated;
