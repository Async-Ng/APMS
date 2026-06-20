import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const majorSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 20 },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export type MajorDocument = HydratedDocument<InferSchemaType<typeof majorSchema>>;
export const Major = model("Major", majorSchema);

export function toMajorResponse(major: MajorDocument) {
  return {
    id: major._id.toString(),
    code: major.code,
    name: major.name,
    description: major.description,
    isActive: major.isActive,
    createdAt: major.createdAt,
    updatedAt: major.updatedAt,
  };
}
