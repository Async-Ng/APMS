import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { AcademicProfile } from "@/lib/queries/catalog";
import { useAuthStore } from "@/stores/auth-store";

export function useUpdateDisplayName() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: async (displayName: string) => {
      const res = await api.patch<{
        status: string;
        data: {
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
        };
      }>("/users/me", { displayName });
      return res.data.data;
    },
    onSuccess: (user) => {
      setUser(user);
    },
  });
}

export function useUpdateAcademicProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      majorId: string;
      currentSemester: number;
      currentSubjectIds: string[];
    }) => {
      const res = await api.patch<{ status: string; data: AcademicProfile }>(
        "/users/me/academic-profile",
        input,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users", "me", "academic-profile"] });
      void qc.invalidateQueries({ queryKey: ["documents", "public"] });
    },
  });
}

