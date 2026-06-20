import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const subjectSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 30 },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export type SubjectDocument = HydratedDocument<InferSchemaType<typeof subjectSchema>>;
export const Subject = model("Subject", subjectSchema);

export function toSubjectResponse(subject: SubjectDocument) {
  return {
    id: subject._id.toString(),
    code: subject.code,
    name: subject.name,
    description: subject.description,
    isActive: subject.isActive,
    createdAt: subject.createdAt,
    updatedAt: subject.updatedAt,
  };
}
