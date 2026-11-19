import type { SourceDecision, SourceDescriptor, SourceHit } from './types.ts';

export class SourceBlockedError extends Error {
  constructor(public readonly decision: SourceDecision) { super('Source blocked by current policy or permission.'); }
}
export interface SourceProvider {
  resolve(actor: string, key: string): Promise<SourceDescriptor | null>;
  retrieve(actor: string, source: SourceDescriptor): Promise<string>;
}
export interface SourceRepository {
  decide(actor: string, session: string, key: string): Promise<SourceDecision>;
  publish(actor: string, session: string, key: string, text: string): Promise<SourceHit>;
}
export interface SourceGateway {
  retrieve(actor: string, session: string, key: string): Promise<SourceHit>;
}
export class AuthorizedSourceGateway implements SourceGateway {
  constructor(private provider: SourceProvider, private repository: SourceRepository) {}
  async retrieve(actor: string, session: string, key: string) {
    const source = await this.provider.resolve(actor, key);
    if (!source || !source.work_key || !source.version_key || !source.category_keys.length || !source.author_keys.length) {
      throw new SourceBlockedError({ allowed: false, state: 'DENIED', reason: 'UNKNOWN_OR_INCOMPLETE_SOURCE' });
    }
    const decision = await this.repository.decide(actor, session, key);
    // Fail closed even if a malformed policy response says allowed + EXCLUDED.
    if (decision.allowed !== true || !['APPROVED', 'ON_REQUEST'].includes(decision.state) || !decision.rule_id || (decision.state === 'ON_REQUEST' && !decision.authorization_id)) throw new SourceBlockedError(decision);
    const text = await this.provider.retrieve(actor, source);
    if (!text) throw new Error('Provider returned no source text.');
    // The transaction rechecks CURRENT policy/grants. Nothing is returned before
    // this commit, including when policy changes while the provider is running.
    return this.repository.publish(actor, session, key, text);
  }
}
