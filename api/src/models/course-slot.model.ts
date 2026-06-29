import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const courseSlotSchema = new Schema(
  {
    curriculumId: {
      type: Schema.Types.ObjectId,
      ref: "Curriculum",
      required: true,
      index: true,
    },
    semesterId: { type: Schema.Types.ObjectId, ref: "Semester", required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

courseSlotSchema.index({ curriculumId: 1, semesterId: 1, subjectId: 1 }, { unique: true });

export type CourseSlotDocument = HydratedDocument<InferSchemaType<typeof courseSlotSchema>>;
export const CourseSlot = model("CourseSlot", courseSlotSchema, "courseslots");

export function toCourseSlotResponse(slot: CourseSlotDocument) {
  return {
    id: slot._id.toString(),
    curriculumId: slot.curriculumId.toString(),
    semesterId: slot.semesterId.toString(),
    subjectId: slot.subjectId.toString(),
    isActive: slot.isActive,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
  };
}
