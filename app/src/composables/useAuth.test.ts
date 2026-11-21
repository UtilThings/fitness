import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const store = {
    record: null as { email: string; avatar?: string } | null,
    isValid: false,
    listeners: [] as Array<() => void>,
    onChange(cb: () => void) {
      store.listeners.push(cb);
    },
    clear() {
      store.record = null;
      store.isValid = false;
      store.listeners.forEach((cb) => cb());
    },
  };
  const authWithPassword = vi.fn();
  const requestPasswordReset = vi.fn();
  return { store, authWithPassword, requestPasswordReset };
});

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    authStore: mocks.store,
    files: {
      getURL: (_r: unknown, f: string, o: { thumb: string }) =>
        `http://pb/files/${f}?thumb=${o.thumb}`,
    },
    collection: () => ({
      authWithPassword: mocks.authWithPassword,
      requestPasswordReset: mocks.requestPasswordReset,
    }),
  },
}));

import { useAuth } from '@/composables/useAuth';

describe('useAuth', () => {
  beforeEach(() => {
    mocks.store.clear();
    mocks.authWithPassword.mockReset();
    mocks.requestPasswordReset.mockReset();
  });

  it('login correcto actualiza el estado', async () => {
    mocks.authWithPassword.mockImplementation(async () => {
      mocks.store.record = { email: 'a@b.co' };
      mocks.store.isValid = true;
      mocks.store.listeners.forEach((cb) => cb());
    });
    const { login, isAuthenticated, user } = useAuth();
    await login('a@b.co', 'secreto123');
    expect(mocks.authWithPassword).toHaveBeenCalledWith('a@b.co', 'secreto123');
    expect(isAuthenticated.value).toBe(true);
    expect(user.value).toEqual({ email: 'a@b.co' });
  });

  it('login fallido propaga el error', async () => {
    mocks.authWithPassword.mockRejectedValue(new Error('400'));
    const { login, isAuthenticated } = useAuth();
    await expect(login('a@b.co', 'mal')).rejects.toThrow('400');
    expect(isAuthenticated.value).toBe(false);
  });

  it('logout limpia la sesión', () => {
    mocks.store.record = { email: 'a@b.co' };
    mocks.store.isValid = true;
    const { logout, isAuthenticated, user } = useAuth();
    logout();
    expect(isAuthenticated.value).toBe(false);
    expect(user.value).toBeNull();
  });

  it('requestPasswordReset llama a PocketBase y propaga errores', async () => {
    const { requestPasswordReset } = useAuth();
    await requestPasswordReset('a@b.co');
    expect(mocks.requestPasswordReset).toHaveBeenCalledWith('a@b.co');
    mocks.requestPasswordReset.mockRejectedValue(new Error('red'));
    await expect(requestPasswordReset('a@b.co')).rejects.toThrow('red');
  });

  it('avatarUrl usa el campo avatar del usuario', () => {
    mocks.store.record = { email: 'a@b.co', avatar: 'foto.png' };
    mocks.store.isValid = true;
    mocks.store.listeners.forEach((cb) => cb());
    const { avatarUrl } = useAuth();
    expect(avatarUrl.value).toBe('http://pb/files/foto.png?thumb=100x100');
    mocks.store.record = { email: 'a@b.co' };
    mocks.store.listeners.forEach((cb) => cb());
    expect(avatarUrl.value).toBeUndefined();
  });
});
