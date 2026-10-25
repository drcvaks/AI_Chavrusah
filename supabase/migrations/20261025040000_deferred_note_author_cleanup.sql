-- Author attribution must remain valid at commit, while permitting a profile's
-- owned notes/history to cascade together when a development account is removed.
alter table public.note_versions alter constraint note_versions_created_by_fkey deferrable initially deferred;
