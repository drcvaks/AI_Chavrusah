import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function runSupabase(args) {
  const cli = process.env.SUPABASE_CLI_PATH ?? resolve('node_modules/supabase/dist/supabase.js');
  if (!existsSync(cli)) throw new Error('Supabase CLI dependency is missing. Run npm ci first.');
  return execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
}

export function queryRows(sql) {
  const result = JSON.parse(runSupabase(['db', 'query', '--linked', '--output', 'json', sql]));
  return Array.isArray(result) ? result : result.rows ?? [];
}
