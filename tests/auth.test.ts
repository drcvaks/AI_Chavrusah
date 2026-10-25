import { describe, expect, it } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { AuthController, type AuthDependencies } from '../src/services/auth/controller';
import { canAccessAdmin, type Profile } from '../src/domain/models';
import { validateClientConfig } from '../src/lib/config';

const session = (id: string) => ({ user: { id } }) as Session;
const profile = (id: string, role: Profile['role'] = 'USER'): Profile => ({
  id, display_name: id, role, default_depth_mode: 'READING', created_at: '2026-10-07', updated_at: '2026-10-07',
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function setup(loadProfile: AuthDependencies['loadProfile'], getSession: AuthDependencies['getSession'] = async () => null) {
  let notify!: (value: Session | null) => void;
  const controller = new AuthController({ loadProfile, getSession, onSession: (callback) => { notify = callback; return () => {}; } });
  return { controller, notify: (value: Session | null) => notify(value) };
}

describe('authentication identity boundaries', () => {
  it('discards an admin profile returned after switching accounts', async () => {
    const delayed = deferred<Profile>();
    const { controller } = setup(async (id) => id === 'admin' ? delayed.promise : profile(id));
    await controller.start();
    const oldRequest = controller.setSession(session('admin'));
    await controller.setSession(session('learner'));
    delayed.resolve(profile('admin', 'GLOBAL_ADMIN'));
    await oldRequest;
    expect(controller.getSnapshot().profile?.id).toBe('learner');
    expect(canAccessAdmin('learner', controller.getSnapshot().profile)).toBe(false);
  });
  it('clears private state immediately on sign-out while a request is pending', async () => {
    const delayed = deferred<Profile>();
    const { controller } = setup(() => delayed.promise);
    await controller.start();
    const loading = controller.setSession(session('admin'));
    await controller.setSession(null);
    expect(controller.getSnapshot()).toEqual({ session: null, profile: null, loading: false, profileVerified: false, error: null });
    delayed.resolve(profile('admin', 'GLOBAL_ADMIN'));
    await loading;
    expect(controller.getSnapshot().profile).toBeNull();
  });
  it('does not let a stale startup session undo a newer sign-in event', async () => {
    const initial = deferred<Session | null>();
    const { controller, notify } = setup(async (id) => profile(id), () => initial.promise);
    const startup = controller.start();
    notify(session('new-user'));
    await Promise.resolve();
    initial.resolve(session('old-user'));
    await startup;
    expect(controller.getSnapshot().profile?.id).toBe('new-user');
  });
  it('fails closed on profile network errors, and recovers on retry', async () => {
    let offline = true;
    const { controller } = setup(async (id) => {
      if (offline) throw new Error('Offline');
      return profile(id, 'GLOBAL_ADMIN');
    });
    await controller.start();
    await controller.setSession(session('owner'));
    expect(controller.getSnapshot().error).toBe('Offline');
    expect(canAccessAdmin('owner', controller.getSnapshot().profile)).toBe(false);
    offline = false;
    await controller.refreshProfile();
    expect(canAccessAdmin('owner', controller.getSnapshot().profile)).toBe(true);
  });
  it('rejects mismatched profile identities even if the returned role is admin', async () => {
    const { controller } = setup(async () => profile('somebody-else', 'GLOBAL_ADMIN'));
    await controller.start();
    await controller.setSession(session('learner'));
    expect(controller.getSnapshot().profile).toBeNull();
    expect(controller.getSnapshot().error).toContain('does not match');
  });
  it('does not publish a late profile after its provider has stopped', async () => {
    const delayed = deferred<Profile>();
    const { controller } = setup(() => delayed.promise);
    await controller.start();
    const request = controller.setSession(session('owner'));
    controller.stop();
    delayed.resolve(profile('owner', 'GLOBAL_ADMIN'));
    await request;
    expect(controller.getSnapshot().profile).toBeNull();
  });
});

describe('same-account draft protection', () => {
  it('keeps the workspace mounted during revalidation without granting cached admin access', async () => {
    const delayed = deferred<Profile>();
    let pending = false;
    const { controller } = setup(async (id) => pending ? delayed.promise : profile(id, 'GLOBAL_ADMIN'));
    await controller.start(); await controller.setSession(session('owner')); pending = true;
    const refresh = controller.refreshProfile();
    const current = controller.getSnapshot();
    expect(current.loading).toBe(false);
    expect(current.profile?.id).toBe('owner');
    expect(canAccessAdmin('owner', current.profile, current.profileVerified)).toBe(false);
    delayed.resolve(profile('owner', 'GLOBAL_ADMIN')); await refresh;
    expect(controller.getSnapshot().profileVerified).toBe(true);
  });
  it('retains a same-account editor on refresh failure while failing admin access closed', async () => {
    let offline = false;
    const { controller } = setup(async (id) => { if (offline) throw new Error('Offline'); return profile(id, 'GLOBAL_ADMIN'); });
    await controller.start(); await controller.setSession(session('owner')); offline = true;
    await controller.refreshProfile();
    const current = controller.getSnapshot();
    expect(current.profile?.id).toBe('owner');
    expect(current.loading).toBe(false); expect(current.error).toBe('Offline');
    expect(canAccessAdmin('owner', current.profile, current.profileVerified)).toBe(false);
  });
});

describe('client configuration', () => {
  it('provides a setup error for missing values', () => {
    expect(validateClientConfig(undefined, undefined)).toContain('Create a local .env');
  });
  it('rejects invalid URLs and server secret keys', () => {
    expect(validateClientConfig('not-a-url', 'sb_publishable_test')).toContain('valid HTTP');
    expect(validateClientConfig('https://example.supabase.co', 'sb_secret_test')).toContain('not a secret');
  });
  it('accepts a hosted project with a publishable key', () => {
    expect(validateClientConfig('https://example.supabase.co', 'sb_publishable_test')).toBeNull();
  });
});
