import "dotenv/config";

import mongoose from "mongoose";

import { connectDatabase } from "../src/config/database";
import { loadEnv } from "../src/config/env";
import { Document } from "../src/models/document.model";

async function migrate(): Promise<void> {
  await connectDatabase(loadEnv());

  const [personal, internal, missing] = await Promise.all([
    Document.updateMany({ visibility: "personal" }, { $set: { visibility: "private" } }),
    Document.updateMany({ visibility: "internal" }, { $set: { visibility: "public" } }),
    Document.updateMany(
      { visibility: { $exists: false } },
      { $set: { visibility: "private" } },
    ),
  ]);

  console.log(
    [
      "Document visibility migration complete:",
      `personal->private=${personal.modifiedCount}`,
      `internal->public=${internal.modifiedCount}`,
      `missing->private=${missing.modifiedCount}`,
    ].join(" "),
  );
}

void migrate()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
