import type { AuthUser } from "../middleware/authenticate";
import { User, type UserDocument, type UserRole } from "../models/user.model";
import { createAppError, ErrorCode } from "../errors/error-codes";
import { isEmailAllowed } from "./access-email.service";

export async function syncUserFromAuth(authUser: AuthUser): Promise<UserDocument> {
  let hasAccess: boolean;
  try {
    hasAccess = await isEmailAllowed(authUser.email);
  } catch (error) {
    throw createAppError(ErrorCode.AUTH_ACCESS_CHECK_FAILED, 503, {
      technicalDetail: error instanceof Error ? error.message : String(error),
    });
  }
  if (!hasAccess) {
    throw createAppError(ErrorCode.AUTH_EMAIL_DOMAIN, 403);
  }
  const role: UserRole = authUser.isAdmin ? "admin" : "user";

  const update: Record<string, string> = {
    email: authUser.email,
    displayName: authUser.displayName,
    role,
  };

  if (authUser.avatarUrl) {
    update.avatarUrl = authUser.avatarUrl;
  }

  const user = await User.findOneAndUpdate(
    { cognitoSub: authUser.cognitoSub },
    {
      $set: update,
      $setOnInsert: { cognitoSub: authUser.cognitoSub },
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  );

  if (!user) {
    throw new Error("Failed to sync user profile");
  }

  return user;
}

export function toUserResponse(user: UserDocument) {
  return {
    id: user._id.toString(),
    cognitoSub: user.cognitoSub,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    isDisabled: user.isDisabled,
    majorId: user.majorId ? user.majorId.toString() : null,
    currentSemesterId: user.currentSemesterId ? user.currentSemesterId.toString() : null,
    currentSubjectIds: user.currentSubjectIds.map((id) => id.toString()),
    storageUsedBytes: user.storageUsedBytes,
    storageQuotaBytes: user.storageQuotaBytes,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
