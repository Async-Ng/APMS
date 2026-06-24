import { fetchAuthSession } from "aws-amplify/auth";
import { create } from "zustand";

import { api } from "../lib/api-client";
import { registerAuthSessionHandlers } from "../lib/auth-session";
import { getUserErrorMessage } from "../lib/errors";

export interface AppUser {
  id: string;
  cognitoSub: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: "user" | "admin";
  isDisabled: boolean;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  error: string | null;
  fetchMe: () => Promise<void>;
  setUser: (user: AppUser) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  fetchMe: async () => {
    const hadUser = get().user !== null;
    if (!hadUser) {
      set({ isLoading: true, error: null });
    }

    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        set({ user: null, error: null });
        return;
      }

      const response = await api.get<{ status: string; data: AppUser }>("/auth/me");
      set({ user: response.data.data, error: null });
    } catch (err) {
      if (!hadUser) {
        set({
          user: null,
          error: getUserErrorMessage(err),
        });
      }
    } finally {
      if (!hadUser) {
        set({ isLoading: false });
      }
    }
  },
  setUser: (user) => set({ user, error: null }),
  clearUser: () => set({ user: null, error: null, isLoading: false }),
}));

registerAuthSessionHandlers({
  clearUser: () => useAuthStore.getState().clearUser(),
});
