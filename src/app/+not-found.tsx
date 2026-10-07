import { router } from 'expo-router';
import { Button, Heading, Paragraph, Screen } from '../components/ui';
export default function NotFound() {
  return <Screen><Heading>Page unavailable.</Heading><Paragraph>Return to your workspace to continue.</Paragraph>
    <Button title="Go home" onPress={() => router.replace('/')} /></Screen>;
}
