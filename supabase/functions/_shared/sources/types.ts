export type PolicyState = 'APPROVED' | 'ON_REQUEST' | 'EXCLUDED' | 'DENIED';
export interface SourceDecision {
  allowed: boolean; state: PolicyState; reason: string; rule_id?: string;
  rule_revision?: number; revision?: number; matched_rule_ids?: string[];
  authorization_id?: string | null; authorization_expires_at?: string | null;
}
export interface SourceDescriptor {
  source_key: string; provider: string; canonical_ref: string; title: string;
  category_keys: string[]; work_key: string; author_keys: string[];
  version_key: string; version_title: string; language: string; is_mock: boolean;
}
export interface SourceHit {
  id: string; session_id: string; source_key: string; provider: string;
  canonical_ref: string; title: string; version_title: string; language: string;
  retrieved_text: string; is_mock: boolean; policy_rule_id: string;
  policy_decision: 'APPROVED' | 'ON_REQUEST_AUTHORIZED'; policy_snapshot: SourceDecision;
  retrieved_at: string; provenance_metadata: Record<string, unknown>;
  current_access?: SourceDecision;
}
export type CatalogItem = SourceDescriptor & { decision: SourceDecision };
export interface SavedSource {
  id: string; title: string; canonical_ref: string; retrieved_at: string; is_mock: boolean;
  policy_decision: string; policy_rule_id: string; decision: SourceDecision;
}
