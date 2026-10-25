import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { runSupabase } from './supabase-cli.mjs';

// Remote multi-statement queries don't return all TAP rows. Collect them and raise
// a real SQL error on failure so the CLI exit status is meaningful. All fixtures,
// extension setup, and role changes roll back in this transaction.
const directory = mkdtempSync(join(process.cwd(), '.tmp-db-test-'));
try {
  for (const testFile of readdirSync('supabase/tests/database').filter((name) => name.endsWith('.test.sql')).sort()) {
  let sql = readFileSync(join('supabase/tests/database', testFile), 'utf8');
  const planned = sql.match(/select plan\((\d+)\);/);
  if (!planned) throw new Error(`Missing assertion plan in ${testFile}`);
  const count = Number(planned[1]);
  sql = sql.replace(planned[0], `create temporary table m1_tap_results (line text);
grant select, insert on m1_tap_results to anon, authenticated;
${planned[0]}`);
  sql = sql.replace(/^select (plan|is|ok|throws_ok|throws_like|lives_ok)\(/gm, 'insert into pg_temp.m1_tap_results select $1(');
  sql = sql.replace('select * from finish();', `insert into pg_temp.m1_tap_results select * from finish();
do $assert$
declare failures text;
begin
  select string_agg(line, E'\\n') into failures from pg_temp.m1_tap_results where line like 'not ok%';
  if failures is not null then raise exception 'Authorization tests failed: %', failures; end if;
  if (select count(*) from pg_temp.m1_tap_results where line like 'ok %') <> ${count} then
    raise exception 'Expected ${count} successful authorization assertions';
  end if;
end;
$assert$;`);
  const file = join(directory, 'checked-tests.sql');
  writeFileSync(file, sql);
  runSupabase(['db', 'query', '--linked', '--file', file]);
  console.log(`PASS: ${testFile}: ${count} database assertions; all fixtures rolled back.`);
  }
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
