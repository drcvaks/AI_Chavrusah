-- 40001 means a retryable transaction failure to PostgREST. A stale editor is a
-- business conflict, not a transaction that can succeed by retrying unchanged.
-- Preserve the checked function bodies/ACLs and return a specific HTTP 409.
do $$
declare signature regprocedure; definition text;
begin
  foreach signature in array array[
    'public.save_learning_note(uuid,uuid,text,text,text,text,text,uuid[],jsonb,jsonb)'::regprocedure,
    'public.restore_learning_note(uuid,uuid,uuid)'::regprocedure
  ] loop
    definition := pg_get_functiondef(signature);
    if position('errcode = ''40001''' in definition) = 0 then
      raise exception 'Expected note conflict clause missing in %', signature;
    end if;
    execute replace(definition,'errcode = ''40001''','errcode = ''PT409''');
  end loop;
end;
$$;
