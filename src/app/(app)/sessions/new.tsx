import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../../providers/AuthProvider';
import { createLearningSession } from '../../../services/learning';
import { messageOf } from '../../../services/auth/controller';
import { contextLabels, contextTypes, type SessionDraft } from '../../../domain/learning';
import { Choice, DepthChoice } from '../../../components/learning-ui';
import { Button, Card, Eyebrow, Field, Heading, Notice, Screen } from '../../../components/ui';

export default function NewSession() {
  const { session, profile } = useAuth();
  const [draft, setDraft] = useState<SessionDraft>({ title: '', depth_mode: profile?.default_depth_mode ?? 'READING', context_type: 'OTHER', mesechta: '', daf: '', sefer: '', parsha: '', topic: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const change = <K extends keyof SessionDraft>(key: K, value: SessionDraft[K]) => setDraft((previous) => ({ ...previous, [key]: value }));
  async function save() {
    if (!session) return;
    setBusy(true); setError(null);
    try { const created = await createLearningSession(session.user.id, draft); router.replace({ pathname: '/sessions/[id]', params: { id: created.id } }); }
    catch (reason) { setError(messageOf(reason)); setBusy(false); }
  }
  return <Screen><Eyebrow>START A SESSION</Eyebrow><Heading>What are you learning?</Heading><Card>
    <Field label="Session title" value={draft.title} onChangeText={(value) => change('title', value)} maxLength={200} editable={!busy} />
    <DepthChoice value={draft.depth_mode} onChange={(value) => change('depth_mode', value)} disabled={busy} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{contextTypes.map((type) => <Choice key={type} label={contextLabels[type]} selected={draft.context_type === type} onPress={() => change('context_type', type)} disabled={busy} />)}</View>
    {(['mesechta', 'daf', 'sefer', 'parsha', 'topic'] as const).map((key) => <Field key={key} label={({ mesechta: 'Masechta', daf: 'Daf / page', sefer: 'Sefer', parsha: 'Parsha', topic: 'Topic' })[key]} value={draft[key]} onChangeText={(value) => change(key, value)} editable={!busy} />)}
    {error && <Notice error>{error}</Notice>}<Button title={busy ? 'Creating…' : 'Create session'} disabled={busy} onPress={() => { void save(); }} />
  </Card></Screen>;
}
