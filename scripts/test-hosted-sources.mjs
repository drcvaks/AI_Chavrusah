import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { runSupabase, queryRows } from './supabase-cli.mjs';

const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publicKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ref = base && new URL(base).hostname.split('.')[0];
if (!base || !publicKey || !/^[a-z]{20}$/.test(ref)) throw new Error('Configure the agreed hosted development project first.');
const keys = JSON.parse(runSupabase(['projects','api-keys','--project-ref',ref,'--reveal','--output','json']));
const secret = keys.find(key => key.name === 'service_role')?.api_key;
assert.ok(secret, 'Development admin API key available in memory');
const prefix = `m3-test:${randomBytes(10).toString('hex')}`;
const created = []; let failed = false; let count = 0;
function check(condition, label) { assert.ok(condition, label); count++; console.log(`PASS: ${label}`); }
async function request(path, { token, admin = false, method = 'GET', body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method, headers: { apikey: admin ? secret : publicKey, ...(admin || token ? {Authorization:`Bearer ${admin ? secret : token}`} : {}), 'Content-Type':'application/json', Prefer:'return=representation' },
    ...(body === undefined ? {} : {body:JSON.stringify(body)}), signal:AbortSignal.timeout(60000),
  });
  const text = await response.text();
  return {ok:response.ok,status:response.status,data:text ? JSON.parse(text) : null};
}
const rpc = (name,body,token) => request(`/rest/v1/rpc/${name}`,{method:'POST',body,token});
const gateway = (body,token) => request('/functions/v1/source-gateway',{method:'POST',body,token});
const denied = response => [401,403].includes(response.status);
try {
  const password = `M3!${randomBytes(24).toString('hex')}`;
  const users = [];
  for (const name of ['admin','a','b']) {
    const email = `m3-${randomBytes(10).toString('hex')}-${name}@example.invalid`;
    const account = await request('/auth/v1/admin/users',{admin:true,method:'POST',body:{email,password,email_confirm:true,user_metadata:{display_name:`M3 Test ${name}`}}});
    assert.ok(account.ok && account.data.id, 'Temporary account creation');
    assert.match(account.data.id,/^[a-f0-9-]{36}$/i); created.push(account.data.id);
    const login = await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
    assert.ok(login.ok, 'Temporary account sign-in'); users.push({id:account.data.id,token:login.data.access_token});
  }
  const [admin,a,b] = users;
  queryRows(`update public.profiles set role='GLOBAL_ADMIN' where id='${admin.id}';`);
  for (const letter of ['a','b','c']) {
    queryRows(`insert into private.source_catalog(source_key,provider,canonical_ref,title,category_keys,work_key,author_keys,version_key,version_title,language,retrieved_text,test_owner_id)
      values('${prefix}:${letter}','mock','TEST ${letter}:1','Synthetic test ${letter}',array['${prefix}/reading'],'${prefix}:work-${letter}',array['${prefix}:author-${letter}'],'${prefix}:edition-${letter}','Synthetic test edition','en','SYNTHETIC TEST ${letter}; NOT TORAH TEXT','${a.id}');`);
  }
  const sessions = [];
  for (const user of [a,b]) {
    const session = await request('/rest/v1/learning_sessions',{token:user.token,method:'POST',body:{user_id:user.id,title:'M3 isolated source test'}});
    assert.ok(session.ok); sessions.push(session.data[0].id);
  }
  const [sessionA,sessionB] = sessions;
  async function configuration(token = admin.token) { const response = await rpc('source_policy_configuration',{},token); assert.ok(response.ok); return response.data; }
  async function policy(letter,state,id = null) {
    return rpc('manage_source_policy',{p_id:id,p_expected_revision:(await configuration()).revision,p_scope_type:'WORK',p_scope_key:`${prefix}:work-${letter}`,p_state:state,p_reason:'Isolated synthetic integration test'},admin.token);
  }
  const adminRuleA = await policy('a','APPROVED'); assert.ok(adminRuleA.ok);
  assert.ok((await policy('b','ON_REQUEST')).ok); assert.ok((await policy('c','EXCLUDED')).ok);
  const noAuth = await gateway({action:'catalog',session_id:sessionA});
  check(noAuth.status === 401,'Deployed gateway rejects anonymous requests');
  const forgedToken = await gateway({action:'catalog',session_id:sessionA},'forged-jwt');
  check(forgedToken.status === 401,'Deployed gateway verifies JWTs, not caller identity claims');
  const normalWrite = await rpc('manage_source_policy',{p_id:null,p_expected_revision:(await configuration()).revision,p_scope_type:'WORK',p_scope_key:`${prefix}:forged`,p_state:'APPROVED',p_reason:'Forbidden'},a.token);
  check(denied(normalWrite),'Normal learner cannot edit global rules');
  const forgedGrant = await request('/rest/v1/source_authorizations',{token:a.token,method:'POST',body:{user_id:a.id,session_id:sessionA,source_key:`${prefix}:a`,policy_rule_id:adminRuleA.data,policy_revision:0,expires_at:new Date(Date.now()+3600000).toISOString()}});
  check(denied(forgedGrant),'Learner cannot insert a forged temporary grant');
  const approved = await gateway({action:'retrieve',session_id:sessionA,source_key:`${prefix}:a`,user_id:b.id,retrieved_text:'Forged remembered text'},a.token);
  check(approved.ok && approved.data.hit.retrieved_text === 'SYNTHETIC TEST a; NOT TORAH TEXT','Approved mock text is retrieved through the deployed gateway');
  const hitA = approved.data.hit;
  check(hitA.policy_rule_id === adminRuleA.data && hitA.policy_snapshot.revision && hitA.is_mock,'Accepted hit persists its authorizing rule, revision and synthetic provenance');
  const raw = await request('/rest/v1/source_hits?select=retrieved_text',{token:a.token});
  check(denied(raw),'Saved source text cannot be read directly through the Data API');
  const bypass = await rpc('source_gateway_mock_text',{p_actor:a.id,p_source_key:`${prefix}:a`},a.token);
  check(denied(bypass),'Client cannot call the provider-text function directly');
  const excluded = await gateway({action:'retrieve',session_id:sessionA,source_key:`${prefix}:c`},a.token);
  check(excluded.status === 403 && !JSON.stringify(excluded.data).includes('SYNTHETIC TEST c'),'Excluded source never returns its text');
  const blockedCount = queryRows(`select count(*)::integer as count from public.source_hits where user_id='${a.id}' and source_key='${prefix}:c';`);
  check(blockedCount[0].count === 0,'Excluded request persists no accepted hit');
  const beforeConsent = await gateway({action:'retrieve',session_id:sessionA,source_key:`${prefix}:b`},a.token);
  check(beforeConsent.status === 403,'ON_REQUEST source fails without explicit permission');
  const consent = await rpc('authorize_source_once',{p_session_id:sessionA,p_source_key:`${prefix}:b`},a.token);
  check(consent.ok && typeof consent.data === 'string','Learner explicitly grants temporary exact-source permission');
  const allowedRequest = await gateway({action:'retrieve',session_id:sessionA,source_key:`${prefix}:b`},a.token);
  check(allowedRequest.ok && allowedRequest.data.hit.authorization_id === consent.data,'ON_REQUEST source passes with the recorded authorization');
  const anotherA = await request('/rest/v1/learning_sessions',{token:a.token,method:'POST',body:{user_id:a.id,title:'Another isolated source session'}});
  assert.ok(anotherA.ok);
  check((await gateway({action:'retrieve',session_id:anotherA.data[0].id,source_key:`${prefix}:b`},a.token)).status === 403,'The same learner cannot reuse permission in another session');
  check((await gateway({action:'open',session_id:anotherA.data[0].id,hit_id:allowedRequest.data.hit.id},a.token)).status === 403,'Reopening saved evidence also enforces the exact session');
  const crossSession = await gateway({action:'retrieve',session_id:sessionA,source_key:`${prefix}:b`,user_id:a.id,authorization_id:consent.data},b.token);
  check(denied(crossSession),'Another learner cannot reuse a session or grant');
  const crossHit = await gateway({action:'open',session_id:sessionA,hit_id:hitA.id},b.token);
  check(denied(crossHit),'Another learner cannot reopen the saved source');
  const revoked = await rpc('revoke_source_authorization',{p_authorization_id:consent.data},a.token); assert.ok(revoked.ok);
  check((await gateway({action:'open',session_id:sessionA,hit_id:allowedRequest.data.hit.id},a.token)).status === 403,'Revocation blocks reopening previously accepted text');
  const renewed = await rpc('authorize_source_once',{p_session_id:sessionA,p_source_key:`${prefix}:b`},a.token); assert.ok(renewed.ok);
  assert.match(renewed.data,/^[a-f0-9-]{36}$/i);
  queryRows(`update public.source_authorizations set expires_at=now()-interval '1 second' where id='${renewed.data}' and user_id='${a.id}';`);
  check((await gateway({action:'retrieve',session_id:sessionA,source_key:`${prefix}:b`},a.token)).status === 403,'Expired permission is rejected by the deployed gateway');
  const exclusion = await policy('a','EXCLUDED',adminRuleA.data); assert.ok(exclusion.ok);
  check((await gateway({action:'open',session_id:sessionA,hit_id:hitA.id},a.token)).status === 403,'Later global exclusion blocks saved text');
  const history = await gateway({action:'history',session_id:sessionA},a.token);
  check(history.ok && history.data.sources.every(item=>!('retrieved_text' in item)),'History returns audit metadata without restricted text');
  const oldRule = queryRows(`select state,active from public.source_policy_rules where id='${adminRuleA.data}';`);
  check(oldRule[0].state === 'APPROVED' && oldRule[0].active === false,'Policy edits preserve the historical authorizing rule');
  const retire = await policy('a',null,exclusion.data); assert.ok(retire.ok);
  check((await gateway({action:'retrieve',session_id:sessionA,source_key:`${prefix}:a`},a.token)).status === 403,'Retiring the last rule returns the source to default denial');
  const unknown = await gateway({action:'retrieve',session_id:sessionA,source_key:`${prefix}:unverified-memory`},a.token);
  check(unknown.status === 403,'Unknown or remembered references cannot become accepted hits');
  const ownB = await gateway({action:'catalog',session_id:sessionB},b.token);
  check(ownB.ok && ownB.data.sources.every(item=>!item.source_key.startsWith(prefix)),'Test fixtures are isolated to their test learner');
} catch (error) { console.error(error.message); failed = true; }
finally {
  // Remove learner-owned hits/grants/catalog before retiring test rules. Every
  // deleted identity was created by this run; real project policies are untouched.
  for (const id of created.slice(1)) {
    try { assert.ok((await request(`/auth/v1/admin/users/${id}`,{admin:true,method:'DELETE'})).ok,`Temporary learner cleanup ${id}`); }
    catch (error) { console.error(error.message); failed = true; }
  }
  try { queryRows(`delete from public.source_policy_rules where scope_key like '${prefix}:%';`); }
  catch (error) { console.error(error.message); failed = true; }
  if (created[0]) {
    try { assert.ok((await request(`/auth/v1/admin/users/${created[0]}`,{admin:true,method:'DELETE'})).ok,'Temporary admin cleanup'); }
    catch (error) { console.error(error.message); failed = true; }
  }
  console.log(`${failed ? 'FAILED' : 'PASS'}: ${count} source gateway assertions; ${failed ? 'review cleanup errors above' : 'all temporary users and policy fixtures removed'}.`);
  process.exitCode = failed ? 1 : 0;
}
