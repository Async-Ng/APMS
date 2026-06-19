import { Types } from "mongoose";

import { createAppError, ErrorCode } from "../errors/error-codes";
import { Document as ApmsDocument } from "../models/document.model";
import { Folder } from "../models/folder.model";
import { Share } from "../models/share.model";
import { ShareInvite } from "../models/shareInvite.model";
import { User, type UserDocument } from "../models/user.model";

async function getResourceName(
  resourceType: "folder" | "document",
  resourceId: Types.ObjectId,
): Promise<string | null> {
  if (resourceType === "folder") {
    const folder = await Folder.findOne({ _id: resourceId, deletedAt: null }).select("name");
    return folder?.name ?? null;
  }
  const doc = await ApmsDocument.findOne({ _id: resourceId, deletedAt: null }).select(
    "originalFilename",
  );
  return doc?.originalFilename ?? null;
}

async function getValidInviteByToken(token: string) {
  const invite = await ShareInvite.findOne({ token });
  if (!invite) {
    throw createAppError(ErrorCode.SHARE_INVITE_NOT_FOUND, 404);
  }
  if (invite.status !== "pending") {
    throw createAppError(ErrorCode.SHARE_INVITE_NOT_FOUND, 404);
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    throw createAppError(ErrorCode.SHARE_INVITE_EXPIRED, 410);
  }
  return invite;
}

export interface InvitePreview {
  resourceType: "folder" | "document";
  resourceName: string;
  sharerName: string;
  email: string;
}

export async function getInvitePreview(token: string): Promise<InvitePreview> {
  const invite = await getValidInviteByToken(token);
  const resourceType = invite.resourceType as "folder" | "document";
  const resourceId = invite.resourceId as unknown as Types.ObjectId;

  const [resourceName, sharer] = await Promise.all([
    getResourceName(resourceType, resourceId),
    User.findById(invite.ownerId).select("displayName"),
  ]);

  if (!resourceName) {
    throw createAppError(ErrorCode.SHARE_RESOURCE_NOT_FOUND, 404);
  }

  return {
    resourceType,
    resourceName,
    sharerName: sharer?.displayName ?? "Một người dùng APMS",
    email: invite.email,
  };
}

export interface AcceptInviteResult {
  resourceType: "folder" | "document";
  resourceId: string;
}

export async function acceptInvite(
  token: string,
  user: UserDocument,
): Promise<AcceptInviteResult> {
  const invite = await getValidInviteByToken(token);

  if (invite.email !== user.email.toLowerCase()) {
    throw createAppError(ErrorCode.SHARE_INVITE_EMAIL_MISMATCH, 403);
  }

  const resourceType = invite.resourceType as "folder" | "document";
  const resourceId = invite.resourceId as unknown as Types.ObjectId;

  try {
    await Share.create({
      resourceType,
      resourceId,
      ownerId: invite.ownerId,
      sharedWithUserId: user._id,
      permission: invite.permission,
    });
  } catch (err: unknown) {
    // Duplicate key = already shared via another path — safe to ignore
    if (!(err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000)) {
      throw err;
    }
  }

  invite.status = "accepted";
  await invite.save();

  return {
    resourceType,
    resourceId: resourceId.toString(),
  };
}
