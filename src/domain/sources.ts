import type { Database } from '../types/database';
export type { SourceDecision, SourceHit, CatalogItem, SavedSource } from '../../supabase/functions/_shared/sources/types';
export type SourceRule = Database['public']['Tables']['source_policy_rules']['Row'];
export const sourceScopes = ['CATEGORY', 'WORK', 'AUTHOR', 'VERSION'] as const;
export const sourceStates = ['APPROVED', 'ON_REQUEST', 'EXCLUDED'] as const;
export type SourceScope = typeof sourceScopes[number];
export type SourceState = typeof sourceStates[number];
export interface PolicyConfiguration { revision: number; rules: SourceRule[] }
