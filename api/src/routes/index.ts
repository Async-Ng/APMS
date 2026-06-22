import { Router } from "express";

import { adminRouter } from "./admin.routes";
import { authRouter } from "./auth.routes";
import { chatRouter } from "./chat.routes";
import { catalogRouter } from "./catalog.routes";
import { documentsRouter } from "./documents.routes";
import { driveRouter } from "./drive.routes";
import { foldersRouter } from "./folders.routes";
import { forumRouter } from "./forum.routes";
import { healthRouter } from "./health.routes";
import { invitesRouter } from "./invites.routes";
import { libraryRouter } from "./library.routes";
import { searchRouter } from "./search.routes";
import { sharesRouter } from "./shares.routes";
import { usersRouter } from "./users.routes";

const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/catalog", catalogRouter);
apiRouter.use("/library", libraryRouter);
apiRouter.use("/forum", forumRouter);
apiRouter.use("/folders", foldersRouter);
apiRouter.use("/documents", documentsRouter);
apiRouter.use("/drive", driveRouter);
apiRouter.use("/shares", sharesRouter);
apiRouter.use("/invites", invitesRouter);
apiRouter.use("/search", searchRouter);
apiRouter.use("/chat", chatRouter);

export { apiRouter };
