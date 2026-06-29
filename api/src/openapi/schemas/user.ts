import { USER_ROLES } from "../../models/user.model";
import { registry, z } from "../setup";
import { successEnvelope } from "./common";

export const userSchema = registry.register(
  "User",
  z
    .object({
      id: z.string(),
      cognitoSub: z.string(),
      email: z.string().email(),
      displayName: z.string(),
      avatarUrl: z.string().nullable(),
      role: z.enum(USER_ROLES),
      isDisabled: z.boolean(),
      curriculumId: z.string().nullable(),
      currentSemesterId: z.string().nullable(),
      currentSubjectIds: z.array(z.string()),
      storageUsedBytes: z.number(),
      storageQuotaBytes: z.number(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
    })
    .openapi("User"),
);

export const userSuccessResponseSchema = successEnvelope(userSchema, "User");
