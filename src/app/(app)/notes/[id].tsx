import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { getNote } from '../../../services/notes';
import { getLearningSession } from '../../../services/learning';
import { facetLabels, formatTime, type NoteDetail, type LearningSession } from '../../../domain/learning';
import { messageOf } from '../../../services/auth/controller';
import { Button, Card, Eyebrow, Heading, Notice, Paragraph, Screen, colors } from '../../../components/ui';
import { SectionTitle } from '../../../components/learning-ui';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<NoteDetail | null>(null); const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setDetail(null); setError(null);
    void getNote(id).then(async (current) => {
      const linked = await Promise.all(current.sessionIds.map(getLearningSession));
      if (active) { setDetail(current); setSessions(linked); }
    }).catch((failure) => { if (active) setError(messageOf(failure)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // A retry token intentionally restarts the focused request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, retry]));
  return <Screen><Eyebrow>LEARNING NOTE</Eyebrow>{loading ? <Paragraph>Loading note…</Paragraph> : detail && <>
    <Heading>{detail.note.title}</Heading><Paragraph>Version {detail.version.version_number} · {detail.version.author_display_name} · {formatTime(detail.version.created_at)}</Paragraph>
    <Button title="Edit note" onPress={() => router.push({ pathname: '/notes/[id]/edit', params: { id } })} />
    <Button title="View version history" secondary onPress={() => router.push({ pathname: '/notes/[id]/history', params: { id } })} />
    <Card><SectionTitle>Author thesis</SectionTitle><Text selectable style={{ color: colors.ink, lineHeight: 25, fontSize: 17 }}>{detail.version.author_thesis_snapshot}</Text></Card>
    {!!detail.version.summary && <Card><SectionTitle>Summary</SectionTitle><Paragraph>{detail.version.summary}</Paragraph></Card>}
    <Card><SectionTitle>Note</SectionTitle><Text selectable style={{ color: colors.ink, lineHeight: 27, fontSize: 17 }}>{detail.version.body || 'No body text yet.'}</Text></Card>
    <Card><SectionTitle>Organization</SectionTitle>{detail.facets.length ? detail.facets.map((facet) => <Paragraph key={`${facet.facet_type}:${facet.facet_value}`}>{facetLabels[facet.facet_type]}: {facet.facet_value}</Paragraph>) : <Paragraph>No facets added.</Paragraph>}</Card>
    <Card><SectionTitle>Anchor references · unverified</SectionTitle>{detail.anchors.length ? detail.anchors.map((anchor, index) => <Paragraph key={index}>{index + 1}. {anchor.reference_label}{anchor.why_central ? ` — ${anchor.why_central}` : ''}</Paragraph>) : <Paragraph>No anchors added.</Paragraph>}<Paragraph>These labels have not been retrieved or verified.</Paragraph></Card>
    {!!sessions.length && <Card><SectionTitle>Linked sessions</SectionTitle>{sessions.map((session) => <Button key={session.id} title={session.title} secondary onPress={() => router.push({ pathname: '/sessions/[id]', params: { id: session.id } })} />)}</Card>}
    <Paragraph>Created {formatTime(detail.note.created_at)} · {detail.note.author_display_name}</Paragraph>
  </>}{error && <><Notice error>{error}</Notice><Button title="Try again" onPress={() => setRetry((value) => value + 1)} /></>}</Screen>;
}
