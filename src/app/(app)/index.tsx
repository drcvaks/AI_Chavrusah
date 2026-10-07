import { router } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../providers/AuthProvider';
import { canAccessAdmin } from '../../domain/models';
import { Button, Card, Eyebrow, Heading, Paragraph, Screen, colors } from '../../components/ui';

export default function Home() {
  const { session, profile } = useAuth();
  return <Screen>
    <Eyebrow>YOUR LEARNING WORKSPACE</Eyebrow>
    <Heading>Welcome, {profile?.display_name}.</Heading>
    <Paragraph>Make room for thoughtful learning.</Paragraph>
    <Card>
      <Text style={{ fontSize: 21, fontWeight: '600', color: colors.ink }}>My Learning</Text>
      <Paragraph>Your sessions and notes will have a home here as we build the next stage.</Paragraph>
      <Button title="Open My Learning" onPress={() => router.push('/my-learning')} />
    </Card>
    <Button title="Account settings" secondary onPress={() => router.push('/settings')} />
    {canAccessAdmin(session?.user.id, profile) && <Button title="Admin workspace" secondary onPress={() => router.push('/admin')} />}
  </Screen>;
}
