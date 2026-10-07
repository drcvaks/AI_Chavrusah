import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { runSupabase, queryRows } from './supabase-cli.mjs';

// Development-only integration checks. No credentials are written to disk or logs.
const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publicKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const reference = base && new URL(base).hostname.split('.')[0];
if (!base || !publicKey || !/^[a-z]{20}$/.test(reference)) throw new Error('Configure the hosted development project in .env first.');
const created = [];
let failures = false;
let adminKey;

async function request(path, { token, method = 'GET', body, admin = false } = {}) {
  const key = admin ? adminKey : publicKey;
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { apikey: key, ...(token || admin ? { Authorization: `Bearer ${token ?? adminKey}` } : {}), 'Content-Type': 'application/json', Prefer: 'return=representation' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  return { status: response.status, ok: response.ok, data: text ? JSON.parse(text) : null };
}
function check(condition, label) { assert.ok(condition, label); console.log(`PASS: ${label}`); }

try {
  const keys = JSON.parse(runSupabase(['projects', 'api-keys', '--project-ref', reference, '--reveal', '--output', 'json']));
  const serviceKey = keys.find((key) => key.name === 'service_role') ?? keys.find((key) => key.type === 'secret');
  adminKey = serviceKey?.api_key;
  if (!adminKey || adminKey.includes('...')) throw new Error('The CLI could not obtain the development admin API key.');
  const password = `M1!${randomBytes(24).toString('hex')}`;
  const tag = randomBytes(8).toString('hex');
  const identities = [];
  for (const suffix of ['a', 'b']) {
    const email = `m1-${tag}-${suffix}@example.invalid`;
    const account = await request('/auth/v1/admin/users', { admin: true, method: 'POST', body: {
      email, password, email_confirm: true, user_metadata: { display_name: `M1 test ${suffix}`, role: 'GLOBAL_ADMIN', default_depth_mode: 'BE_IYUN' },
    } });
    if (!account.ok || !account.data.id) throw new Error(`Temporary test-user creation failed (${account.status}).`);
    created.push(account.data.id);
    const login = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
    check(login.ok && !!login.data.access_token, `Temporary user ${suffix} signs in`);
    identities.push({ id: account.data.id, token: login.data.access_token, refresh: login.data.refresh_token });
  }
  const [a, b] = identities;
  const anonymous = await request('/rest/v1/profiles?select=id');
  check([401, 403].includes(anonymous.status), 'Anonymous profile access is denied through the Data API');
  const own = await request('/rest/v1/profiles?select=*', { token: a.token });
  check(own.ok && own.data.length === 1 && own.data[0].id === a.id, 'Authenticated API returns only the current user profile');
  check(own.data[0].role === 'USER' && own.data[0].default_depth_mode === 'READING', 'Signup metadata cannot assign admin or override server defaults');
  const other = await request(`/rest/v1/profiles?id=eq.${b.id}&select=*`, { token: a.token });
  check(other.ok && other.data.length === 0, 'Explicit cross-user API query returns no rows');
  const updated = await request(`/rest/v1/profiles?id=eq.${a.id}`, { token: a.token, method: 'PATCH', body: { display_name: 'Edited test name', default_depth_mode: 'BE_IYUN' } });
  check(updated.ok && updated.data[0]?.display_name === 'Edited test name', 'Allowed profile preferences save through the API');
  for (const field of [{ role: 'GLOBAL_ADMIN' }, { id: b.id }, { created_at: '2000-01-01T00:00:00Z' }]) {
    const forbidden = await request(`/rest/v1/profiles?id=eq.${a.id}`, { token: a.token, method: 'PATCH', body: field });
    check([401, 403].includes(forbidden.status), `Client cannot change protected field ${Object.keys(field)[0]}`);
  }
  const crossUpdate = await request(`/rest/v1/profiles?id=eq.${b.id}`, { token: a.token, method: 'PATCH', body: { display_name: 'Wrong owner' } });
  check(crossUpdate.ok && crossUpdate.data.length === 0, 'Cross-user API update affects no rows');
  const ordinary = await request('/rest/v1/rpc/is_global_admin', { token: a.token, method: 'POST', body: {} });
  check(ordinary.ok && ordinary.data === false, 'Server admin check rejects an ordinary user');
  assert.match(a.id, /^[a-f0-9-]{36}$/i);
  queryRows(`update public.profiles set role = 'GLOBAL_ADMIN' where id = '${a.id}' returning id;`);
  const promoted = await request('/rest/v1/rpc/is_global_admin', { token: a.token, method: 'POST', body: {} });
  check(promoted.ok && promoted.data === true, 'Trusted promotion enables the server admin check');
  const adminPrivate = await request('/rest/v1/profiles?select=id', { token: a.token });
  check(adminPrivate.ok && adminPrivate.data.length === 1 && adminPrivate.data[0].id === a.id, 'Admin authority does not bypass private-profile RLS');
  const logout = await request('/auth/v1/logout?scope=local', { token: b.token, method: 'POST' });
  check(logout.ok, 'Authentication API signs out successfully');
  const revokedRefresh = await request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: b.refresh } });
  check(!revokedRefresh.ok, 'Signed-out session cannot refresh');
} catch (error) {
  console.error(error.message);
  failures = true;
} finally {
  for (const id of created) {
    try {
      const result = await request(`/auth/v1/admin/users/${id}`, { admin: true, method: 'DELETE' });
      if (!result.ok) throw new Error(`Cleanup failed for temporary test user ${id}.`);
    } catch (error) { console.error(error.message); failures = true; }
  }
  if (!failures) console.log('Temporary integration-test users removed.');
  process.exitCode = failures ? 1 : 0;
}
