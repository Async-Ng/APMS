import { z } from "../setup";
import { successEnvelope } from "./common";
import { documentSchema } from "./document";
import { folderSchema } from "./folder";

export const driveContentsDataSchema = z.object({
  folders: z.array(folderSchema),
  documents: z.array(documentSchema),
});

export const driveContentsSuccessResponseSchema = successEnvelope(
  driveContentsDataSchema,
  "DriveContents",
);
