import "dotenv/config";

import { createApp } from "./app";
import { initCognitoVerifier } from "./config/cognito";
import { connectDatabase } from "./config/database";
import { loadEnv } from "./config/env";
import { initLocalEmbedding } from "./services/ai/ai.service";
import { startDocumentWorker } from "./workers/document.worker";

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  initCognitoVerifier(env);
  await connectDatabase(env);

  startDocumentWorker();

  // Preload local embedding model to avoid cold-load on first request
  if (env.AI_PROVIDER === "local") {
    await initLocalEmbedding();
  }

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`APMS API listening on port ${env.PORT}`);
  });
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  console.error(`Failed to start APMS API: ${message}`);
  process.exit(1);
});
