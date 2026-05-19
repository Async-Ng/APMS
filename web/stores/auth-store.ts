import { create } from "zustand";

import { api } from "@/lib/api-client";

export interface AppUser {
  id: string;
  cognitoSub: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
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
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  fetchMe: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get<{ status: string; data: AppUser }>("/auth/me");
      set({ user: response.data.data, isLoading: false });
    } catch {
      set({
        user: null,
        isLoading: false,
        error: "Failed to load user profile",
      });
    }
  },
  clearUser: () => set({ user: null, error: null }),
}));
