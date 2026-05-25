import { registerAdminPaths } from "./admin";
import { registerAuthPaths } from "./auth";
import { registerDocumentsPaths } from "./documents";
import { registerDrivePaths } from "./drive";
import { registerFoldersPaths } from "./folders";
import { registerHealthPaths } from "./health";
import { registerSharesPaths } from "./shares";
import { registerUsersPaths } from "./users";

export function registerAllPaths(): void {
  registerHealthPaths();
  registerAuthPaths();
  registerUsersPaths();
  registerDrivePaths();
  registerFoldersPaths();
  registerDocumentsPaths();
  registerAdminPaths();
  registerSharesPaths();
}

