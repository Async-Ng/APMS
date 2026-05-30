import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const documentChunkSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  chunkIndex: { type: Number, required: true },
  content: { type: String, required: true },
  pageNumber: { type: Number, default: null },
  embedding: { type: [Number], required: true },
});

documentChunkSchema.index({ documentId: 1, chunkIndex: 1 });

export type DocumentChunkDocument = HydratedDocument<InferSchemaType<typeof documentChunkSchema>>;
export const DocumentChunk = model("DocumentChunk", documentChunkSchema);
