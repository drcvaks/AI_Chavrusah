import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text } from 'react-native';
import { signIn, signUp } from '../services/auth';
import { messageOf } from '../services/auth/controller';
import { Button, Card, Eyebrow, Field, Heading, Notice, Paragraph, Screen, colors } from './ui';

export function AuthForm({ createAccount = false }: { createAccount?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    setError(null); setNotice(null);
    if (!email.trim() || !password || (createAccount && !displayName.trim())) {
      setError('Please complete every field.'); return;
    }
    if (createAccount && password.length < 8) { setError('Choose a password with at least 8 characters.'); return; }
    setBusy(true);
    try {
      if (createAccount) {
        const activeSession = await signUp(email, password, displayName);
        if (!activeSession) {
          setSubmitted(true); setPassword('');
          setNotice('Check your email and open the confirmation link. Then return here and sign in.');
        }
      } else await signIn(email, password);
    } catch (reason) { setError(messageOf(reason)); }
    finally { setBusy(false); }
  }

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen>
      <Eyebrow>YOUR PERSONAL BEIS MIDRASH</Eyebrow>
      <Heading>AI Chavrusah</Heading>
      <Paragraph>A place for your learning, your questions, and the ideas you develop.</Paragraph>
      <Card>
        <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '600' }}>{createAccount ? 'Create your account' : 'Welcome back'}</Text>
        {createAccount && <Field label="Display name" value={displayName} onChangeText={setDisplayName} maxLength={80} autoComplete="name" editable={!busy && !submitted} />}
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" editable={!busy && !submitted} />
        {!submitted && <Field label="Password" value={password} onChangeText={setPassword} autoCapitalize="none" autoCorrect={false} secureTextEntry autoComplete={createAccount ? 'new-password' : 'current-password'} editable={!busy} onSubmitEditing={() => { if (!busy) void submit(); }} />}
        {error && <Notice error>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        {!submitted && <Button title={busy ? 'Please wait…' : createAccount ? 'Create account' : 'Sign in'} disabled={busy} onPress={() => { void submit(); }} />}
        <Link href={createAccount ? '/sign-in' : '/sign-up'} style={{ color: colors.ink, fontSize: 15, textAlign: 'center', padding: 8 }}>
          {createAccount ? 'Back to sign in' : 'New here? Create an account'}
        </Link>
      </Card>
      <Paragraph>Your learning is private to your account.</Paragraph>
    </Screen>
  </KeyboardAvoidingView>;
}
