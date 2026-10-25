import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { runSupabase } from './supabase-cli.mjs';

const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publicKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ref = base && new URL(base).hostname.split('.')[0];
if (!base || !publicKey || !/^[a-z]{20}$/.test(ref)) throw new Error('Configure the agreed hosted development project first.');
const keys = JSON.parse(runSupabase(['projects','api-keys','--project-ref',ref,'--reveal','--output','json']));
const secret = keys.find((key) => key.name === 'service_role')?.api_key;
assert.ok(secret, 'Development admin key available in memory');
const created = []; let count = 0; let failed = false;
async function request(path, { token, admin = false, method = 'GET', body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method, headers: { apikey: admin ? secret : publicKey, ...(admin || token ? { Authorization: `Bearer ${admin ? secret : token}` } : {}), 'Content-Type':'application/json', Prefer:'return=representation' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000),
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, data: text ? JSON.parse(text) : null };
}
function check(value, label) { assert.ok(value, label); count++; console.log(`PASS: ${label}`); }
const denied = (response) => [401,403].includes(response.status);
async function rpc(name, body, token) { return request(`/rest/v1/rpc/${name}`, { method:'POST', body, token }); }
try {
  const password = `M2!${randomBytes(24).toString('hex')}`;
  const users = [];
  for (const suffix of ['a','b']) {
    const email = `m2-${randomBytes(10).toString('hex')}-${suffix}@example.invalid`;
    const account = await request('/auth/v1/admin/users', { admin:true, method:'POST', body:{ email,password,email_confirm:true,user_metadata:{ display_name:`M2 Learner ${suffix}` } } });
    assert.ok(account.ok && account.data.id, 'Temporary account creation'); created.push(account.data.id);
    const login = await request('/auth/v1/token?grant_type=password', { method:'POST', body:{email,password} });
    assert.ok(login.ok, 'Temporary account sign-in'); users.push({ id:account.data.id,token:login.data.access_token });
  }
  const [a,b] = users;
  const session = await request('/rest/v1/learning_sessions', { token:a.token,method:'POST',body:{user_id:a.id,title:'Daf Yomi Chullin 57a',context_type:'DAF_YOMI',mesechta:'Chullin',daf:'57a',depth_mode:'BE_IYUN'} });
  check(session.ok && session.data[0].depth_mode === 'BE_IYUN','Create a Chullin 57a session with selected depth');
  const sessionId = session.data[0].id;
  const another = await request('/rest/v1/learning_sessions', { token:b.token,method:'POST',body:{user_id:b.id,title:'Private B session'} });
  assert.ok(another.ok);
  const fakeOwner = await request('/rest/v1/learning_sessions', { token:a.token,method:'POST',body:{user_id:b.id,title:'Forged owner'} });
  check(denied(fakeOwner),'Session creation cannot spoof another owner');
  const draft = {
    p_note_id:null,p_expected_version_id:null,p_title:'Siman versus definition',p_author_thesis:'The learner proposes a distinction.',
    p_body:'Original analysis with references 1, 2, 3, 4, 5, 6.',p_summary:'Original summary',p_change_reason:'Initial manual note',p_session_ids:[sessionId],
    p_facets:[{facet_type:'CORPUS',facet_value:'Gemara'},{facet_type:'DOMAIN',facet_value:'Halacha'}],
    p_anchors:['Chullin 57a','Rashi','Tosafos','Rambam','Shulchan Aruch'].map((reference_label) => ({reference_label,why_central:'Central to this discussion'})),
  };
  const save = await rpc('save_learning_note',draft,a.token);
  check(save.ok && typeof save.data === 'string','Create a versioned note through the authenticated API');
  const noteId = save.data;
  const readNote = async () => {
    const result = await request(`/rest/v1/notes?id=eq.${noteId}&select=*`,{token:a.token}); assert.ok(result.ok); return result.data[0];
  };
  const readVersions = () => request(`/rest/v1/note_versions?note_id=eq.${noteId}&order=version_number`,{token:a.token});
  const v1 = (await readNote()).current_version_id;
  const facets = await request(`/rest/v1/note_facets?note_id=eq.${noteId}`,{token:a.token});
  check(facets.data.length === 2,'Gemara and Halacha facets coexist');
  const anchors = await request(`/rest/v1/note_anchor_sources?note_id=eq.${noteId}`,{token:a.token});
  check(anchors.data.length === 5 && anchors.data.every((anchor) => anchor.verification_status === 'UNVERIFIED'),'Five anchors remain explicitly unverified');
  const six = await rpc('save_learning_note',{...draft,p_anchors:[...draft.p_anchors,{reference_label:'Sixth',why_central:''}]},a.token);
  check(!six.ok && six.data.code === '22023','Six anchors are rejected by the server');
  const versions1 = await readVersions();
  check(versions1.data[0].body.includes('1, 2, 3, 4, 5, 6'),'Body references are independent of anchor count');
  for (const table of ['notes','note_versions','note_facets','note_anchor_sources','note_sessions']) {
    const other = await request(`/rest/v1/${table}?select=*`,{token:b.token});
    check(other.ok && other.data.length === 0,`${table} remain private to their learner`);
  }
  const ownership = await rpc('save_learning_note',{...draft,p_note_id:noteId,p_expected_version_id:v1},b.token);
  check(denied(ownership),'Note save enforces ownership at the server boundary');
  const wrongSession = await rpc('save_learning_note',{...draft,p_note_id:noteId,p_expected_version_id:v1,p_session_ids:[another.data[0].id]},a.token);
  check(denied(wrongSession),'Notes cannot link another learners private session');
  const edit = {...draft,p_note_id:noteId,p_expected_version_id:v1};
  console.log('Starting two simultaneous note saves…');
  const racing = await Promise.all(['First editor','Second editor'].map(async (text) => {
    const result = await rpc('save_learning_note',{...edit,p_body:text,p_change_reason:text},a.token);
    console.log(`Concurrent response: ${text}: HTTP ${result.status}, code ${result.data?.code ?? 'success'}`);
    return result;
  }));
  check(racing.filter((result) => result.ok).length === 1 && racing.filter((result) => result.status === 409 && result.data?.code === 'PT409').length === 1,'Concurrent saves accept one editor and reject the stale editor');
  check((await readVersions()).data.length === 2,'Concurrent save appends exactly one version');
  const v2 = (await readNote()).current_version_id;
  const badMetadata = await rpc('save_learning_note',{...edit,p_expected_version_id:v2,p_facets:[{facet_type:'INVALID',facet_value:'No'}]},a.token);
  check(!badMetadata.ok && (await readNote()).current_version_id === v2 && (await readVersions()).data.length === 2,'Invalid metadata rolls back version creation and current pointer');
  const third = await rpc('save_learning_note',{...edit,p_expected_version_id:v2,p_body:'Third body',p_title:'Edited title',p_author_thesis:'Explicitly revised thesis',p_change_reason:'Second edit'},a.token);
  check(third.ok && (await readVersions()).data.length === 3,'Second edit creates the third immutable version');
  const v3 = (await readNote()).current_version_id;
  const mutate = await request(`/rest/v1/note_versions?id=eq.${v1}`,{token:a.token,method:'PATCH',body:{body:'Silent overwrite'}});
  check(denied(mutate),'Direct history overwrites are denied');
  const restored = await rpc('restore_learning_note',{p_note_id:noteId,p_version_id:v1,p_expected_version_id:v3},a.token);
  check(restored.ok,'Restore creates a new version');
  const history = (await readVersions()).data;
  check(history.length === 4 && history[0].body === draft.p_body && history[3].body === draft.p_body && history[2].body === 'Third body','Restore preserves every old body and copies the chosen text');
  const current = await readNote();
  check(current.title === draft.p_title && current.author_thesis === draft.p_author_thesis,'Restore restores the original title and thesis');
  check(history[3].parent_version_id === v3 && history[3].created_by === a.id && !!history[3].author_display_name,'Restore records parent, author and timestamp attribution');
  const ended = await request(`/rest/v1/learning_sessions?id=eq.${sessionId}`,{token:a.token,method:'PATCH',body:{ended_at:new Date().toISOString()}});
  check(ended.ok && !!ended.data[0].ended_at,'Manual learning session can be ended');
  const anonymous = await rpc('save_learning_note',draft);
  check(denied(anonymous),'Anonymous note creation is denied');
} catch (error) { console.error(error.message); failed = true; }
finally {
  for (const id of created) {
    try { const response = await request(`/auth/v1/admin/users/${id}`,{admin:true,method:'DELETE'}); assert.ok(response.ok,`Temporary test-user cleanup ${id}`); }
    catch (error) { console.error(error.message); failed = true; }
  }
  console.log(`${failed ? 'FAILED' : 'PASS'}: ${count} hosted learning assertions; cleanup attempted for all temporary accounts.`);
  process.exitCode = failed ? 1 : 0;
}
