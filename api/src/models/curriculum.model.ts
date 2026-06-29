import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const curriculumSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 20 },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export type CurriculumDocument = HydratedDocument<InferSchemaType<typeof curriculumSchema>>;
export const Curriculum = model("Curriculum", curriculumSchema, "curriculums");

export function toCurriculumResponse(curriculum: CurriculumDocument) {
  return {
    id: curriculum._id.toString(),
    code: curriculum.code,
    name: curriculum.name,
    description: curriculum.description,
    isActive: curriculum.isActive,
    createdAt: curriculum.createdAt,
    updatedAt: curriculum.updatedAt,
  };
}
