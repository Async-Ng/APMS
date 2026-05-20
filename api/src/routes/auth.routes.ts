import { Router } from "express";

import { getMe } from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";
import { resolveUser } from "../middleware/resolveUser";

const authRouter = Router();

authRouter.get("/me", authenticate, resolveUser, getMe);

export { authRouter };
