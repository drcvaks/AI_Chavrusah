import type { SessionDraft } from '../../domain/learning';
import { requireSupabase } from '../../lib/supabase';

export async function listSessions() {
  const { data, error } = await requireSupabase().from('learning_sessions').select('*').order('started_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function getLearningSession(id: string) {
  const { data, error } = await requireSupabase().from('learning_sessions').select('*').eq('id', id).single();
  if (error) throw new Error('This session is unavailable. Check your connection and account.');
  return data;
}
export async function createLearningSession(userId: string, draft: SessionDraft) {
  if (!draft.title.trim() || draft.title.trim().length > 200) throw new Error('Enter a title between 1 and 200 characters.');
  const clean = (text: string) => text.trim() || null;
  const { data, error } = await requireSupabase().from('learning_sessions').insert({
    user_id: userId, title: draft.title.trim(), depth_mode: draft.depth_mode, context_type: draft.context_type,
    mesechta: clean(draft.mesechta), daf: clean(draft.daf), sefer: clean(draft.sefer), parsha: clean(draft.parsha), topic: clean(draft.topic),
  }).select('*').single();
  if (error) throw error;
  return data;
}
export async function endLearningSession(id: string) {
  const { data, error } = await requireSupabase().from('learning_sessions').update({ ended_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}
