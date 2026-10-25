import { useLocalSearchParams } from 'expo-router';
import { NoteEditor } from '../../../../components/NoteEditor';
export default function EditNote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NoteEditor key={id} noteId={id} />;
}
