import { create } from 'zustand';
import api from '../api/client';
import { AxiosError } from 'axios';
import queryClient from '../lib/queryClient';
import useProcessingStore from './processingStore';
import type { UserInfo } from '../types';

// ---------------------------------------------------------------------------
// Remember-me persistence helpers
// ---------------------------------------------------------------------------

const AUTH_STORAGE_KEY = 'auth_session';

interface StoredAuth {
  user: UserInfo;
  expiresAt: number;
  mustReset: boolean;
}

function saveAuthToStorage(user: UserInfo, rememberMe: boolean, mustReset = false): void {
  if (rememberMe) {
    const data: StoredAuth = {
      user,
      expiresAt: Date.now() + (Number(import.meta.env.VITE_REMEMBER_ME_DAYS ?? 1)) * 86400_000,
      mustReset,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, expiresAt: 0, mustReset }));
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function loadStoredAuth(): { user: UserInfo | null; mustReset: boolean } {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const raw = storage.getItem(AUTH_STORAGE_KEY);
      if (!raw) continue;
      const data: StoredAuth = JSON.parse(raw);
      if (storage === localStorage && data.expiresAt <= Date.now()) {
        storage.removeItem(AUTH_STORAGE_KEY);
        continue;
      }
      return { user: data.user, mustReset: data.mustReset ?? false };
    } catch {
      storage.removeItem(AUTH_STORAGE_KEY);
    }
  }
  return { user: null, mustReset: false };
}

function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Store — NO async persist middleware to avoid rehydration timing issues
// Auth state is restored SYNCHRONOUSLY at module load time.
// ---------------------------------------------------------------------------

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;  // true while checking session validity on mount
  mustReset: boolean;  // true when user must set a new password on first login
  pendingEmail: string | null;  // email of must_reset user awaiting password set
  pendingPassword: string | null;  // initial password for must_reset flow
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserInfo | null) => void;
  checkSession: () => Promise<void>;
  clearMustReset: () => void;
  setPendingEmail: (email: string | null, password?: string | null) => void;
  loginWithToken: (token: string, userId: string) => Promise<void>;
}

// Load persisted user synchronously — available BEFORE first React render
const { user: persistedUser, mustReset: persistedMustReset } = loadStoredAuth();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: persistedUser,
  isAuthenticated: !!persistedUser,
  isLoading: true,  // true until first session check completes
  mustReset: persistedMustReset,
  pendingEmail: null,
  pendingPassword: null,

  login: async (email, password, rememberMe = false) => {
    try {
      const loginResp = await api.post('/auth/login', { email, password });
      const mustReset = loginResp.data.must_reset === true;
      const meResp = await api.get('/auth/me');
      const me = meResp.data;
      const user: UserInfo = {
        id: me.id,
        email: me.email,
        role: me.role,
        tenant_id: me.tenant_id,
        is_active: me.is_active,
        full_name: me.full_name ?? '',
        display_name: me.display_name ?? '',
        departments: (me.department_ids ?? []).map((id: string) => ({ id, name: '' })),
        stock_permissions: me.stock_permissions ?? [],
      };
      // Redirect to reset-password if must reset flag is set (first login)
      if (mustReset) {
        set({ user, isAuthenticated: true, mustReset: true });
        saveAuthToStorage(user, rememberMe, true);
        return;
      }
      saveAuthToStorage(user, rememberMe, false);
      set({ user, isAuthenticated: true, mustReset: false });
    } catch (err) {
      throw err as AxiosError;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    clearStoredAuth();
    queryClient.clear();
    useProcessingStore.getState().stopPolling();
    set({ user: null, isAuthenticated: false, mustReset: false });
  },

  setUser: (user) => {
    if (!user) clearStoredAuth();
    set({ user, isAuthenticated: !!user });
  },

  clearMustReset: () => {
    const { user } = get();
    if (user) saveAuthToStorage(user, localStorage.getItem(AUTH_STORAGE_KEY) !== null, false);
    set({ mustReset: false });
  },

  setPendingEmail: (email: string | null, password: string | null = null) => {
    set({ pendingEmail: email, pendingPassword: password });
  },

  loginWithToken: async (token: string, userId: string) => {
    // Store token temporarily, then fetch user info from /auth/me
    try {
      // Set token in cookie via a direct call — the backend will set HTTPOnly cookie on verify-magic
      // We just need to fetch /auth/me with the token we now possess
      const meResp = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const me = meResp.data;
      const user: UserInfo = {
        id: me.id,
        email: me.email,
        role: me.role,
        tenant_id: me.tenant_id,
        is_active: me.is_active,
        full_name: me.full_name ?? '',
        display_name: me.display_name ?? '',
        departments: (me.department_ids ?? []).map((id: string) => ({ id, name: '' })),
        stock_permissions: me.stock_permissions ?? [],
      };
      const mustReset = me.must_reset === true;
      saveAuthToStorage(user, false, mustReset);
      set({ user, isAuthenticated: true, mustReset });
    } catch (err) {
      throw err as AxiosError;
    }
  },

  /**
   * Validate current session by calling /auth/me.
   * Call this on app mount to re-confirm cookie-based auth.
   * Updates isAuthenticated based on server response.
   */
  checkSession: async () => {
    set({ isLoading: true });
    try {
      const meResp = await api.get('/auth/me');
      const me = meResp.data;
      const user: UserInfo = {
        id: me.id,
        email: me.email,
        role: me.role,
        tenant_id: me.tenant_id,
        is_active: me.is_active,
        full_name: me.full_name ?? '',
        display_name: me.display_name ?? '',
        departments: (me.department_ids ?? []).map((id: string) => ({ id, name: '' })),
        stock_permissions: me.stock_permissions ?? [],
      };
      const mustReset = me.must_reset === true;
      // Rehydrate persisted storage with fresh user data
      const rememberMe = localStorage.getItem(AUTH_STORAGE_KEY) !== null;
      saveAuthToStorage(user, rememberMe, mustReset);
      set({ user, isAuthenticated: true, isLoading: false, mustReset });
    } catch {
      clearStoredAuth();
      set({ user: null, isAuthenticated: false, isLoading: false, mustReset: false });
    }
  },
}));

export default useAuthStore;
