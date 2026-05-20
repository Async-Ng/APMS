import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";

import { registerAllPaths } from "./paths";
import { registry } from "./setup";

let cachedDocument: ReturnType<OpenApiGeneratorV3["generateDocument"]> | null = null;

export function generateOpenApiDocument() {
  if (cachedDocument) {
    return cachedDocument;
  }

  registerAllPaths();

  const generator = new OpenApiGeneratorV3(registry.definitions);

  cachedDocument = generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "APMS API",
      version: "1.0.0",
      description:
        "Academic Personal Management System REST API. Authenticate with Amazon Cognito ID token (Bearer).",
    },
    servers: [
      {
        url: process.env.PUBLIC_API_BASE_URL ?? "http://localhost:4000",
        description: "API server",
      },
    ],
    tags: [
      { name: "Health", description: "Health checks" },
      { name: "Auth", description: "Authentication and session" },
      { name: "Users", description: "User profile" },
      { name: "Drive", description: "Drive views (root, starred, trash)" },
      { name: "Folders", description: "Folder management" },
      { name: "Documents", description: "Documents and S3 upload" },
      { name: "Admin", description: "Admin-only operations (Cognito group admin)" },
    ],
  });

  return cachedDocument;
}
