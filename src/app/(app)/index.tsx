import { router } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../providers/AuthProvider';
import { Button, Card, Eyebrow, Heading, Paragraph, Screen, colors } from '../../components/ui';

export default function Home() {
  const { profile, isAdmin } = useAuth();
  return <Screen>
    <Eyebrow>YOUR LEARNING WORKSPACE</Eyebrow>
    <Heading>Welcome, {profile?.display_name}.</Heading>
    <Paragraph>Make room for thoughtful learning.</Paragraph>
    <Card>
      <Text style={{ fontSize: 21, fontWeight: '600', color: colors.ink }}>My Learning</Text>
      <Paragraph>Create a learning session, develop a note, and return to earlier versions of your work.</Paragraph>
      <Button title="Open My Learning" onPress={() => router.push('/my-learning')} />
    </Card>
    <Button title="Account settings" secondary onPress={() => router.push('/settings')} />
    {isAdmin && <Button title="Admin workspace" secondary onPress={() => router.push('/admin')} />}
  </Screen>;
}
