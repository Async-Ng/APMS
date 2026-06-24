import "dotenv/config";

import mongoose from "mongoose";

import { loadEnv } from "../src/config/env";

const INDEX_NAME = "embedding_vector_index";
const COLLECTION_NAME = "documentchunks";

async function main(): Promise<void> {
  const env = loadEnv();
  const indexDefinition = {
    name: INDEX_NAME,
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: "embedding",
          numDimensions: env.GEMINI_EMBEDDING_OUTPUT_DIMENSION,
          similarity: "cosine",
        },
        {
          type: "filter",
          path: "ownerId",
        },
        {
          type: "filter",
          path: "documentId",
        },
      ],
    },
  };

  console.log("[setup] Connecting to MongoDB Atlas...");
  await mongoose.connect(env.MONGODB_URI);
  console.log("[setup] Connected.");

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection not established");
  }

  const collections = await db.listCollections({ name: COLLECTION_NAME }).toArray();
  if (collections.length === 0) {
    console.log(`[setup] Collection "${COLLECTION_NAME}" not found - creating it...`);
    await db.createCollection(COLLECTION_NAME);
    console.log("[setup] Collection created.");
  }

  const collection = db.collection(COLLECTION_NAME);
  const existing = await collection
    .listSearchIndexes(INDEX_NAME)
    .toArray()
    .catch(() => [] as unknown[]);

  if (existing.length > 0) {
    const idx = existing[0] as { status?: string; latestDefinition?: { fields?: unknown[] } };
    const currentFields = (idx.latestDefinition?.fields ?? []) as Array<{
      path?: string;
      type?: string;
      numDimensions?: number;
    }>;
    const vectorField = currentFields.find((field) => field.type === "vector" && field.path === "embedding");
    const currentDims = vectorField?.numDimensions;
    const hasDocumentIdFilter = currentFields.some((field) => field.path === "documentId");
    const dimsOk = currentDims === env.GEMINI_EMBEDDING_OUTPUT_DIMENSION;

    if (hasDocumentIdFilter && dimsOk) {
      console.log(
        `[setup] Index "${INDEX_NAME}" already up to date - status: ${idx.status ?? "unknown"}`,
      );
      await collection.createIndex(
        { queryText: "text", displayHeading: "text", content: "text" },
        { name: "document_chunk_text_index" },
      );
      return;
    }

    const reasons: string[] = [];
    if (!hasDocumentIdFilter) reasons.push("missing documentId filter");
    if (!dimsOk) {
      reasons.push(
        `dimensions ${currentDims ?? "unknown"} -> ${env.GEMINI_EMBEDDING_OUTPUT_DIMENSION}`,
      );
    }

    console.log(`[setup] Index "${INDEX_NAME}" needs updating (${reasons.join(", ")})...`);
    await collection.updateSearchIndex(INDEX_NAME, indexDefinition.definition);
    await collection.createIndex(
      { queryText: "text", displayHeading: "text", content: "text" },
      { name: "document_chunk_text_index" },
    );
    console.log("[setup] Index updated. Rebuilding may take 1-2 minutes.");
    return;
  }

  console.log(`[setup] Creating Vector Search index "${INDEX_NAME}"...`);
  await collection.createSearchIndex(indexDefinition);
  await collection.createIndex(
    { queryText: "text", displayHeading: "text", content: "text" },
    { name: "document_chunk_text_index" },
  );

  console.log("[setup] Vector Search index created successfully.");
  console.log("[setup] The index is now building on Atlas - this may take 1-2 minutes.");
  console.log("[setup] Check status in Atlas UI: Database > Search Indexes > embedding_vector_index");
}

main()
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[setup] Failed:", message);
    process.exit(1);
  })
  .finally(() => void mongoose.disconnect());
