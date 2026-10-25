import { requireSupabase } from '../../lib/supabase';
import { validateNoteDraft, type NoteDraft, type NoteDetail, type NoteFacet } from '../../domain/learning';

export async function listNotes() {
  const { data, error } = await requireSupabase().from('notes').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function getNote(id: string): Promise<NoteDetail> {
  const client = requireSupabase();
  const { data: note, error } = await client.from('notes').select('*').eq('id', id).single();
  if (error) throw new Error('This note is unavailable. Check your connection and account.');
  const results = await Promise.all([
    client.from('note_versions').select('*').eq('id', note.current_version_id).single(),
    client.from('note_facets').select('*').eq('note_id', id),
    client.from('note_anchor_sources').select('*').eq('note_id', id).order('rank'),
    client.from('note_sessions').select('session_id').eq('note_id', id),
  ]);
  for (const result of results) if (result.error) throw result.error;
  const [version, facets, anchors, sessions] = results;
  return { note, version: version.data!, facets: facets.data! as NoteFacet[], anchors: anchors.data!, sessionIds: sessions.data!.map((row) => row.session_id) };
}
export async function saveNote(draft: NoteDraft, noteId: string | null, expectedVersionId: string | null) {
  validateNoteDraft(draft);
  const { data, error } = await requireSupabase().rpc('save_learning_note', {
    p_note_id: noteId!, p_expected_version_id: expectedVersionId!,
    p_title: draft.title.trim(), p_author_thesis: draft.author_thesis.trim(), p_body: draft.body,
    p_summary: draft.summary, p_change_reason: draft.change_reason.trim(), p_session_ids: draft.session_ids,
    p_facets: draft.facets, p_anchors: draft.anchors,
  });
  if (error?.code === 'PT409') throw new Error('This note was changed elsewhere. Your draft is still here. Copy it before reloading, then merge your changes.');
  if (error) throw error;
  return data;
}
export async function listVersions(noteId: string) {
  const { data, error } = await requireSupabase().from('note_versions').select('*').eq('note_id', noteId).order('version_number', { ascending: false });
  if (error) throw error;
  return data;
}
export async function restoreVersion(noteId: string, versionId: string, expectedVersionId: string) {
  const { error } = await requireSupabase().rpc('restore_learning_note', { p_note_id: noteId, p_version_id: versionId, p_expected_version_id: expectedVersionId });
  if (error?.code === 'PT409') throw new Error('This note was changed elsewhere. Reload its history before restoring.');
  if (error) throw error;
}
