import "dotenv/config";

import { createApp } from "./app";
import { initCognitoVerifier } from "./config/cognito";
import { connectDatabase } from "./config/database";
import { loadEnv } from "./config/env";
import { initGcpCredentials } from "./config/gcp-credentials";
import { startDocumentWorker } from "./workers/document.worker";
import { startTrashPurgeWorker } from "./workers/trash-purge.worker";

initGcpCredentials();

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  initCognitoVerifier(env);
  await connectDatabase(env);

  startDocumentWorker();
  startTrashPurgeWorker();

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
