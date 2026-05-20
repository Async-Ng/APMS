import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const STORAGE_QUOTA_BYTES = 524_288_000;

const userSchema = new Schema(
  {
    cognitoSub: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String },
    storageUsedBytes: { type: Number, default: 0 },
    storageQuotaBytes: { type: Number, default: STORAGE_QUOTA_BYTES },
  },
  { timestamps: true },
);

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model("User", userSchema);
