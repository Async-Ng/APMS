import type { Types } from "mongoose";

import { AppError } from "../errors/AppError";
import { User, type UserDocument } from "../models/user.model";
import { toUserResponse } from "./auth.service";

export async function updateProfile(user: UserDocument, displayName: string) {
  const updated = await User.findByIdAndUpdate(
    user._id,
    { $set: { displayName } },
    { returnDocument: "after", runValidators: true },
  );

  if (!updated) {
    throw new AppError("User not found", 404);
  }

  return toUserResponse(updated);
}

/**
 * Search users by email (exact) or displayName (partial, case-insensitive).
 * Excludes the calling user from results.
 * Returns public-safe fields only: id, displayName, email, avatarUrl.
 */
export async function searchUsers(
  excludeUserId: Types.ObjectId,
  query: { email?: string; displayName?: string },
) {
  const filter: Record<string, unknown> = {
    _id: { $ne: excludeUserId },
    isDisabled: false,
  };

  if (query.email) {
    // Exact email match (emails are unique)
    filter.email = query.email.toLowerCase().trim();
  } else if (query.displayName) {
    // Partial case-insensitive display name match
    filter.displayName = { $regex: query.displayName.trim(), $options: "i" };
  }

  const users = await User.find(filter)
    .select("_id displayName email avatarUrl")
    .limit(10)
    .lean();

  return users.map((u) => ({
    id: (u._id as Types.ObjectId).toString(),
    displayName: u.displayName,
    email: u.email,
    avatarUrl: u.avatarUrl ?? null,
  }));
}
