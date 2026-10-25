import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Card, Eyebrow, Heading, Notice, Paragraph, Screen } from '../../../components/ui';
import { SectionTitle } from '../../../components/learning-ui';
import { endLearningSession, getLearningSession } from '../../../services/learning';
import { requireSupabase } from '../../../lib/supabase';
import { contextLabels, formatTime, type LearningSession, type LearningNote, type ContextType } from '../../../domain/learning';
import { messageOf } from '../../../services/auth/controller';

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<LearningSession | null>(null);
  const [notes, setNotes] = useState<LearningNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setError(null); setSession(null); setNotes([]);
    void (async () => {
      const current = await getLearningSession(id);
      const links = await requireSupabase().from('note_sessions').select('note_id').eq('session_id', id);
      if (links.error) throw links.error;
      const result = links.data.length ? await requireSupabase().from('notes').select('*').in('id', links.data.map((link) => link.note_id)).order('updated_at', { ascending: false }) : { data: [], error: null };
      if (result.error) throw result.error;
      if (active) { setSession(current); setNotes(result.data!); }
    })().catch((reason) => { if (active) setError(messageOf(reason)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // A retry token intentionally restarts the focused request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refresh]));
  async function end() { setBusy(true); setError(null); try { setSession(await endLearningSession(id)); } catch (reason) { setError(messageOf(reason)); } finally { setBusy(false); } }
  return <Screen><Eyebrow>LEARNING SESSION</Eyebrow>{loading ? <Paragraph>Loading session…</Paragraph> : session && <>
    <Heading>{session.title}</Heading><Card>
      <Paragraph>{contextLabels[session.context_type as ContextType]} · {session.depth_mode === 'READING' ? 'Reading' : 'Be’iyun'}</Paragraph>
      <Paragraph>{[session.mesechta, session.daf, session.sefer, session.parsha, session.topic].filter(Boolean).join(' · ') || 'Open learning'}</Paragraph>
      <Paragraph>Started {formatTime(session.started_at)}{session.ended_at ? `\nEnded ${formatTime(session.ended_at)}` : ''}</Paragraph>
      <Button title="Write a note from this session" onPress={() => router.push({ pathname: '/notes/new', params: { sessionId: id } })} />
      {!session.ended_at && <Button title={busy ? 'Ending…' : 'End session'} secondary disabled={busy} onPress={() => { void end(); }} />}
    </Card><SectionTitle>Linked notes</SectionTitle>
    {notes.length ? notes.map((note) => <Card key={note.id}><SectionTitle>{note.title}</SectionTitle><Button title="Open note" secondary onPress={() => router.push({ pathname: '/notes/[id]', params: { id: note.id } })} /></Card>) : <Paragraph>No notes linked yet.</Paragraph>}
  </>}{error && <><Notice error>{error}</Notice><Button title="Try again" secondary onPress={() => setRefresh((value) => value + 1)} /></>}</Screen>;
}
