import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const documentChunkSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  chunkIndex: { type: Number, required: true },
  content: { type: String, required: true },
  queryText: { type: String, required: true, index: true },
  pageNumber: { type: Number, default: null },
  sectionPath: { type: [String], default: [] },
  displayHeading: { type: String, default: null },
  blockType: { type: String, default: "paragraph" },
  extractionMode: { type: String, default: "text" },
  extractionConfidence: { type: String, default: "medium" },
  embedding: { type: [Number], required: true },
});

documentChunkSchema.index({ documentId: 1, chunkIndex: 1 });
documentChunkSchema.index({ queryText: "text", displayHeading: "text", content: "text" });

export type DocumentChunkDocument = HydratedDocument<InferSchemaType<typeof documentChunkSchema>>;
export const DocumentChunk = model("DocumentChunk", documentChunkSchema);
