import { describe, expect, it, vi } from 'vitest';
import { createSourceHandler } from '../supabase/functions/_shared/sources/handler';
const actor = '40000000-0000-0000-0000-000000000001';
const session = '41000000-0000-0000-0000-000000000001';
function request(body: unknown, token: string | null = 'verified-token') {
  return new Request('https://example.invalid/source-gateway', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) });
}
describe('SourceGateway HTTP authentication', () => {
  it('rejects missing bearer authentication before all RPC calls', async () => {
    const authenticate = vi.fn(); const rpc = vi.fn();
    const response = await createSourceHandler({ authenticate, rpc })(request({ action: 'catalog', session_id: session }, null));
    expect(response.status).toBe(401); expect(authenticate).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects forged JWTs without reading source data', async () => {
    const rpc = vi.fn();
    const response = await createSourceHandler({ authenticate: async () => null, rpc })(request({ action: 'retrieve', session_id: session, source_key: 'mock:sample-a' }, 'forged-token'));
    expect(response.status).toBe(401); expect(rpc).not.toHaveBeenCalled();
  });
  it('takes identity only from verified authentication, ignoring a forged body actor', async () => {
    const rpc = vi.fn(async () => []);
    const response = await createSourceHandler({ authenticate: async () => actor, rpc })(request({ action: 'catalog', session_id: session, p_actor: 'attacker', user_id: 'attacker' }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledExactlyOnceWith('source_gateway_catalog', { p_actor: actor, p_session_id: session });
  });
  it('fails closed when account verification is unavailable', async () => {
    const rpc = vi.fn();
    const response = await createSourceHandler({ authenticate: async () => { throw new Error('Auth offline'); }, rpc })(request({ action: 'catalog', session_id: session }));
    expect(response.status).toBe(503); expect(rpc).not.toHaveBeenCalled();
  });
  it('validates session IDs before database operations', async () => {
    const rpc = vi.fn();
    const response = await createSourceHandler({ authenticate: async () => actor, rpc })(request({ action: 'catalog', session_id: 'not-a-uuid' }));
    expect(response.status).toBe(400); expect(rpc).not.toHaveBeenCalled();
  });
  it('requires an explicit session when reopening saved evidence', async () => {
    const rpc = vi.fn();
    const response = await createSourceHandler({ authenticate: async () => actor, rpc })(request({ action: 'open', hit_id: session }));
    expect(response.status).toBe(400); expect(rpc).not.toHaveBeenCalled();
  });
  it('does not expose internal errors or text when saved-source access is denied', async () => {
    const response = await createSourceHandler({ authenticate: async () => actor, rpc: async () => { throw { code: 'PT403', message: 'Internal provider details' }; } })(request({ action: 'open', session_id: session, hit_id: session }));
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('Internal provider details');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
