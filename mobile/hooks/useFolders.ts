import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api-client";

export function useFolder(folderId: string) {
  return useQuery({
    queryKey: ["folder", folderId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: { id: string; name: string; parentId: string | null; color: string | null } }>(
        `/folders/${folderId}`,
      );
      return res.data.data;
    },
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; parentId?: string | null; color?: string }) => {
      const res = await api.post("/folders", data);
      return res.data;
    },
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["drive", vars.parentId ?? "root"] });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; color?: string; parentId?: string | null }) => {
      const res = await api.patch(`/folders/${id}`, data);
      return res.data;
    },
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["folder", vars.id] });
      void queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/folders/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}

export function usePermanentDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/folders/${id}/permanent`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}

export function useRestoreFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/folders/${id}/restore`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}

export function useToggleFolderStar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, star }: { id: string; star: boolean }) => {
      if (star) {
        await api.patch(`/folders/${id}/star`);
      } else {
        await api.delete(`/folders/${id}/star`);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}
