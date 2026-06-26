import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const majorSemesterSchema = new Schema(
  {
    majorId: { type: Schema.Types.ObjectId, ref: "Major", required: true, index: true },
    semesterId: { type: Schema.Types.ObjectId, ref: "Semester", required: true, index: true },
    sortOrder: { type: Number, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

majorSemesterSchema.index({ majorId: 1, semesterId: 1 }, { unique: true });

export type MajorSemesterDocument = HydratedDocument<InferSchemaType<typeof majorSemesterSchema>>;
export const MajorSemester = model("MajorSemester", majorSemesterSchema);

export function toMajorSemesterResponse(link: MajorSemesterDocument) {
  return {
    id: link._id.toString(),
    majorId: link.majorId.toString(),
    semesterId: link.semesterId.toString(),
    sortOrder: link.sortOrder,
    isActive: link.isActive,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}
