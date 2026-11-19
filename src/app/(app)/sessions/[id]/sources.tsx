import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { authorizeSource, getSourceCatalog, getSourceHistory, reopenSource, retrieveSource, revokeSource } from '../../../../services/sources';
import type { CatalogItem, SavedSource, SourceHit } from '../../../../domain/sources';
import { messageOf } from '../../../../services/auth/controller';
import { formatTime } from '../../../../domain/learning';
import { SectionTitle } from '../../../../components/learning-ui';
import { Button, Card, Eyebrow, Heading, Notice, Paragraph, Screen } from '../../../../components/ui';

export default function SessionSources() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]); const [history, setHistory] = useState<SavedSource[]>([]);
  const [hit, setHit] = useState<SourceHit | null>(null); const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setHit(null); setError(null);
    void Promise.all([getSourceCatalog(id), getSourceHistory(id)]).then(([sources, saved]) => { if (active) { setCatalog(sources); setHistory(saved); } })
      .catch((failure) => { if (active) setError(messageOf(failure)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // A reload token intentionally rechecks policy and discards previously displayed text.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, reload]));
  async function act(operation: () => Promise<SourceHit | void>) {
    setBusy(true); setError(null); setHit(null);
    try {
      const current = await operation();
      const [sources, saved] = await Promise.all([getSourceCatalog(id), getSourceHistory(id)]);
      setCatalog(sources); setHistory(saved); if (current) setHit(current);
    } catch (failure) { setError(messageOf(failure)); }
    finally { setBusy(false); }
  }
  return <Screen><Eyebrow>MOCK SOURCE CHECKS</Eyebrow><Heading>Test the source boundary.</Heading>
    <Paragraph>All samples are synthetic fixtures, not Torah text. Policies authorize access; they do not establish scholarship or verify a Torah claim.</Paragraph>
    {error && <Notice error>{error}</Notice>}
    <Button title="Recheck source access" secondary disabled={busy} onPress={() => setReload((value) => value + 1)} />
    {loading ? <Paragraph>Checking source policy…</Paragraph> : catalog.map((source) => <Card key={source.source_key}>
      <SectionTitle>{source.title}</SectionTitle><Paragraph>{source.work_key}{`\n`}{source.decision.state} · {source.decision.reason}</Paragraph>
      <Button title={`Retrieve ${source.title}`} disabled={busy} onPress={() => { void act(() => retrieveSource(id, source.source_key)); }} />
      {source.decision.state === 'ON_REQUEST' && source.decision.reason === 'EXPLICIT_PERMISSION_REQUIRED' && <Button title={`Allow ${source.title} for 60 minutes`} secondary disabled={busy} onPress={() => { void act(() => authorizeSource(id, source.source_key)); }} />}
      {source.decision.authorization_id && <><Paragraph>Permission expires {formatTime(source.decision.authorization_expires_at!)}</Paragraph>
        <Button title={`Revoke permission for ${source.title}`} secondary disabled={busy} onPress={() => { void act(() => revokeSource(source.decision.authorization_id!)); }} /></>}
    </Card>)}
    {hit && <Card><SectionTitle>{hit.title} · synthetic fixture</SectionTitle><Paragraph>{hit.canonical_ref} · {hit.version_title} · {hit.language}</Paragraph>
      <Paragraph>{hit.retrieved_text}</Paragraph><Paragraph>Original retrieval: {hit.policy_decision} · {formatTime(hit.retrieved_at)}{`\n`}Rule {hit.policy_rule_id}{`\n`}Policy revision {hit.policy_snapshot.revision}</Paragraph>
      {hit.current_access && <Paragraph>Current access: {hit.current_access.state} · {hit.current_access.reason}</Paragraph>}
      <Paragraph>Access was checked before this text was returned. Reopening always checks the current policy and permission.</Paragraph>
    </Card>}
    <SectionTitle>Saved source records ({history.length})</SectionTitle><Paragraph>History lists metadata only. Reopen reauthorizes the text.</Paragraph>
    {history.map((saved) => <Card key={saved.id}><SectionTitle>{saved.canonical_ref}</SectionTitle><Paragraph>{saved.policy_decision} at {formatTime(saved.retrieved_at)}{`\n`}Now: {saved.decision.state} · {saved.decision.reason}</Paragraph>
      <Button title={`Reopen ${saved.canonical_ref}`} secondary disabled={busy} onPress={() => { void act(() => reopenSource(id, saved.id)); }} /></Card>)}
  </Screen>;
}
