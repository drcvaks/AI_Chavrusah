import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { Database } from '../types/database';
import { validateClientConfig } from './config';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const configurationError = validateClientConfig(url, key);

export const supabase = configurationError ? null : createClient<Database>(url!, key!, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export function requireSupabase() {
  if (!supabase) throw new Error(configurationError ?? 'Supabase is not configured.');
  return supabase;
}
