import { Redirect } from 'expo-router';
import { useAuth } from '../../providers/AuthProvider';
import { Card, Eyebrow, Heading, Paragraph, Screen } from '../../components/ui';
export default function Admin() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Redirect href="/" />;
  return <Screen><Eyebrow>GLOBAL ADMIN</Eyebrow><Heading>Source stewardship.</Heading>
    <Card><Paragraph>This workspace will hold the global source-library controls. Source-policy editing will be added in a later stage.</Paragraph></Card>
  </Screen>;
}
