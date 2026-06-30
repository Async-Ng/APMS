import "dotenv/config";

import mongoose from "mongoose";

import { connectDatabase } from "../src/config/database";
import { loadEnv } from "../src/config/env";
import { CourseSlot } from "../src/models/course-slot.model";
import { CurriculumSemester } from "../src/models/curriculum-semester.model";
import { Curriculum } from "../src/models/curriculum.model";

const RENAMES: Array<{ from: string; to: string }> = [
  { from: "majors", to: "curriculums" },
  { from: "majorsemesters", to: "curriculumsemesters" },
  { from: "curriculumcourses", to: "courseslots" },
];

async function collectionExists(name: string): Promise<boolean> {
  const collections = await mongoose.connection.db!.listCollections({ name }).toArray();
  return collections.length > 0;
}

async function renameCollectionIfNeeded(from: string, to: string): Promise<void> {
  const sourceExists = await collectionExists(from);
  const targetExists = await collectionExists(to);
  if (!sourceExists) {
    console.log(`Skip rename ${from} -> ${to}: source missing`);
    return;
  }
  if (targetExists) {
    console.log(`Skip rename ${from} -> ${to}: target already exists`);
    return;
  }
  await mongoose.connection.db!.renameCollection(from, to);
  console.log(`Renamed collection ${from} -> ${to}`);
}

async function renameField(
  collection: string,
  from: string,
  to: string,
): Promise<number> {
  const col = mongoose.connection.collection(collection);
  const result = await col.updateMany({ [from]: { $exists: true } }, { $rename: { [from]: to } });
  console.log(`Renamed field ${collection}.${from} -> ${to}: ${result.modifiedCount} docs`);
  return result.modifiedCount;
}

async function dropLegacyIndexes(collectionName: string): Promise<void> {
  const collection = mongoose.connection.collection(collectionName);
  const indexes = await collection.indexes();
  for (const index of indexes) {
    if (!index.key) continue;
    const keys = Object.keys(index.key);
    if (keys.includes("majorId") || keys.includes("curriculumCourseId")) {
      if (index.name && index.name !== "_id_") {
        await collection.dropIndex(index.name);
        console.log(`Dropped legacy index ${collectionName}.${index.name}`);
      }
    }
  }
}

async function detectOrphans(): Promise<void> {
  const users = mongoose.connection.collection("users");
  const documents = mongoose.connection.collection("documents");
  const curricula = await Curriculum.find({}).select("_id");
  const curriculumIds = new Set(curricula.map((c) => c._id.toString()));

  const usersMissingCurriculum = await users.countDocuments({
    curriculumId: { $ne: null, $nin: [...curriculumIds] },
  });
  const docsMissingSlot = await documents.countDocuments({
    courseSlotId: { $ne: null },
  });
  const slots = await CourseSlot.find({}).select("_id");
  const slotIds = new Set(slots.map((s) => s._id.toString()));
  const docsOrphanSlot = await documents.countDocuments({
    courseSlotId: { $ne: null, $nin: [...slotIds] },
  });

  console.log(`Users with orphan curriculumId: ${usersMissingCurriculum}`);
  console.log(`Documents with courseSlotId: ${docsMissingSlot}`);
  console.log(`Documents with orphan courseSlotId: ${docsOrphanSlot}`);
}

async function migrate(): Promise<void> {
  await connectDatabase(loadEnv());

  for (const { from, to } of RENAMES) {
    await renameCollectionIfNeeded(from, to);
  }

  if (await collectionExists("curriculumsemesters")) {
    await renameField("curriculumsemesters", "majorId", "curriculumId");
    await dropLegacyIndexes("curriculumsemesters");
  }

  if (await collectionExists("courseslots")) {
    await renameField("courseslots", "majorId", "curriculumId");
    await dropLegacyIndexes("courseslots");
  }

  if (await collectionExists("users")) {
    await renameField("users", "majorId", "curriculumId");
  }

  if (await collectionExists("documents")) {
    await renameField("documents", "curriculumCourseId", "courseSlotId");
    await dropLegacyIndexes("documents");
  }

  await Curriculum.syncIndexes();
  await CurriculumSemester.syncIndexes();
  await CourseSlot.syncIndexes();

  const counts = {
    curricula: await Curriculum.countDocuments(),
    curriculumSemesters: await CurriculumSemester.countDocuments(),
    courseSlots: await CourseSlot.countDocuments(),
    usersWithCurriculum: await mongoose.connection
      .collection("users")
      .countDocuments({ curriculumId: { $ne: null } }),
    documentsWithSlot: await mongoose.connection
      .collection("documents")
      .countDocuments({ courseSlotId: { $ne: null } }),
  };
  console.log("Post-migration counts:", counts);

  await detectOrphans();
}

migrate()
  .then(() => {
    console.log("Migration complete.");
    return mongoose.disconnect();
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    void mongoose.disconnect();
    process.exit(1);
  });
