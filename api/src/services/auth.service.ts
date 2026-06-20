import type { AuthUser } from "../middleware/authenticate";
import { User, type UserDocument, type UserRole } from "../models/user.model";
import { loadEnv } from "../config/env";
import { createAppError, ErrorCode } from "../errors/error-codes";

export async function syncUserFromAuth(authUser: AuthUser): Promise<UserDocument> {
  const emailDomain = authUser.email.trim().toLowerCase().split("@").at(-1);
  if (!emailDomain || !loadEnv().ALLOWED_EMAIL_DOMAINS.includes(emailDomain)) {
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
    currentSemester: user.currentSemester ?? null,
    currentSubjectIds: user.currentSubjectIds.map((id) => id.toString()),
    storageUsedBytes: user.storageUsedBytes,
    storageQuotaBytes: user.storageQuotaBytes,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
