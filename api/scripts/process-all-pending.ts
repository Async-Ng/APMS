/**
 * Process all pending/failed documents immediately (bypass worker poll interval).
 * Usage: npx tsx --env-file=.env scripts/process-all-pending.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { loadEnv } from "../src/config/env";
import { Document } from "../src/models/document.model";
import { processDocument } from "../src/services/processing.service";

async function main() {
  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);

  const pending = await Document.find({
    status: { $in: ["processing", "failed"] },
    deletedAt: null,
  })
    .select("_id title status")
    .lean();

  console.log(`Found ${pending.length} document(s) to process`);

  for (const doc of pending) {
    console.log(`\n→ ${doc.title} (${doc._id.toString()}, was ${doc.status})`);
    await processDocument(doc._id);
  }

  const ready = await Document.countDocuments({ status: "ready", deletedAt: null });
  const stillPending = await Document.countDocuments({
    status: { $in: ["processing", "failed"] },
    deletedAt: null,
  });
  console.log(`\nDone. ready=${ready}, still pending/failed=${stillPending}`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
