import { Stack } from 'expo-router';
import { useAuth } from '../../providers/AuthProvider';
import { canAccessAdmin } from '../../domain/models';
import { colors } from '../../components/ui';

export default function WorkspaceLayout() {
  const { session, profile } = useAuth();
  return <Stack screenOptions={{ headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, headerShadowVisible: false }}>
    <Stack.Screen name="index" options={{ title: 'AI Chavrusah' }} />
    <Stack.Screen name="my-learning" options={{ title: 'My Learning' }} />
    <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    <Stack.Protected guard={canAccessAdmin(session?.user.id, profile)}>
      <Stack.Screen name="admin" options={{ title: 'Admin' }} />
    </Stack.Protected>
  </Stack>;
}
