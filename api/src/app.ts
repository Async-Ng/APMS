import cors from "cors";
import express from "express";

import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api", apiRouter);
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(globalErrorHandler);

  return app;
}
