import { describe, expect, it, vi } from 'vitest';
import { AuthorizedSourceGateway, SourceBlockedError } from '../supabase/functions/_shared/sources/gateway';
import type { SourceDecision, SourceDescriptor, SourceHit } from '../supabase/functions/_shared/sources/types';

const descriptor: SourceDescriptor = { source_key: 'test', provider: 'mock', canonical_ref: 'MOCK 1', title: 'Synthetic', category_keys: ['mock'], work_key: 'mock:work', author_keys: ['mock:author'], version_key: 'mock:edition', version_title: 'Synthetic edition', language: 'en', is_mock: true };
function setup(decision: SourceDecision, changedAtCommit = false) {
  const retrieve = vi.fn(async () => 'SYNTHETIC TEXT');
  const publish = vi.fn(async () => {
    if (changedAtCommit) throw new SourceBlockedError({ allowed: false, state: 'EXCLUDED', reason: 'GLOBAL_EXCLUSION' });
    return { id: 'hit', retrieved_text: 'SYNTHETIC TEXT', policy_snapshot: decision } as SourceHit;
  });
  const gateway = new AuthorizedSourceGateway({ resolve: async () => descriptor, retrieve }, { decide: async () => decision, publish });
  return { gateway, retrieve, publish };
}
describe('SourceGateway trust boundary', () => {
  it('does not retrieve excluded text, even for an explicit source request', async () => {
    const { gateway, retrieve, publish } = setup({ allowed: false, state: 'EXCLUDED', reason: 'GLOBAL_EXCLUSION' });
    await expect(gateway.retrieve('user', 'session', 'test')).rejects.toBeInstanceOf(SourceBlockedError);
    expect(retrieve).not.toHaveBeenCalled(); expect(publish).not.toHaveBeenCalled();
  });
  it('does not auto-authorize an ON_REQUEST source', async () => {
    const { gateway, retrieve } = setup({ allowed: false, state: 'ON_REQUEST', reason: 'EXPLICIT_PERMISSION_REQUIRED', rule_id: 'rule' });
    await expect(gateway.retrieve('user', 'session', 'test')).rejects.toBeInstanceOf(SourceBlockedError);
    expect(retrieve).not.toHaveBeenCalled();
  });
  it('persists an approved hit before returning it', async () => {
    const { gateway, publish } = setup({ allowed: true, state: 'APPROVED', reason: 'APPROVED_RULE', rule_id: 'rule' });
    expect((await gateway.retrieve('user', 'session', 'test')).id).toBe('hit');
    expect(publish).toHaveBeenCalledWith('user', 'session', 'test', 'SYNTHETIC TEXT');
  });
  it('returns a temporarily authorized ON_REQUEST source', async () => {
    const { gateway } = setup({ allowed: true, state: 'ON_REQUEST', reason: 'ON_REQUEST_AUTHORIZED', rule_id: 'rule', authorization_id: 'grant' });
    expect((await gateway.retrieve('user', 'session', 'test')).policy_snapshot.authorization_id).toBe('grant');
  });
  it('withholds text if policy changes during retrieval', async () => {
    const { gateway, retrieve } = setup({ allowed: true, state: 'APPROVED', reason: 'APPROVED_RULE', rule_id: 'rule' }, true);
    await expect(gateway.retrieve('user', 'session', 'test')).rejects.toBeInstanceOf(SourceBlockedError);
    expect(retrieve).toHaveBeenCalledOnce();
  });
  it('fails closed on contradictory allowed/excluded data', async () => {
    const { gateway, retrieve } = setup({ allowed: true, state: 'EXCLUDED', reason: 'Bad response', rule_id: 'rule' });
    await expect(gateway.retrieve('user', 'session', 'test')).rejects.toBeInstanceOf(SourceBlockedError);
    expect(retrieve).not.toHaveBeenCalled();
  });
  it('requires an authorization record for an allowed ON_REQUEST decision', async () => {
    const { gateway, retrieve } = setup({ allowed: true, state: 'ON_REQUEST', reason: 'Malformed decision', rule_id: 'rule' });
    await expect(gateway.retrieve('user', 'session', 'test')).rejects.toBeInstanceOf(SourceBlockedError);
    expect(retrieve).not.toHaveBeenCalled();
  });
  it('does not treat a remembered or unknown reference as a retrieved hit', async () => {
    const retrieve = vi.fn();
    const gateway = new AuthorizedSourceGateway({ resolve: async () => null, retrieve }, { decide: vi.fn(), publish: vi.fn() });
    await expect(gateway.retrieve('user', 'session', 'unverified memory')).rejects.toBeInstanceOf(SourceBlockedError);
    expect(retrieve).not.toHaveBeenCalled();
  });
  it('rejects incomplete provider metadata before requesting text', async () => {
    const retrieve = vi.fn();
    const gateway = new AuthorizedSourceGateway({ resolve: async () => ({ ...descriptor, author_keys: [] }), retrieve }, { decide: vi.fn(), publish: vi.fn() });
    await expect(gateway.retrieve('user', 'session', 'test')).rejects.toBeInstanceOf(SourceBlockedError);
    expect(retrieve).not.toHaveBeenCalled();
  });
});
