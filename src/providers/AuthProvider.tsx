import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { authDependencies } from '../services/auth';
import { AuthController, type AuthState } from '../services/auth/controller';
import { supabase } from '../lib/supabase';
import type { Profile } from '../domain/models';

const AuthContext = createContext<(AuthState & { refreshProfile: () => Promise<void>; updateCurrentProfile: (profile: Profile) => void }) | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [controller] = useState(() => new AuthController(authDependencies));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => {
    void controller.start();
    if (Platform.OS === 'web') return () => controller.stop();
    const refresh = (status: string) => {
      if (status === 'active') supabase?.auth.startAutoRefresh();
      else supabase?.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const listener = AppState.addEventListener('change', (status) => {
      refresh(status);
      if (status === 'active') void controller.refreshProfile();
    });
    return () => { listener.remove(); supabase?.auth.stopAutoRefresh(); controller.stop(); };
  }, [controller]);

  return <AuthContext.Provider value={{ ...state, refreshProfile: controller.refreshProfile, updateCurrentProfile: controller.updateCurrentProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
