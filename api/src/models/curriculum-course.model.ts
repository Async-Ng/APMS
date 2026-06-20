import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const curriculumCourseSchema = new Schema(
  {
    majorId: { type: Schema.Types.ObjectId, ref: "Major", required: true, index: true },
    semesterNumber: { type: Number, required: true, min: 1, max: 9, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

curriculumCourseSchema.index(
  { majorId: 1, semesterNumber: 1, subjectId: 1 },
  { unique: true },
);

export type CurriculumCourseDocument = HydratedDocument<
  InferSchemaType<typeof curriculumCourseSchema>
>;
export const CurriculumCourse = model("CurriculumCourse", curriculumCourseSchema);

export function toCurriculumCourseResponse(course: CurriculumCourseDocument) {
  return {
    id: course._id.toString(),
    majorId: course.majorId.toString(),
    semesterNumber: course.semesterNumber,
    subjectId: course.subjectId.toString(),
    isActive: course.isActive,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}
