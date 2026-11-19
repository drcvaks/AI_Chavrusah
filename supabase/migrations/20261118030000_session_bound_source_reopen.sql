-- Reopening evidence must use the caller's current learning context, never a
-- grant from another session merely because both sessions belong to one person.
drop function public.source_gateway_open(uuid,uuid);
create function public.source_gateway_open(p_actor uuid,p_session_id uuid,p_hit_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare hit public.source_hits; decision jsonb;
begin
  perform 1 from private.source_policy_clock where singleton for share;
  select * into hit from public.source_hits where id = p_hit_id and user_id = p_actor and session_id = p_session_id;
  if not found then raise exception 'Source record unavailable' using errcode = '42501'; end if;
  perform 1 from public.learning_sessions where id = p_session_id and user_id = p_actor for share;
  decision := private.evaluate_source(p_actor,p_session_id,hit.source_key);
  if coalesce((decision ->> 'allowed')::boolean,false) is not true then
    raise exception 'Saved source blocked by current policy or permission' using errcode = 'PT403';
  end if;
  return to_jsonb(hit) || jsonb_build_object('current_access',decision);
end;
$$;
revoke all on function public.source_gateway_open(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.source_gateway_open(uuid,uuid,uuid) to service_role;
