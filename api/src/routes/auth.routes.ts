import { Router } from "express";

import { getMe } from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";

const authRouter = Router();

authRouter.get("/me", authenticate, getMe);

export { authRouter };
