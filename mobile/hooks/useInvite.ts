import { useMutation, useQuery } from "@tanstack/react-query";

import { api } from "../lib/api-client";

export interface InvitePreview {
  resourceType: "folder" | "document";
  resourceName: string;
  sharerName: string;
  email: string;
}

export function useInvitePreview(token: string | undefined) {
  return useQuery({
    queryKey: ["invite", token],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: InvitePreview }>(`/invites/${token}`);
      return res.data.data;
    },
    enabled: Boolean(token),
    retry: false,
  });
}

export interface AcceptInviteResult {
  resourceType: "folder" | "document";
  resourceId: string;
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await api.post<{ status: string; data: AcceptInviteResult }>(
        `/invites/${token}/accept`,
      );
      return res.data.data;
    },
  });
}
