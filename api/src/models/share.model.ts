import {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
  type Types,
} from "mongoose";

export const RESOURCE_TYPES = ["folder", "document"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const SHARE_PERMISSIONS = ["read"] as const;
export type SharePermission = (typeof SHARE_PERMISSIONS)[number];

const shareSchema = new Schema(
  {
    resourceType: {
      type: String,
      enum: RESOURCE_TYPES,
      required: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sharedWithUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    permission: {
      type: String,
      enum: SHARE_PERMISSIONS,
      default: "read",
    },
  },
  {
    // Use standard timestamps; we expose createdAt as "sharedAt" in the response
    timestamps: true,
  },
);

// Unique: prevent duplicate share records
shareSchema.index(
  { resourceType: 1, resourceId: 1, sharedWithUserId: 1 },
  { unique: true },
);
// Query "Shared with me"
shareSchema.index({ sharedWithUserId: 1 });
// Query "Shared by me"
shareSchema.index({ ownerId: 1 });
// Sort by creation time
shareSchema.index({ createdAt: -1 });

export type ShareDocument = HydratedDocument<InferSchemaType<typeof shareSchema>>;

export const Share = model("Share", shareSchema);

export interface ShareResponse {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  ownerId: string;
  sharedWithUserId: string;
  permission: SharePermission;
  sharedAt: Date;
}

export function toShareResponse(share: ShareDocument): ShareResponse {
  return {
    id: share._id.toString(),
    resourceType: share.resourceType as ResourceType,
    resourceId: (share.resourceId as Types.ObjectId).toString(),
    ownerId: (share.ownerId as Types.ObjectId).toString(),
    sharedWithUserId: (share.sharedWithUserId as Types.ObjectId).toString(),
    permission: share.permission as SharePermission,
    sharedAt: share.createdAt,
  };
}

