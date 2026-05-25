import type { Types } from "mongoose";

import { AppError } from "../errors/AppError";
import { Document as ApmsDocument, toDocumentResponse } from "../models/document.model";
import { Folder, toFolderResponse } from "../models/folder.model";
import { Share, toShareResponse, type ShareDocument } from "../models/share.model";
import { User } from "../models/user.model";
import type { UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Verify resource exists and belongs to the owner */
async function assertResourceOwner(
  resourceType: "folder" | "document",
  resourceId: Types.ObjectId,
  ownerId: Types.ObjectId,
): Promise<void> {
  if (resourceType === "folder") {
    const folder = await Folder.findOne({ _id: resourceId, ownerId, deletedAt: null });
    if (!folder) {
      throw new AppError("Folder not found or you do not own it", 404);
    }
  } else {
    const doc = await ApmsDocument.findOne({ _id: resourceId, ownerId, deletedAt: null });
    if (!doc) {
      throw new AppError("Document not found or you do not own it", 404);
    }
  }
}

// ---------------------------------------------------------------------------
// createShares
// ---------------------------------------------------------------------------

export interface CreateSharesResult {
  created: ReturnType<typeof toShareResponse>[];
  skipped: number;
}

export async function createShares(
  owner: UserDocument,
  input: {
    resourceType: "folder" | "document";
    resourceId: string;
    sharedWithUserIds: string[];
  },
): Promise<CreateSharesResult> {
  const ownerId = owner._id;
  const resourceId = parseObjectId(input.resourceId, "resourceId");

  // 1. Verify resource exists and belongs to owner
  await assertResourceOwner(input.resourceType, resourceId, ownerId);

  // 2. Filter out self-share
  const recipientIds = input.sharedWithUserIds
    .map((id) => parseObjectId(id, "sharedWithUserIds"))
    .filter((id) => !id.equals(ownerId));

  if (recipientIds.length === 0) {
    return { created: [], skipped: input.sharedWithUserIds.length };
  }

  // 3. Verify all recipients exist and are active
  const existingUsers = await User.find({
    _id: { $in: recipientIds },
    isDisabled: false,
  }).select("_id");

  const validRecipientIds = existingUsers.map((u) => u._id as Types.ObjectId);

  const invalidCount = recipientIds.length - validRecipientIds.length;

  if (validRecipientIds.length === 0) {
    throw new AppError("None of the specified users were found or are active", 400);
  }

  // 4. Build share documents
  const shareDocs = validRecipientIds.map((sharedWithUserId) => ({
    resourceType: input.resourceType,
    resourceId,
    ownerId,
    sharedWithUserId,
    permission: "read" as const,
  }));

  // 5. insertMany with ordered:false — MongoDB skips duplicate-key errors silently
  let insertedDocs: ShareDocument[] = [];
  let duplicateCount = 0;

  try {
    const result = await Share.insertMany(shareDocs, { ordered: false });
    insertedDocs = result as unknown as ShareDocument[];
  } catch (err: unknown) {
    // Mongoose bulk write error: some succeeded, some failed (duplicates)
    if (
      err &&
      typeof err === "object" &&
      "name" in err &&
      (err as { name: string }).name === "MongoBulkWriteError"
    ) {
      const bulkErr = err as unknown as { insertedDocs: ShareDocument[]; result: { nInserted: number } };
      insertedDocs = bulkErr.insertedDocs ?? [];
      duplicateCount = shareDocs.length - (bulkErr.result?.nInserted ?? insertedDocs.length);
    } else {
      throw err;
    }
  }

  const totalSkipped = (input.sharedWithUserIds.length - recipientIds.length) // self-share
    + invalidCount                                                              // not found / disabled
    + duplicateCount;                                                           // already shared

  return {
    created: insertedDocs.map(toShareResponse),
    skipped: totalSkipped,
  };
}

// ---------------------------------------------------------------------------
// revokeShare
// ---------------------------------------------------------------------------

export async function revokeShare(owner: UserDocument, shareId: string): Promise<void> {
  const id = parseObjectId(shareId);

  const share = await Share.findById(id);
  if (!share) {
    throw new AppError("Share not found", 404);
  }

  const ownerId = owner._id;
  if (!(share.ownerId as unknown as Types.ObjectId).equals(ownerId)) {
    throw new AppError("You do not have permission to revoke this share", 403);
  }

  await share.deleteOne();
}

// ---------------------------------------------------------------------------
// revokeSharesByResource (used internally when deleting a folder/document)
// ---------------------------------------------------------------------------

export async function revokeSharesByResource(
  ownerId: Types.ObjectId,
  resourceType: "folder" | "document",
  resourceId: Types.ObjectId,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await Share.deleteMany({ ownerId, resourceType, resourceId } as any);
}

// ---------------------------------------------------------------------------
// listSharedWithMe
// ---------------------------------------------------------------------------

export interface SharedWithMeItem {
  share: ReturnType<typeof toShareResponse>;
  resource:
    | { type: "folder"; data: ReturnType<typeof toFolderResponse> }
    | { type: "document"; data: ReturnType<typeof toDocumentResponse> }
    | null;
}

export async function listSharedWithMe(user: UserDocument): Promise<SharedWithMeItem[]> {
  const shares = await Share.find({ sharedWithUserId: user._id } as any).sort({ createdAt: -1 });

  const results: SharedWithMeItem[] = await Promise.all(
    shares.map(async (share) => {
      const resourceId = share.resourceId as unknown as Types.ObjectId;
      const shareData = toShareResponse(share as unknown as ShareDocument);

      if ((share.resourceType as unknown as string) === "folder") {
        const folder = await Folder.findOne({ _id: resourceId, deletedAt: null });
        return {
          share: shareData,
          resource: folder ? { type: "folder" as const, data: toFolderResponse(folder) } : null,
        };
      } else {
        const doc = await ApmsDocument.findOne({ _id: resourceId, deletedAt: null });
        return {
          share: shareData,
          resource: doc ? { type: "document" as const, data: toDocumentResponse(doc) } : null,
        };
      }
    }),
  );

  // Filter out shares whose resource was permanently deleted
  return results.filter((r) => r.resource !== null);
}

// ---------------------------------------------------------------------------
// listSharedByMe
// ---------------------------------------------------------------------------

export interface SharedByMeItem {
  resourceType: "folder" | "document";
  resourceId: string;
  resource:
    | { type: "folder"; data: ReturnType<typeof toFolderResponse> }
    | { type: "document"; data: ReturnType<typeof toDocumentResponse> }
    | null;
  shares: (ReturnType<typeof toShareResponse> & { sharedWithUser: { id: string; displayName: string; email: string; avatarUrl: string | null } | null })[];
}

export async function listSharedByMe(user: UserDocument): Promise<SharedByMeItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shares = await Share.find({ ownerId: user._id } as any)
    .populate<{ sharedWithUserId: { _id: Types.ObjectId; displayName: string; email: string; avatarUrl?: string } }>(
      "sharedWithUserId",
      "_id displayName email avatarUrl",
    )
    .sort({ createdAt: -1 });

  // Group by resourceType + resourceId
  const grouped = new Map<string, (typeof shares)[number][]>();
  for (const share of shares) {
    const key = `${share.resourceType as unknown as string}:${(share.resourceId as unknown as Types.ObjectId).toString()}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(share);
  }

  const results = await Promise.all(
    Array.from(grouped.entries()).map(async ([, groupShares]) => {
      const first = groupShares[0];
      if (!first) return null;

      const resourceId = first.resourceId as unknown as Types.ObjectId;
      const resourceType = (first.resourceType as unknown as string) as "folder" | "document";

      let resource: SharedByMeItem["resource"] = null;

      if (resourceType === "folder") {
        const folder = await Folder.findOne({ _id: resourceId, deletedAt: null });
        if (folder) resource = { type: "folder", data: toFolderResponse(folder) };
      } else {
        const doc = await ApmsDocument.findOne({ _id: resourceId, deletedAt: null });
        if (doc) resource = { type: "document", data: toDocumentResponse(doc) };
      }

      const sharesWithUser = groupShares.map((s) => {
        const populated = s.sharedWithUserId as unknown as {
          _id: Types.ObjectId;
          displayName: string;
          email: string;
          avatarUrl?: string;
        } | null;

        return {
          ...toShareResponse(s as unknown as ShareDocument),
          sharedWithUser: populated
            ? {
                id: populated._id.toString(),
                displayName: populated.displayName,
                email: populated.email,
                avatarUrl: populated.avatarUrl ?? null,
              }
            : null,
        };
      });

      return {
        resourceType,
        resourceId: resourceId.toString(),
        resource,
        shares: sharesWithUser,
      } satisfies SharedByMeItem;
    }),
  );

  return results.filter((r): r is SharedByMeItem => r !== null);
}

// ---------------------------------------------------------------------------
// checkShareAccess — used internally by other services (future use)
// Returns true if `user` has read access to the given resource via shares
// (direct share OR inherited from a parent folder using $graphLookup).
// ---------------------------------------------------------------------------

export async function checkShareAccess(
  userId: Types.ObjectId,
  resourceType: "folder" | "document",
  resourceId: Types.ObjectId,
): Promise<boolean> {
  if (resourceType === "document") {
    // 1. Check direct share on the document
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const directShare = await Share.findOne({
      resourceType: "document",
      resourceId,
      sharedWithUserId: userId,
    } as any);
    if (directShare) return true;

    // 2. Find folderId of the document, then check folder inheritance
    const doc = await ApmsDocument.findOne({ _id: resourceId, deletedAt: null }).select("folderId");
    if (!doc?.folderId) return false;

    return checkShareAccess(userId, "folder", doc.folderId as Types.ObjectId);
  }

  // resourceType === "folder" — use $graphLookup to get all ancestor folder ids
  const pipeline = [
    { $match: { _id: resourceId } },
    {
      $graphLookup: {
        from: "folders",
        startWith: "$parentId",
        connectFromField: "parentId",
        connectToField: "_id",
        as: "ancestors",
        maxDepth: 50,
      },
    },
    {
      $project: {
        allIds: {
          $concatArrays: [["$_id"], "$ancestors._id"],
        },
      },
    },
  ];

  const [result] = await Folder.aggregate(pipeline);
  const ancestorIds: Types.ObjectId[] = result?.allIds ?? [resourceId];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const share = await Share.findOne({
    resourceType: "folder",
    resourceId: { $in: ancestorIds },
    sharedWithUserId: userId,
  } as any);

  return share !== null;
}
