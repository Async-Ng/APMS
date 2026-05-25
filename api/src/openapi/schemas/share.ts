import { registry, z } from "../setup";
import { successEnvelope } from "./common";

// Share record schema
export const shareSchema = registry.register(
  "Share",
  z
    .object({
      id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
      resourceType: z.enum(["folder", "document"]),
      resourceId: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
      ownerId: z.string(),
      sharedWithUserId: z.string(),
      permission: z.literal("read"),
      sharedAt: z.coerce.date(),
    })
    .openapi("Share"),
);

// Public user info (safe to expose in share context)
export const shareUserSchema = registry.register(
  "ShareUser",
  z
    .object({
      id: z.string(),
      displayName: z.string(),
      email: z.string().email(),
      avatarUrl: z.string().url().nullable(),
    })
    .openapi("ShareUser"),
);

// Response for createShares (batch)
export const createSharesResultSchema = registry.register(
  "CreateSharesResult",
  z
    .object({
      created: z.array(shareSchema),
      skipped: z
        .number()
        .int()
        .openapi({ description: "Number of recipients skipped (self-share, duplicate, or not found)" }),
    })
    .openapi("CreateSharesResult"),
);

export const createSharesSuccessSchema = successEnvelope(createSharesResultSchema, "CreateSharesResult");

// listSharedWithMe item
export const sharedWithMeItemSchema = registry.register(
  "SharedWithMeItem",
  z
    .object({
      share: shareSchema,
      resource: z
        .object({
          type: z.enum(["folder", "document"]),
          data: z.record(z.string(), z.unknown()),
        })
        .nullable()
        .openapi({ description: "The shared resource data" }),
    })
    .openapi("SharedWithMeItem"),
);

// listSharedByMe item
export const sharedByMeItemSchema = registry.register(
  "SharedByMeItem",
  z
    .object({
      resourceType: z.enum(["folder", "document"]),
      resourceId: z.string(),
      resource: z
        .object({
          type: z.enum(["folder", "document"]),
          data: z.record(z.string(), z.unknown()),
        })
        .nullable(),
      shares: z.array(
        shareSchema.extend({
          sharedWithUser: shareUserSchema.nullable(),
        }),
      ),
    })
    .openapi("SharedByMeItem"),
);

export const userSearchResultSchema = successEnvelope(
  registry.register("UserSearchList", z.array(shareUserSchema).openapi("UserSearchList")),
  "UserSearchList",
);

