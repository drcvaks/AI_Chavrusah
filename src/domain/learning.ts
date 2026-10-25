import type { Database } from '../types/database';
import type { DepthMode, FacetType } from './models';

export type LearningSession = Database['public']['Tables']['learning_sessions']['Row'];
export type LearningNote = Database['public']['Tables']['notes']['Row'];
export type NoteVersion = Database['public']['Tables']['note_versions']['Row'];
export type NoteFacet = { facet_type: FacetType; facet_value: string };
export type AnchorReference = { reference_label: string; why_central: string };
export const contextTypes = ['DAF_YOMI', 'PARSHA', 'PERSONAL_QUESTION', 'SHIUR', 'REVIEW', 'OTHER'] as const;
export type ContextType = typeof contextTypes[number];
export const contextLabels: Record<ContextType, string> = {
  DAF_YOMI: 'Daf Yomi', PARSHA: 'Parsha', PERSONAL_QUESTION: 'Personal question', SHIUR: 'Shiur', REVIEW: 'Review', OTHER: 'Other',
};
export const facetTypes: FacetType[] = ['DOMAIN', 'CORPUS', 'CONTEXT', 'TOPIC'];
export const facetLabels: Record<FacetType, string> = { DOMAIN: 'Domain / theme', CORPUS: 'Source corpus', CONTEXT: 'Learning context', TOPIC: 'Topic tags' };
export interface SessionDraft { title: string; depth_mode: DepthMode; context_type: ContextType; mesechta: string; daf: string; sefer: string; parsha: string; topic: string }
export interface NoteDraft { title: string; author_thesis: string; body: string; summary: string; change_reason: string; session_ids: string[]; facets: NoteFacet[]; anchors: AnchorReference[] }
export interface NoteDetail { note: LearningNote; version: NoteVersion; facets: NoteFacet[]; anchors: AnchorReference[]; sessionIds: string[] }

export function validateNoteDraft(draft: NoteDraft) {
  if (!draft.title.trim() || draft.title.trim().length > 200) throw new Error('Enter a title between 1 and 200 characters.');
  if (!draft.author_thesis.trim()) throw new Error('Write your author thesis / core idea before saving.');
  if (!draft.change_reason.trim()) throw new Error('Give this save a short change reason.');
  if (draft.anchors.length > 5) throw new Error('A note may have at most five anchor references.');
  if (draft.anchors.some((anchor) => !anchor.reference_label.trim() || anchor.reference_label.trim().length > 300)) throw new Error('Each anchor needs a reference of up to 300 characters.');
  if (draft.facets.some((facet) => !facetTypes.includes(facet.facet_type) || !facet.facet_value.trim() || facet.facet_value.trim().length > 100)) throw new Error('Each facet must have a value of up to 100 characters.');
}

export function parseFacets(values: Record<FacetType, string>): NoteFacet[] {
  return facetTypes.flatMap((type) => [...new Set(values[type].split(',').map((item) => item.trim()).filter(Boolean))]
    .map((value) => ({ facet_type: type, facet_value: value })));
}
export function formatTime(value: string) { return new Date(value).toLocaleString(); }
