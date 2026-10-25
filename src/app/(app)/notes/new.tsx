import { useLocalSearchParams } from 'expo-router';
import { NoteEditor } from '../../../components/NoteEditor';
export default function NewNote() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  return <NoteEditor key={sessionId ?? 'standalone'} initialSessionId={sessionId} />;
}
