import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { configurationError } from '../lib/supabase';
import { signOut } from '../services/auth';
import { Button, Heading, Notice, Screen, colors } from '../components/ui';

function Navigation() {
  const { session, profile, loading, error, refreshProfile } = useAuth();
  if (loading) return <Screen><ActivityIndicator size="large" color={colors.ink} /><Notice>Opening your workspace…</Notice></Screen>;
  if (error || (session && !profile)) return <Screen>
    <Heading>Let’s reconnect</Heading><Notice error>{error ?? 'Your profile is unavailable.'}</Notice>
    <Button title="Try again" onPress={() => { void refreshProfile(); }} />
    {session && <Button title="Sign out" secondary onPress={() => { void signOut().catch(() => refreshProfile()); }} />}
  </Screen>;
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={!session}><Stack.Screen name="(auth)" /></Stack.Protected>
    <Stack.Protected guard={!!session && !!profile}><Stack.Screen name="(app)" /></Stack.Protected>
    <Stack.Screen name="+not-found" />
  </Stack>;
}

export default function RootLayout() {
  return <SafeAreaProvider><StatusBar style="dark" />
    {configurationError ? <Screen><Heading>Connect your workspace</Heading><Notice error>{configurationError}</Notice></Screen>
      : <AuthProvider><Navigation /></AuthProvider>}
  </SafeAreaProvider>;
}
