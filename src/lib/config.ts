export function validateClientConfig(url: string | undefined, key: string | undefined) {
  if (!url || !key) {
    return 'Create a local .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart Expo.';
  }
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid protocol');
  } catch {
    return 'EXPO_PUBLIC_SUPABASE_URL must be a valid HTTP or HTTPS project URL.';
  }
  // Secret keys are never appropriate in a client bundle.
  if (key.startsWith('sb_secret_')) return 'Use the Supabase publishable key, not a secret key.';
  if (!key.startsWith('sb_publishable_')) {
    return 'Use the Supabase publishable key from the project Connect dialog.';
  }
  return null;
}
