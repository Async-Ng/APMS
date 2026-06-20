import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const accessEmailSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
    },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deactivatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deactivatedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "access_emails" },
);

accessEmailSchema.index({ isActive: 1, createdAt: -1 });

export type AccessEmailDocument = HydratedDocument<InferSchemaType<typeof accessEmailSchema>>;
export const AccessEmail = model("AccessEmail", accessEmailSchema);

export function toAccessEmailResponse(accessEmail: AccessEmailDocument) {
  return {
    id: accessEmail._id.toString(),
    email: accessEmail.email,
    note: accessEmail.note,
    isActive: accessEmail.isActive,
    createdBy: accessEmail.createdBy.toString(),
    updatedBy: accessEmail.updatedBy.toString(),
    deactivatedBy: accessEmail.deactivatedBy
      ? accessEmail.deactivatedBy.toString()
      : null,
    deactivatedAt: accessEmail.deactivatedAt ?? null,
    createdAt: accessEmail.createdAt,
    updatedAt: accessEmail.updatedAt,
  };
}
