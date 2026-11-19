import { requireSupabase } from '../../lib/supabase';
import type { CatalogItem, PolicyConfiguration, SavedSource, SourceHit, SourceScope, SourceState } from '../../domain/sources';

export async function getSourcePolicies(): Promise<PolicyConfiguration> {
  const { data, error } = await requireSupabase().rpc('source_policy_configuration');
  if (error) throw new Error('Source policies could not be loaded. Check your connection.');
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.revision !== 'number' || !Array.isArray(data.rules)) throw new Error('Source policy configuration is unavailable.');
  return data as unknown as PolicyConfiguration;
}
export async function saveSourcePolicy(id: string | null, expectedRevision: number, scope: SourceScope, key: string, state: SourceState | null, reason: string) {
  if (!key.trim() || key.trim().length > 300) throw new Error('Enter a scope key between 1 and 300 characters.');
  const { error } = await requireSupabase().rpc('manage_source_policy', {
    p_id: id!, p_expected_revision: expectedRevision, p_scope_type: scope, p_scope_key: key.trim(), p_state: state!, p_reason: reason.trim(),
  });
  if (error?.code === 'PT409') throw new Error('Policy changed elsewhere. Your draft is still here. Reload policies before saving.');
  if (error?.code === '23505') throw new Error('An active rule already exists for this scope. Edit that rule instead.');
  if (error) throw new Error('The policy change was not saved. Confirm admin access and try again.');
}

async function gateway<T>(body: Record<string, string>): Promise<T> {
  const { data, error } = await requireSupabase().functions.invoke('source-gateway', { body });
  if (error) {
    let message = 'Source gateway unavailable. Check your connection and try again.';
    if ('context' in error && error.context instanceof Response) {
      try { const details = await error.context.json(); if (typeof details.error === 'string') message = details.error; } catch { /* Preserve a safe fallback. */ }
    }
    throw new Error(message);
  }
  return data as T;
}
export async function getSourceCatalog(sessionId: string) {
  return (await gateway<{ sources: CatalogItem[] }>({ action: 'catalog', session_id: sessionId })).sources;
}
export async function retrieveSource(sessionId: string, key: string) {
  return (await gateway<{ hit: SourceHit }>({ action: 'retrieve', session_id: sessionId, source_key: key })).hit;
}
export async function getSourceHistory(sessionId: string) {
  return (await gateway<{ sources: SavedSource[] }>({ action: 'history', session_id: sessionId })).sources;
}
export async function reopenSource(sessionId: string, hitId: string) {
  return (await gateway<{ hit: SourceHit }>({ action: 'open', session_id: sessionId, hit_id: hitId })).hit;
}
export async function authorizeSource(sessionId: string, key: string) {
  const { error } = await requireSupabase().rpc('authorize_source_once', { p_session_id: sessionId, p_source_key: key });
  if (error) throw new Error('Permission was not granted. The source must still be ON_REQUEST and the session must be open.');
}
export async function revokeSource(grantId: string) {
  const { error } = await requireSupabase().rpc('revoke_source_authorization', { p_authorization_id: grantId });
  if (error) throw new Error('Permission could not be revoked. Please try again.');
}
