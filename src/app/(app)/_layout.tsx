import { Stack } from 'expo-router';
import { useAuth } from '../../providers/AuthProvider';
import { colors } from '../../components/ui';

export default function WorkspaceLayout() {
  const { isAdmin } = useAuth();
  return <Stack screenOptions={{ headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, headerShadowVisible: false }}>
    <Stack.Screen name="index" options={{ title: 'AI Chavrusah' }} />
    <Stack.Screen name="my-learning" options={{ title: 'My Learning' }} />
    <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    <Stack.Screen name="sessions/new" options={{ title: 'New session' }} />
    <Stack.Screen name="sessions/[id]" options={{ title: 'Learning session' }} />
    <Stack.Screen name="notes/new" options={{ title: 'New note' }} />
    <Stack.Screen name="notes/[id]" options={{ title: 'Learning note' }} />
    <Stack.Screen name="notes/[id]/edit" options={{ title: 'Edit note' }} />
    <Stack.Screen name="notes/[id]/history" options={{ title: 'Version history' }} />
    <Stack.Protected guard={isAdmin}>
      <Stack.Screen name="admin" options={{ title: 'Admin' }} />
    </Stack.Protected>
  </Stack>;
}
