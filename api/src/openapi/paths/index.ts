import { registerAdminPaths } from "./admin";
import { registerAcademicPaths } from "./academic";
import { registerAuthPaths } from "./auth";
import { registerChatPaths } from "./chat";
import { registerDocumentsPaths } from "./documents";
import { registerDrivePaths } from "./drive";
import { registerFoldersPaths } from "./folders";
import { registerForumPaths } from "./forum";
import { registerHealthPaths } from "./health";
import { registerSearchPaths } from "./search";
import { registerSharesPaths } from "./shares";
import { registerUsersPaths } from "./users";

export function registerAllPaths(): void {
  registerHealthPaths();
  registerAuthPaths();
  registerUsersPaths();
  registerDrivePaths();
  registerFoldersPaths();
  registerForumPaths();
  registerDocumentsPaths();
  registerAdminPaths();
  registerAcademicPaths();
  registerSharesPaths();
  registerSearchPaths();
  registerChatPaths();
}
