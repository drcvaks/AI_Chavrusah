import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';

export const colors = { paper: '#F7F4ED', ink: '#152F36', muted: '#596B6C', line: '#DADFD7', white: '#FFFFFF', accent: '#A87739', error: '#9C3131' };

export function Screen({ children }: PropsWithChildren) {
  return <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>{children}</View>
    </ScrollView>
  </SafeAreaView>;
}
export function Heading({ children }: PropsWithChildren) { return <Text style={styles.heading}>{children}</Text>; }
export function Paragraph({ children }: PropsWithChildren) { return <Text style={styles.paragraph}>{children}</Text>; }
export function Eyebrow({ children }: PropsWithChildren) { return <Text style={styles.eyebrow}>{children}</Text>; }
export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) { return <View style={[styles.card, style]}>{children}</View>; }
export function Notice({ children, error = false }: PropsWithChildren<{ error?: boolean }>) {
  return <Text accessibilityRole="alert" style={[styles.notice, error && { color: colors.error }]}>{children}</Text>;
}
export function Button({ title, onPress, disabled = false, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, (disabled || pressed) && { opacity: 0.65 }]}>
    <Text style={[styles.buttonLabel, secondary && { color: colors.ink }]}>{title}</Text>
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />
  </View>;
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 36 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 20 },
  eyebrow: { fontSize: 12, letterSpacing: 2, fontWeight: '700', color: colors.accent },
  heading: { fontSize: 32, lineHeight: 39, fontWeight: '700', color: colors.ink },
  paragraph: { fontSize: 16, lineHeight: 25, color: colors.muted },
  card: { backgroundColor: colors.white, padding: 24, borderRadius: 18, borderWidth: 1, borderColor: colors.line, gap: 16 },
  notice: { fontSize: 15, lineHeight: 23, color: colors.ink },
  button: { minHeight: 50, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  secondary: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  buttonLabel: { color: colors.white, fontSize: 16, fontWeight: '600' },
  field: { gap: 8 }, label: { fontSize: 14, fontWeight: '600', color: colors.ink },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: colors.ink },
});
