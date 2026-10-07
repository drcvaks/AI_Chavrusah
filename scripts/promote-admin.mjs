import { queryRows } from './supabase-cli.mjs';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
  console.error('Usage: npm run admin:promote -- YOUR_VERIFIED_APP_ACCOUNT_EMAIL');
  process.exit(1);
}
const escaped = email.replaceAll("'", "''");
try {
  const accounts = queryRows(`select id from auth.users where lower(email) = '${escaped}' and email_confirmed_at is not null;`);
  if (accounts.length !== 1) throw new Error('Exactly one verified app account must exist for this email. Sign up and confirm it first.');
  const id = accounts[0].id;
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error('Invalid account identifier returned by server.');
  const result = queryRows(`update public.profiles set role = 'GLOBAL_ADMIN' where id = '${id}' returning id, role;`);
  if (result.length !== 1 || result[0].role !== 'GLOBAL_ADMIN') throw new Error('Admin assignment could not be confirmed.');
  console.log('Global admin assigned to the verified app account. Sign out and back in to refresh access.');
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
}
