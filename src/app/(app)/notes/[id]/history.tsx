import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { getNote, listVersions, restoreVersion } from '../../../../services/notes';
import { formatTime, type NoteVersion } from '../../../../domain/learning';
import { messageOf } from '../../../../services/auth/controller';
import { Button, Card, Eyebrow, Heading, Notice, Paragraph, Screen, colors } from '../../../../components/ui';
import { SectionTitle } from '../../../../components/learning-ui';

export default function History() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [currentId, setCurrentId] = useState(''); const [title, setTitle] = useState(''); const [selected, setSelected] = useState<NoteVersion | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setError(null);
    void Promise.all([getNote(id), listVersions(id)]).then(([detail, history]) => {
      if (active) { setCurrentId(detail.note.current_version_id); setTitle(detail.note.title); setVersions(history); setSelected(null); }
    }).catch((failure) => { if (active) setError(messageOf(failure)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // A retry token intentionally restarts the focused request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, retry]));
  async function restore() {
    if (!selected) return;
    setBusy(true); setError(null);
    try { await restoreVersion(id, selected.id, currentId); router.dismissTo({ pathname: '/notes/[id]', params: { id } }); }
    catch (failure) { setError(messageOf(failure)); setBusy(false); }
  }
  return <Screen><Eyebrow>VERSION HISTORY</Eyebrow><Heading>{title || 'Your note history'}</Heading>
    <Paragraph>Restoring appends a new version of the title, thesis, summary and body. Current facets, anchors and session links stay as they are.</Paragraph>
    {loading ? <Paragraph>Loading versions…</Paragraph> : versions.map((version) => <Card key={version.id}>
      <SectionTitle>Version {version.version_number}{version.id === currentId ? ' · current' : ''}</SectionTitle>
      <Paragraph>{version.author_display_name} · {formatTime(version.created_at)}{`\n`}{version.change_reason}</Paragraph>
      <Button title={`View version ${version.version_number}`} secondary disabled={busy} onPress={() => setSelected(version)} />
    </Card>)}
    {selected && <Card><SectionTitle>Version {selected.version_number}: {selected.title_snapshot}</SectionTitle>
      <Paragraph>Author thesis: {selected.author_thesis_snapshot}</Paragraph>{!!selected.summary && <Paragraph>Summary: {selected.summary}</Paragraph>}
      <Text selectable style={{ color: colors.ink, lineHeight: 25, fontSize: 16 }}>{selected.body || 'No body text.'}</Text>
      <Button title={busy ? 'Restoring…' : `Restore version ${selected.version_number} as a new version`} disabled={busy || loading || selected.id === currentId} onPress={() => { void restore(); }} />
    </Card>}
    {error && <><Notice error>{error}</Notice><Button title="Reload history" secondary onPress={() => setRetry((value) => value + 1)} /></>}
  </Screen>;
}
