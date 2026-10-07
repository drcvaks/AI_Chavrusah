begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(20);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001', 'm1-sql-a@example.invalid', '{"display_name":"Learner A","role":"GLOBAL_ADMIN","default_depth_mode":"BE_IYUN"}'),
  ('10000000-0000-0000-0000-000000000002', 'm1-sql-b@example.invalid', '{"display_name":"Learner B"}');

select is((select count(*)::integer from profiles where id in ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002')), 2, 'Signup provisions one profile per user');
select is((select role::text from profiles where id = '10000000-0000-0000-0000-000000000001'), 'USER', 'Forged role metadata cannot create an admin');
select is((select default_depth_mode::text from profiles where id = '10000000-0000-0000-0000-000000000001'), 'READING', 'New profile uses the server depth default');
select is((select display_name from profiles where id = '10000000-0000-0000-0000-000000000001'), 'Learner A', 'Display name is provisioned');

set local role anon;
select throws_ok('select * from public.profiles', '42501', 'permission denied for table profiles', 'Anonymous profile access is denied');
select throws_ok('select public.is_global_admin()', '42501', 'permission denied for function is_global_admin', 'Anonymous admin check is denied');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from profiles), 1, 'User A reads only their own profile');
select is((select count(*)::integer from profiles where id = '10000000-0000-0000-0000-000000000002'), 0, 'Explicit user B query is blocked');
select lives_ok($$update public.profiles set display_name = 'Updated A', default_depth_mode = 'BE_IYUN' where id = '10000000-0000-0000-0000-000000000001'$$, 'User can edit permitted preferences');
select is((select display_name from profiles), 'Updated A', 'Own display-name update persists');
select throws_ok($$update public.profiles set role = 'GLOBAL_ADMIN'$$, '42501', 'permission denied for table profiles', 'Self-promotion is denied');
select throws_ok($$update public.profiles set id = '10000000-0000-0000-0000-000000000002'$$, '42501', 'permission denied for table profiles', 'Profile identity update is denied');
select throws_ok($$update public.profiles set created_at = now()$$, '42501', 'permission denied for table profiles', 'Timestamp spoofing is denied');
select throws_ok($$insert into public.profiles (id, display_name, role) values ('10000000-0000-0000-0000-000000000003', 'Forged', 'GLOBAL_ADMIN')$$, '42501', 'permission denied for table profiles', 'Forged profile insertion is denied');
select is(public.is_global_admin(), false, 'Ordinary account fails the server admin check');
update public.profiles set display_name = 'Attempted B overwrite' where id = '10000000-0000-0000-0000-000000000002';
reset role;
select is((select display_name from profiles where id = '10000000-0000-0000-0000-000000000002'), 'Learner B', 'Cross-user update changes no private data');

update profiles set role = 'GLOBAL_ADMIN' where id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is(public.is_global_admin(), true, 'Trusted promotion enables the server admin check');
select is((select count(*)::integer from profiles), 1, 'Global admin still sees only their own private profile');
select throws_ok('delete from public.profiles', '42501', 'permission denied for table profiles', 'Ordinary client cannot delete private profiles');
reset role;
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'RLS is enabled');
select * from finish();
rollback;
