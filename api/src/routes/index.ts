import { Router } from "express";

import { adminRouter } from "./admin.routes";
import { authRouter } from "./auth.routes";
import { documentsRouter } from "./documents.routes";
import { driveRouter } from "./drive.routes";
import { foldersRouter } from "./folders.routes";
import { healthRouter } from "./health.routes";
import { sharesRouter } from "./shares.routes";
import { usersRouter } from "./users.routes";

const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/folders", foldersRouter);
apiRouter.use("/documents", documentsRouter);
apiRouter.use("/drive", driveRouter);
apiRouter.use("/shares", sharesRouter);

export { apiRouter };
