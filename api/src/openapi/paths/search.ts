import { registry, z } from "../setup";
import { successEnvelope } from "../schemas/common";
import { bearerSecurity, error400, error401, error403, jsonResponse } from "./helpers";

const searchResultSchema = z.object({
  documentId: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
  documentTitle: z.string().openapi({ example: "Kiến trúc Microservice" }),
  excerpt: z.string().openapi({ example: "Microservice là một kiến trúc phần mềm..." }),
  pageNumber: z.number().nullable().openapi({ example: 3 }),
  score: z.number().openapi({ example: 0.92 }),
});

const searchResponseSchema = successEnvelope(
  registry.register(
    "SearchResults",
    z.object({ results: z.array(searchResultSchema) }).openapi("SearchResults"),
  ),
  "SearchResults",
);

export function registerSearchPaths(): void {
  registry.registerPath({
    method: "get",
    path: "/api/search",
    tags: ["Search"],
    summary: "Semantic search across documents",
    description:
      "Embeds the query using Amazon Titan and runs Atlas Vector Search on `document_chunks`. Returns ranked excerpts from the user's documents. Requires at least one document with `status: ready`.",
    security: [...bearerSecurity],
    request: {
      query: z.object({
        q: z.string().min(1).max(500).openapi({ description: "Search query", example: "kiến trúc microservice" }),
        limit: z.coerce.number().int().min(1).max(20).default(10).openapi({ description: "Max results (1–20)", example: 10 }),
      }),
    },
    responses: {
      200: jsonResponse(searchResponseSchema, "Search results"),
      400: error400("Missing or invalid query parameter"),
      401: error401,
      403: error403,
    },
  });
}
