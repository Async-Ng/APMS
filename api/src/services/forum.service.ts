import { type UserDocument } from "../models/user.model";
import {
  getDocument as getLibraryDocument,
  listDocuments as listLibraryDocuments,
} from "./library.service";

export async function listForumDocuments(options: Parameters<typeof listLibraryDocuments>[0]) {
  return listLibraryDocuments(options);
}

export async function getForumDocument(
  user: UserDocument,
  documentId: string,
  includeDownloadUrl: boolean,
) {
  return getLibraryDocument(user, documentId, includeDownloadUrl);
}
