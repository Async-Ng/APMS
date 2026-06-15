import { registry, z } from "../setup";
import { successEnvelope } from "./common";

export const folderSchema = registry.register(
  "Folder",
  z
    .object({
      id: z.string(),
      ownerId: z.string(),
      name: z.string(),
      parentId: z.string().nullable(),
      color: z.string(),
      isStarred: z.boolean(),
      deletedAt: z.coerce.date().nullable(),
      permanentDeleteAt: z.coerce.date().nullable().optional(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
    })
    .openapi("Folder"),
);

export const folderSuccessResponseSchema = successEnvelope(folderSchema, "Folder");
