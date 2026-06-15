/**
 * Permanently delete trashed items older than TRASH_RETENTION_DAYS (default 30).
 * Usage: pnpm purge:trash   (from api/)
 */
import "dotenv/config";
import mongoose from "mongoose";
import { loadEnv } from "../src/config/env";
import { purgeExpiredTrash } from "../src/services/trash-purge.service";

async function main() {
  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);

  const { documents, folders } = await purgeExpiredTrash();
  console.log(
    `Purge complete (retention=${env.TRASH_RETENTION_DAYS} days): documents=${documents}, folders=${folders}`,
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
