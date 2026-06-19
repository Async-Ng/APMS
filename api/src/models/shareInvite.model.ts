import { randomBytes } from "crypto";

import {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
  type Types,
} from "mongoose";

import { RESOURCE_TYPES, SHARE_PERMISSIONS, type ResourceType, type SharePermission } from "./share.model";

export const SHARE_INVITE_STATUSES = ["pending", "accepted", "revoked"] as const;
export type ShareInviteStatus = (typeof SHARE_INVITE_STATUSES)[number];

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

const shareInviteSchema = new Schema(
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
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    permission: {
      type: String,
      enum: SHARE_PERMISSIONS,
      default: "read",
    },
    status: {
      type: String,
      enum: SHARE_INVITE_STATUSES,
      default: "pending",
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + INVITE_EXPIRY_MS),
    },
  },
  {
    timestamps: true,
  },
);

shareInviteSchema.index({ email: 1 });
shareInviteSchema.index({ resourceType: 1, resourceId: 1, email: 1 });

export type ShareInviteDocument = HydratedDocument<InferSchemaType<typeof shareInviteSchema>>;

export const ShareInvite = model("ShareInvite", shareInviteSchema);

export interface ShareInviteResponse {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  ownerId: string;
  email: string;
  token: string;
  permission: SharePermission;
  status: ShareInviteStatus;
  expiresAt: Date;
}

export function toShareInviteResponse(invite: ShareInviteDocument): ShareInviteResponse {
  return {
    id: invite._id.toString(),
    resourceType: invite.resourceType as ResourceType,
    resourceId: (invite.resourceId as Types.ObjectId).toString(),
    ownerId: (invite.ownerId as Types.ObjectId).toString(),
    email: invite.email,
    token: invite.token,
    permission: invite.permission as SharePermission,
    status: invite.status as ShareInviteStatus,
    expiresAt: invite.expiresAt,
  };
}
