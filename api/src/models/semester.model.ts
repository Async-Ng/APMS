import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const semesterSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 30 },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    sortOrder: { type: Number, required: true, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export type SemesterDocument = HydratedDocument<InferSchemaType<typeof semesterSchema>>;
export const Semester = model("Semester", semesterSchema);

export function toSemesterResponse(semester: SemesterDocument) {
  return {
    id: semester._id.toString(),
    code: semester.code,
    name: semester.name,
    sortOrder: semester.sortOrder,
    isActive: semester.isActive,
    createdAt: semester.createdAt,
    updatedAt: semester.updatedAt,
  };
}
