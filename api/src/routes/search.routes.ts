import { Router } from "express";

import { search } from "../controllers/search.controller";
import { authenticate } from "../middleware/authenticate";
import { requireActiveUser } from "../middleware/requireActiveUser";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { searchQuerySchema } from "../validators/search.validator";

const searchRouter = Router();

searchRouter.use(authenticate, resolveUser, requireActiveUser);

searchRouter.get("/", validate({ query: searchQuerySchema }), search);

export { searchRouter };
