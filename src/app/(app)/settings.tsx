import { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../providers/AuthProvider';
import { signOut, updateProfile } from '../../services/auth';
import { messageOf } from '../../services/auth/controller';
import type { DepthMode } from '../../domain/models';
import { Button, Card, Eyebrow, Field, Heading, Notice, Paragraph, Screen } from '../../components/ui';

export default function Settings() {
  const { session, profile, updateCurrentProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [depth, setDepth] = useState<DepthMode>(profile?.default_depth_mode ?? 'READING');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  async function save() {
    if (!session) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const updated = await updateProfile(session.user.id, name, depth);
      updateCurrentProfile(updated);
      setNotice('Preferences saved.');
    }
    catch (reason) { setError(messageOf(reason)); }
    finally { setBusy(false); }
  }
  async function leave() {
    setBusy(true); setError(null);
    try { await signOut(); }
    catch (reason) { setError(messageOf(reason)); setBusy(false); }
  }
  return <Screen><Eyebrow>ACCOUNT SETTINGS</Eyebrow><Heading>Your preferences.</Heading>
    <Paragraph>{session?.user.email}</Paragraph>
    <Card>
      <Field label="Display name" value={name} onChangeText={setName} maxLength={80} editable={!busy} />
      <Paragraph>Choose the starting depth for future learning sessions.</Paragraph>
      <View style={{ gap: 10 }}>
        <Button title={`${depth === 'READING' ? '✓ ' : ''}Reading · translation and pshat`} secondary={depth !== 'READING'} disabled={busy} onPress={() => setDepth('READING')} />
        <Button title={`${depth === 'BE_IYUN' ? '✓ ' : ''}Be’iyun · deeper exploration`} secondary={depth !== 'BE_IYUN'} disabled={busy} onPress={() => setDepth('BE_IYUN')} />
      </View>
      {error && <Notice error>{error}</Notice>}{notice && <Notice>{notice}</Notice>}
      <Button title={busy ? 'Please wait…' : 'Save preferences'} disabled={busy} onPress={() => { void save(); }} />
    </Card>
    <Button title="Sign out" secondary disabled={busy} onPress={() => { void leave(); }} />
  </Screen>;
}
