import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../../domain/models';

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileVerified: boolean;
  error: string | null;
}

export interface AuthDependencies {
  getSession: () => Promise<Session | null>;
  loadProfile: (userId: string) => Promise<Profile>;
  onSession: (callback: (session: Session | null) => void) => () => void;
}

// Centralizes identity transitions so late network replies cannot leak another profile.
export class AuthController {
  private state: AuthState = { session: null, profile: null, loading: true, profileVerified: false, error: null };
  private listeners = new Set<() => void>();
  private revision = 0;
  private disposeSession: (() => void) | undefined;
  private active = false;

  constructor(private readonly dependencies: AuthDependencies) {}

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish(state: AuthState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }

  async start() {
    this.active = true;
    this.disposeSession = this.dependencies.onSession((session) => { void this.setSession(session); });
    const bootstrapRevision = this.revision;
    try {
      const session = await this.dependencies.getSession();
      if (this.active && bootstrapRevision === this.revision) await this.setSession(session);
    } catch (error) {
      if (this.active && bootstrapRevision === this.revision) {
        this.publish({ session: null, profile: null, loading: false, profileVerified: false, error: messageOf(error) });
      }
    }
  }

  stop() {
    this.active = false;
    this.revision++;
    this.disposeSession?.();
  }

  async setSession(session: Session | null) {
    const requestRevision = ++this.revision;
    // Keep an editor mounted during same-account refreshes. Identity changes
    // still clear private state immediately; cached roles are not authorized.
    const retained = session?.user.id === this.state.profile?.id ? this.state.profile : null;
    this.publish({ session, profile: retained, loading: !!session && !retained, profileVerified: false, error: null });
    if (!session) return;
    try {
      const profile = await this.dependencies.loadProfile(session.user.id);
      if (profile.id !== session.user.id) throw new Error('The returned profile does not match your account.');
      if (this.active && requestRevision === this.revision) {
        this.publish({ session, profile, loading: false, profileVerified: true, error: null });
      }
    } catch (error) {
      if (this.active && requestRevision === this.revision) {
        this.publish({ session, profile: retained, loading: false, profileVerified: false, error: messageOf(error) });
      }
    }
  }

  refreshProfile = () => this.setSession(this.state.session);

  updateCurrentProfile = (profile: Profile) => {
    if (this.state.session?.user.id !== profile.id) return;
    this.revision++;
    this.publish({ ...this.state, profile, loading: false, profileVerified: true, error: null });
  };
}

export function messageOf(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
