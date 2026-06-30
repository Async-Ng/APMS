import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const STORAGE_QUOTA_BYTES = 524_288_000;

export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    cognitoSub: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String },
    role: { type: String, enum: USER_ROLES, default: "user", index: true },
    isDisabled: { type: Boolean, default: false, index: true },
    curriculumId: { type: Schema.Types.ObjectId, ref: "Curriculum", default: null, index: true },
    currentSemesterId: {
      type: Schema.Types.ObjectId,
      ref: "Semester",
      default: null,
      index: true,
    },
    currentSubjectIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Subject" }],
      default: [],
    },
    storageUsedBytes: { type: Number, default: 0 },
    storageQuotaBytes: { type: Number, default: STORAGE_QUOTA_BYTES },
  },
  { timestamps: true },
);

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model("User", userSchema);
