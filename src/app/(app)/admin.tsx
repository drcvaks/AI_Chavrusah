import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../providers/AuthProvider';
import { getSourcePolicies, saveSourcePolicy } from '../../services/sources';
import { sourceScopes, sourceStates, type PolicyConfiguration, type SourceRule, type SourceScope, type SourceState } from '../../domain/sources';
import { messageOf } from '../../services/auth/controller';
import { Choice, SectionTitle } from '../../components/learning-ui';
import { Button, Card, Eyebrow, Field, Heading, Notice, Paragraph, Screen } from '../../components/ui';
export default function Admin() {
  const { isAdmin } = useAuth();
  const [configuration, setConfiguration] = useState<PolicyConfiguration | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [scope, setScope] = useState<SourceScope>('WORK'); const [key, setKey] = useState('');
  const [state, setState] = useState<SourceState>('APPROVED'); const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    if (!isAdmin) return;
    let active = true;
    void getSourcePolicies().then((data) => { if (active) setConfiguration(data); }).catch((failure) => { if (active) setError(messageOf(failure)); });
    return () => { active = false; };
  // A reload token intentionally refreshes the server revision without clearing a draft.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, reload]));
  function edit(rule: SourceRule) { setEditing(rule.id); setScope(rule.scope_type as SourceScope); setKey(rule.scope_key); setState(rule.state as SourceState); setReason(rule.reason); setNotice(null); }
  function reset() { setEditing(null); setScope('WORK'); setKey(''); setState('APPROVED'); setReason(''); }
  async function save(retire = false) {
    if (!configuration) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await saveSourcePolicy(editing, configuration.revision, scope, key, retire ? null : state, reason);
      setConfiguration(await getSourcePolicies()); reset(); setNotice(retire ? 'Rule retired. Its audit history is preserved.' : 'Global source policy saved.');
    } catch (failure) { setError(messageOf(failure)); }
    finally { setBusy(false); }
  }
  if (!isAdmin) return <Redirect href="/" />;
  return <Screen><Eyebrow>GLOBAL ADMIN</Eyebrow><Heading>Source stewardship.</Heading>
    <Paragraph>Any matching EXCLUDED rule wins. Otherwise: version, work, author, then category; a more specific category wins within that level. No matching rule means deny.</Paragraph>
    <Card><SectionTitle>{editing ? 'Edit rule' : 'Create rule'}</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{sourceScopes.map((value) => <Choice key={value} label={value} selected={scope === value} disabled={busy || !!editing} onPress={() => setScope(value)} />)}</View>
      <Field label="Scope key" value={key} onChangeText={setKey} maxLength={300} autoCapitalize="none" editable={!busy && !editing} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{sourceStates.map((value) => <Choice key={value} label={value} selected={state === value} disabled={busy} onPress={() => setState(value)} />)}</View>
      <Field label="Policy reason (optional)" value={reason} onChangeText={setReason} editable={!busy} />
      <Button title={busy ? 'Saving…' : 'Save global policy'} disabled={busy || !configuration} onPress={() => { void save(); }} />
      {editing && <><Button title="Retire this rule" secondary disabled={busy} onPress={() => { void save(true); }} /><Button title="Cancel editing" secondary disabled={busy} onPress={reset} /></>}
      <Paragraph>Retiring preserves old decisions. It does not approve a source; remaining rules or default denial apply.</Paragraph>
    </Card>
    <Card><SectionTitle>Mock keys for testing</SectionTitle><Paragraph>These are synthetic fixtures, not Torah sources. No real library is connected.</Paragraph>
      <Paragraph>Work keys: mock:work-a, mock:work-b, mock:work-c{`\n`}Category keys: mock, mock/reading, mock/commentary{`\n`}Author keys: mock:author-a, mock:author-b, mock:author-c{`\n`}Version keys: mock:edition-a, mock:edition-b, mock:edition-c</Paragraph>
      <Paragraph>To try the three states, create WORK rules: A APPROVED, B ON_REQUEST, C EXCLUDED. Then open Mock source checks from one of your sessions.</Paragraph>
    </Card>
    {notice && <Notice>{notice}</Notice>}{error && <Notice error>{error}</Notice>}
    <Button title="Reload policies" secondary disabled={busy} onPress={() => { setError(null); setReload((value) => value + 1); }} />
    <SectionTitle>Active global rules ({configuration?.rules.length ?? 0})</SectionTitle>
    {configuration?.rules.map((rule) => <Card key={rule.id}><SectionTitle>{rule.scope_key}</SectionTitle><Paragraph>{rule.scope_type} · {rule.state}{`\n`}{rule.reason || 'No reason recorded.'}{`\n`}Revision {rule.revision} · {rule.admin_display_name}</Paragraph><Button title={`Edit ${rule.scope_key}`} secondary disabled={busy} onPress={() => edit(rule)} /></Card>)}
  </Screen>;
}
