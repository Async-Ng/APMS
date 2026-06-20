import "dotenv/config";

import mongoose from "mongoose";

import { connectDatabase } from "../src/config/database";
import { loadEnv } from "../src/config/env";
import { Document } from "../src/models/document.model";
import { User } from "../src/models/user.model";

async function migrate(): Promise<void> {
  await connectDatabase(loadEnv());

  const [documents, users] = await Promise.all([
    Document.updateMany(
      { visibility: { $exists: false } },
      { $set: { visibility: "personal", curriculumCourseId: null } },
    ),
    User.updateMany(
      { majorId: { $exists: false } },
      { $set: { majorId: null, currentSemester: null, currentSubjectIds: [] } },
    ),
  ]);

  console.log(
    `Academic migration complete: documents=${documents.modifiedCount}, users=${users.modifiedCount}`,
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
