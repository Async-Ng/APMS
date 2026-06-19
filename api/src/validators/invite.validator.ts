import { z } from "zod";

export const inviteTokenParamSchema = z.object({
  token: z.string().regex(/^[a-f\d]{64}$/i, "Invalid invite token"),
});
