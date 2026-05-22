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
