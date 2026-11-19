import { AuthorizedSourceGateway, SourceBlockedError } from './gateway.ts';
import type { SourceDecision, SourceDescriptor, SourceHit } from './types.ts';

export interface GatewayServices {
  authenticate(token: string): Promise<string | null>;
  rpc(name: string, args: Record<string, unknown>): Promise<unknown>;
}
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);

export function createSourceHandler(services: GatewayServices) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    const header = request.headers.get('Authorization');
    if (!header?.startsWith('Bearer ')) return json({ error: 'Sign in to access sources.' }, 401);
    let actor: string | null;
    try { actor = await services.authenticate(header.slice(7)); }
    catch { return json({ error: 'Account verification unavailable. Please try again.' }, 503); }
    if (!actor) return json({ error: 'Sign in to access sources.' }, 401);
    try {
      if (Number(request.headers.get('content-length') ?? 0) > 4096) return json({ error: 'Request too large.' }, 413);
      const raw = await request.text();
      if (raw.length > 4096) return json({ error: 'Request too large.' }, 413);
      let body: Record<string, unknown>;
      try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON.' }, 400); }
      if (!body || Array.isArray(body) || typeof body !== 'object') return json({ error: 'Invalid request.' }, 400);
      const rpc = services.rpc;
      if (body.action === 'open') {
        if (!uuid(body.hit_id) || !uuid(body.session_id)) return json({ error: 'Select a session and saved source.' }, 400);
        return json({ hit: await rpc('source_gateway_open', { p_actor: actor, p_session_id: body.session_id, p_hit_id: body.hit_id }) });
      }
      if (!uuid(body.session_id)) return json({ error: 'Select a learning session.' }, 400);
      const session = body.session_id;
      if (body.action === 'catalog') return json({ sources: await rpc('source_gateway_catalog', { p_actor: actor, p_session_id: session }) });
      if (body.action === 'history') return json({ sources: await rpc('source_gateway_history', { p_actor: actor, p_session_id: session }) });
      if (body.action !== 'retrieve' || typeof body.source_key !== 'string' || !body.source_key || body.source_key.length > 300) return json({ error: 'Select a source to retrieve.' }, 400);
      const gateway = new AuthorizedSourceGateway({
        resolve: async (user, key) => await rpc('source_gateway_descriptor', { p_actor: user, p_source_key: key }) as SourceDescriptor | null,
        retrieve: async (user, source) => await rpc('source_gateway_mock_text', { p_actor: user, p_source_key: source.source_key }) as string,
      }, {
        decide: async (user, sessionId, key) => await rpc('source_gateway_decide', { p_actor: user, p_session_id: sessionId, p_source_key: key }) as SourceDecision,
        publish: async (user, sessionId, key, text) => await rpc('source_gateway_publish', { p_actor: user, p_session_id: sessionId, p_source_key: key, p_text: text }) as SourceHit,
      });
      return json({ hit: await gateway.retrieve(actor, session, body.source_key) });
    } catch (error) {
      if (error instanceof SourceBlockedError) return json({ error: error.message, decision: error.decision }, 403);
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (['42501', 'PT403'].includes(code)) return json({ error: 'Source or session unavailable under current policy or permission.' }, 403);
      if (code === '22023') return json({ error: 'The source request could not be validated.' }, 400);
      return json({ error: 'Source gateway unavailable. Please try again.' }, 503);
    }
  };
}
