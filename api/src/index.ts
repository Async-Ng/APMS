import "dotenv/config";

import { createApp } from "./app";
import { initCognitoVerifier } from "./config/cognito";
import { connectDatabase } from "./config/database";
import { loadEnv } from "./config/env";

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  initCognitoVerifier(env);
  await connectDatabase(env);

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
