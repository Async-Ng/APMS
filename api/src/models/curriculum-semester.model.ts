import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const curriculumSemesterSchema = new Schema(
  {
    curriculumId: {
      type: Schema.Types.ObjectId,
      ref: "Curriculum",
      required: true,
      index: true,
    },
    semesterId: { type: Schema.Types.ObjectId, ref: "Semester", required: true, index: true },
    sortOrder: { type: Number, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

curriculumSemesterSchema.index({ curriculumId: 1, semesterId: 1 }, { unique: true });

export type CurriculumSemesterDocument = HydratedDocument<
  InferSchemaType<typeof curriculumSemesterSchema>
>;
export const CurriculumSemester = model(
  "CurriculumSemester",
  curriculumSemesterSchema,
  "curriculumsemesters",
);

export function toCurriculumSemesterResponse(link: CurriculumSemesterDocument) {
  return {
    id: link._id.toString(),
    curriculumId: link.curriculumId.toString(),
    semesterId: link.semesterId.toString(),
    sortOrder: link.sortOrder,
    isActive: link.isActive,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}
