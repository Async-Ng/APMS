import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";

import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { mountOpenApiDocs } from "./openapi/mount";
import { apiRouter } from "./routes";
import { loadEnv } from "./config/env";

export function createApp() {
  const app = express();
  const env = loadEnv();

  app.use(
    cors({
      origin: env.NODE_ENV === "production" ? [env.APP_URL] : "*",
      credentials: true,
    })
  );
  app.use(express.json());

  mountOpenApiDocs(app);

  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: env.NODE_ENV === "production" ? 100 : 1000,
    message: {
      status: 429,
      code: "TOO_MANY_REQUESTS",
      message: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api", limiter, apiRouter);
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(globalErrorHandler);

  return app;
}
