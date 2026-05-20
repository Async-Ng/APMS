import { Schema, model, type HydratedDocument, type InferSchemaType, type Types } from "mongoose";

const folderSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 255 },
    parentId: { type: Schema.Types.ObjectId, ref: "Folder", default: null },
    color: { type: String, default: "#5F6368" },
    isStarred: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

folderSchema.index({ ownerId: 1, parentId: 1 });
folderSchema.index({ ownerId: 1, deletedAt: 1 });
folderSchema.index({ ownerId: 1, isStarred: 1 });

export type FolderDocument = HydratedDocument<InferSchemaType<typeof folderSchema>>;

export const Folder = model("Folder", folderSchema);

export function toFolderResponse(folder: FolderDocument) {
  return {
    id: folder._id.toString(),
    ownerId: folder.ownerId.toString(),
    name: folder.name,
    parentId: folder.parentId ? folder.parentId.toString() : null,
    color: folder.color,
    isStarred: folder.isStarred,
    deletedAt: folder.deletedAt ?? null,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}
