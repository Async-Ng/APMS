import type { Express } from "express";
import swaggerUi from "swagger-ui-express";

import { generateOpenApiDocument } from "./document";

export function mountOpenApiDocs(app: Express): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const document = generateOpenApiDocument();

  app.get("/api/openapi.json", (_req, res) => {
    res.json(document);
  });

  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(document, {
      customSiteTitle: "APMS API Docs",
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  );
}
