import type { DepthMode } from '../../domain/models';
import { requireSupabase } from '../../lib/supabase';
import type { AuthDependencies } from './controller';

export const authDependencies: AuthDependencies = {
  async getSession() {
    const { data, error } = await requireSupabase().auth.getSession();
    if (error) throw error;
    return data.session;
  },
  async loadProfile(userId) {
    const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', userId).single();
    if (error) throw new Error('Your profile could not be loaded. Check your connection and try again.');
    return data;
  },
  onSession(callback) {
    const { data } = requireSupabase().auth.onAuthStateChange((_event, session) => {
      // Return immediately: never await another auth/client call within this callback.
      callback(session);
    });
    return () => data.subscription.unsubscribe();
  },
};

export async function signIn(email: string, password: string) {
  const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function signUp(email: string, password: string, displayName: string) {
  const { data, error } = await requireSupabase().auth.signUp({
    email: email.trim(), password,
    options: { data: { display_name: displayName.trim() } },
  });
  if (error) throw error;
  return !!data.session;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function updateProfile(userId: string, displayName: string, depth: DepthMode) {
  const cleanName = displayName.trim();
  if (!cleanName || cleanName.length > 80) throw new Error('Enter a display name between 1 and 80 characters.');
  const { data, error } = await requireSupabase().from('profiles')
    .update({ display_name: cleanName, default_depth_mode: depth }).eq('id', userId).select('*').single();
  if (error) throw error;
  return data;
}
