import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { getNote, saveNote } from '../services/notes';
import { listSessions } from '../services/learning';
import { messageOf } from '../services/auth/controller';
import { facetLabels, facetTypes, formatTime, parseFacets, type AnchorReference, type LearningSession, type NoteDetail } from '../domain/learning';
import type { FacetType } from '../domain/models';
import { Button, Card, Eyebrow, Field, Heading, Notice, Paragraph, Screen } from './ui';
import { Choice, SectionTitle } from './learning-ui';

export function NoteEditor({ noteId, initialSessionId }: { noteId?: string; initialSessionId?: string }) {
  const [detail, setDetail] = useState<NoteDetail | null>(null);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<string[]>(initialSessionId ? [initialSessionId] : []);
  const [title, setTitle] = useState(''); const [thesis, setThesis] = useState('');
  const [body, setBody] = useState(''); const [summary, setSummary] = useState('');
  const [reason, setReason] = useState(noteId ? '' : 'Initial manual note');
  const [facets, setFacets] = useState<Record<FacetType, string>>({ DOMAIN: '', CORPUS: '', CONTEXT: '', TOPIC: '' });
  const [anchors, setAnchors] = useState<AnchorReference[]>([]);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null); const [retry, setRetry] = useState(0);
  const alive = useRef(true);
  useEffect(() => {
    let active = true; alive.current = true;
    void Promise.all([listSessions(), noteId ? getNote(noteId) : Promise.resolve(null)]).then(([available, current]) => {
      if (!active) return;
      setSessions(available); setDetail(current);
      if (current) {
        setTitle(current.note.title); setThesis(current.version.author_thesis_snapshot); setBody(current.version.body); setSummary(current.version.summary);
        setSelectedSessions(current.sessionIds); setAnchors(current.anchors);
        setFacets(Object.fromEntries(facetTypes.map((type) => [type, current.facets.filter((facet) => facet.facet_type === type).map((facet) => facet.facet_value).join(', ')])) as Record<FacetType, string>);
      }
    }).catch((failure) => { if (active) { setError(messageOf(failure)); setLoadFailed(true); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; alive.current = false; };
  }, [noteId, retry]);
  async function save() {
    setBusy(true); setError(null);
    try {
      const id = await saveNote({ title, author_thesis: thesis, body, summary, change_reason: reason, session_ids: selectedSessions, facets: parseFacets(facets), anchors }, noteId ?? null, detail?.note.current_version_id ?? null);
      if (alive.current) {
        const destination = { pathname: '/notes/[id]' as const, params: { id } };
        if (noteId) router.dismissTo(destination);
        else router.replace(destination);
      }
    } catch (failure) { if (alive.current) { setError(messageOf(failure)); setBusy(false); } }
  }
  function changeAnchor(index: number, field: keyof AnchorReference, value: string) {
    setAnchors((previous) => previous.map((anchor, position) => position === index ? { ...anchor, [field]: value } : anchor));
  }
  if (loading) return <Screen><Paragraph>Loading note workspace…</Paragraph></Screen>;
  if (loadFailed) return <Screen><Notice error>{error}</Notice><Button title="Try again" onPress={() => { setLoading(true); setError(null); setLoadFailed(false); setRetry((value) => value + 1); }} /></Screen>;
  return <Screen><Eyebrow>{noteId ? 'EDIT YOUR NOTE' : 'NEW LEARNING NOTE'}</Eyebrow><Heading>{noteId ? 'Develop your idea.' : 'Keep what you learned.'}</Heading>
    {detail && <Paragraph>Editing version {detail.version.version_number} · {detail.version.author_display_name} · {formatTime(detail.version.created_at)}</Paragraph>}
    <Card>
      <Field label="Note title" value={title} onChangeText={setTitle} maxLength={200} editable={!busy} />
      <Field label="Author thesis / core idea" value={thesis} onChangeText={setThesis} multiline editable={!busy} style={{ minHeight: 90, textAlignVertical: 'top' }} />
      <Paragraph>Write your own central idea. Saving a changed thesis records it in the new version.</Paragraph>
      <Field label="Note body" value={body} onChangeText={setBody} multiline editable={!busy} style={{ minHeight: 240, textAlignVertical: 'top' }} />
      <Field label="Summary (optional)" value={summary} onChangeText={setSummary} multiline editable={!busy} />
    </Card>
    <Card><SectionTitle>Organization</SectionTitle><Paragraph>Use comma-separated tags. A note can belong to several themes and corpora.</Paragraph>
      {facetTypes.map((type) => <Field key={type} label={facetLabels[type]} value={facets[type]} onChangeText={(value) => setFacets((previous) => ({ ...previous, [type]: value }))} editable={!busy} />)}
    </Card>
    <Card><SectionTitle>Linked sessions</SectionTitle><Paragraph>Connect this note to any of your sessions.</Paragraph>
      {sessions.length ? sessions.map((session) => <Choice key={session.id} label={session.title} selected={selectedSessions.includes(session.id)} disabled={busy} onPress={() => setSelectedSessions((previous) => previous.includes(session.id) ? previous.filter((id) => id !== session.id) : [...previous, session.id])} />) : <Paragraph>No sessions yet. You can save a standalone topic note.</Paragraph>}
    </Card>
    <Card><SectionTitle>Anchor references ({anchors.length}/5)</SectionTitle><Paragraph>These are unverified discovery labels. They are not retrieved sources or verified citations. The note body has no five-reference limit.</Paragraph>
      {anchors.map((anchor, index) => <View key={index} style={{ gap: 10, borderTopWidth: 1, borderTopColor: '#DADFD7', paddingTop: 16 }}>
        <Field label={`Anchor ${index + 1} reference`} value={anchor.reference_label} onChangeText={(value) => changeAnchor(index, 'reference_label', value)} maxLength={300} editable={!busy} />
        <Field label={`Anchor ${index + 1} why central (optional)`} value={anchor.why_central} onChangeText={(value) => changeAnchor(index, 'why_central', value)} editable={!busy} />
        <Button title={`Remove anchor ${index + 1}`} secondary disabled={busy} onPress={() => setAnchors((previous) => previous.filter((_, position) => position !== index))} />
      </View>)}
      <Button title="Add anchor reference" secondary disabled={busy || anchors.length >= 5} onPress={() => setAnchors((previous) => [...previous, { reference_label: '', why_central: '' }])} />
    </Card>
    <Card><Field label="Change reason" value={reason} onChangeText={setReason} editable={!busy} />
      {error && <Notice error>{error}</Notice>}
      <Button title={busy ? 'Saving…' : noteId ? 'Save new version' : 'Save note'} disabled={busy} onPress={() => { void save(); }} />
      <Paragraph>Save explicitly before leaving. Existing versions remain unchanged.</Paragraph>
    </Card>
  </Screen>;
}
