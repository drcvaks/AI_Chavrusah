import { readFileSync, mkdtempSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { runSupabase } from './supabase-cli.mjs';

// Remote multi-statement queries don't return all TAP rows. Collect them and raise
// a real SQL error on failure so the CLI exit status is meaningful. All fixtures,
// extension setup, and role changes roll back in this transaction.
const directory = mkdtempSync(join(process.cwd(), '.tmp-db-test-'));
try {
  let sql = readFileSync('supabase/tests/database/profiles.test.sql', 'utf8');
  sql = sql.replace('select plan(20);', `create temporary table m1_tap_results (line text);
grant select, insert on m1_tap_results to anon, authenticated;
select plan(20);`);
  sql = sql.replace(/^select (plan|is|ok|throws_ok|lives_ok)\(/gm, 'insert into pg_temp.m1_tap_results select $1(');
  sql = sql.replace('select * from finish();', `insert into pg_temp.m1_tap_results select * from finish();
do $assert$
declare failures text;
begin
  select string_agg(line, E'\\n') into failures from pg_temp.m1_tap_results where line like 'not ok%';
  if failures is not null then raise exception 'Authorization tests failed: %', failures; end if;
  if (select count(*) from pg_temp.m1_tap_results where line like 'ok %') <> 20 then
    raise exception 'Expected 20 successful authorization assertions';
  end if;
end;
$assert$;`);
  const file = join(directory, 'checked-tests.sql');
  writeFileSync(file, sql);
  runSupabase(['db', 'query', '--linked', '--file', file]);
  console.log('PASS: 20 database authorization/integrity assertions; all fixtures rolled back.');
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
} finally {
  const resolved = realpathSync(directory);
  if (dirname(resolved) !== realpathSync(process.cwd()) || !basename(resolved).startsWith('.tmp-db-test-')) {
    throw new Error('Refusing to remove a test directory outside this workspace.');
  }
  rmSync(resolved, { recursive: true, force: true });
}
