import { Pressable, Text, View } from 'react-native';
import { colors } from './ui';
import type { DepthMode } from '../domain/models';

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: colors.ink, fontSize: 21, fontWeight: '600' }}>{children}</Text>;
}
export function Choice({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: selected, disabled }} onPress={onPress} disabled={disabled}
    style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: selected ? colors.ink : colors.line, backgroundColor: selected ? colors.ink : colors.white }}>
    <Text style={{ color: selected ? colors.white : colors.ink, fontSize: 15 }}>{selected ? '✓ ' : ''}{label}</Text>
  </Pressable>;
}
export function DepthChoice({ value, onChange, disabled }: { value: DepthMode; onChange: (value: DepthMode) => void; disabled?: boolean }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
    <Choice label="Reading" selected={value === 'READING'} onPress={() => onChange('READING')} disabled={disabled} />
    <Choice label="Be’iyun" selected={value === 'BE_IYUN'} onPress={() => onChange('BE_IYUN')} disabled={disabled} />
  </View>;
}
