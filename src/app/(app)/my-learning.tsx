import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { listNotes } from '../../services/notes';
import { listSessions } from '../../services/learning';
import { requireSupabase } from '../../lib/supabase';
import { facetLabels, facetTypes, formatTime, type LearningNote, type LearningSession, type NoteFacet } from '../../domain/learning';
import type { FacetType } from '../../domain/models';
import { messageOf } from '../../services/auth/controller';
import { Button, Card, Eyebrow, Field, Heading, Notice, Paragraph, Screen } from '../../components/ui';
import { Choice, SectionTitle } from '../../components/learning-ui';

export default function MyLearning() {
  const [sessions, setSessions] = useState<LearningSession[]>([]); const [notes, setNotes] = useState<LearningNote[]>([]);
  const [facets, setFacets] = useState<(NoteFacet & { note_id: string })[]>([]);
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState(''); const [filterType, setFilterType] = useState<FacetType>('DOMAIN');
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setError(null);
    void Promise.all([listSessions(), listNotes(), requireSupabase().from('note_facets').select('*')]).then(([allSessions, allNotes, allFacets]) => {
      if (allFacets.error) throw allFacets.error;
      if (active) { setSessions(allSessions); setNotes(allNotes); setFacets(allFacets.data as (NoteFacet & { note_id: string })[]); }
    }).catch((failure) => { if (active) setError(messageOf(failure)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // A retry token intentionally restarts the focused request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry]));
  const query = search.trim().toLowerCase(); const facetQuery = filter.trim().toLowerCase();
  const visibleNotes = notes.filter((note) => (!query || `${note.title} ${note.author_thesis}`.toLowerCase().includes(query)) && (!facetQuery || facets.some((facet) => facet.note_id === note.id && facet.facet_type === filterType && facet.facet_value.toLowerCase().includes(facetQuery))));
  return <Screen><Eyebrow>MY LEARNING</Eyebrow><Heading>Return to your ideas.</Heading>
    <Button title="Create learning session" onPress={() => router.push('/sessions/new')} />
    <Button title="Write a standalone note" secondary onPress={() => router.push('/notes/new')} />
    {loading ? <Paragraph>Loading your library…</Paragraph> : <>
      <Card><SectionTitle>Find a note</SectionTitle><Field label="Search title or thesis" value={search} onChangeText={setSearch} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{facetTypes.map((type) => <Choice key={type} label={facetLabels[type]} selected={filterType === type} onPress={() => setFilterType(type)} />)}</View>
        <Field label="Filter by facet value" value={filter} onChangeText={setFilter} placeholder="For example: Halacha" />
      </Card><SectionTitle>Notes ({visibleNotes.length})</SectionTitle>
      {visibleNotes.map((note) => <Card key={note.id}><SectionTitle>{note.title}</SectionTitle><Paragraph>{note.author_thesis}</Paragraph><Paragraph>{note.author_display_name} · updated {formatTime(note.updated_at)}</Paragraph>
        <Button title="Open note" secondary onPress={() => router.push({ pathname: '/notes/[id]', params: { id: note.id } })} /></Card>)}
      {!visibleNotes.length && <Paragraph>{notes.length ? 'No notes match this search.' : 'No notes yet. Start with a session or write a topic note.'}</Paragraph>}
      <SectionTitle>Sessions ({sessions.length})</SectionTitle>
      {sessions.map((session) => <Card key={session.id}><SectionTitle>{session.title}</SectionTitle><Paragraph>{[session.mesechta, session.daf, session.topic].filter(Boolean).join(' · ')}{`\n`}{session.depth_mode === 'READING' ? 'Reading' : 'Be’iyun'} · {session.ended_at ? 'Ended' : 'Open'}</Paragraph>
        <Button title="Open session" secondary onPress={() => router.push({ pathname: '/sessions/[id]', params: { id: session.id } })} /></Card>)}
      {!sessions.length && <Paragraph>No learning sessions yet.</Paragraph>}
    </>}{error && <><Notice error>{error}</Notice><Button title="Try again" onPress={() => setRetry((value) => value + 1)} /></>}
  </Screen>;
}
