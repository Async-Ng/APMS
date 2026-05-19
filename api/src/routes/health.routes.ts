import { Router } from "express";

import { getHealth } from "../controllers/health.controller";
import { catchAsync } from "../utils/catchAsync";

const healthRouter = Router();

healthRouter.get("/", catchAsync(getHealth));

export { healthRouter };
