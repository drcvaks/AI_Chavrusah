import { describe, expect, it } from 'vitest';
import { parseFacets, validateNoteDraft, type NoteDraft } from '../src/domain/learning';

const draft = (): NoteDraft => ({ title: 'A topic', author_thesis: 'My idea', body: 'References: 1, 2, 3, 4, 5, 6', summary: '', change_reason: 'Initial note', session_ids: [], facets: [], anchors: [] });
describe('manual note integrity', () => {
  it('allows many themes and corpora without forcing a folder', () => {
    const facets = parseFacets({ DOMAIN: 'Halacha, Lomdus, Halacha', CORPUS: 'Gemara, Rambam', CONTEXT: 'Daf Yomi', TOPIC: 'Siman vs definition' });
    expect(facets.filter((facet) => facet.facet_type === 'DOMAIN')).toHaveLength(2);
    expect(facets.filter((facet) => facet.facet_type === 'CORPUS')).toHaveLength(2);
  });
  it('requires the learners own thesis', () => {
    expect(() => validateNoteDraft({ ...draft(), author_thesis: '  ' })).toThrow('author thesis');
  });
  it('requires a reason for a durable version', () => {
    expect(() => validateNoteDraft({ ...draft(), change_reason: ' ' })).toThrow('change reason');
  });
  it('rejects six discovery anchors while allowing more references in the body', () => {
    expect(() => validateNoteDraft(draft())).not.toThrow();
    expect(() => validateNoteDraft({ ...draft(), anchors: Array.from({ length: 6 }, (_, i) => ({ reference_label: `Source ${i}`, why_central: '' })) })).toThrow('five anchor');
  });
  it('accepts five anchors and prevents empty labels', () => {
    expect(() => validateNoteDraft({ ...draft(), anchors: Array.from({ length: 5 }, (_, i) => ({ reference_label: `Source ${i}`, why_central: '' })) })).not.toThrow();
    expect(() => validateNoteDraft({ ...draft(), anchors: [{ reference_label: ' ', why_central: '' }] })).toThrow('Each anchor');
  });
});
