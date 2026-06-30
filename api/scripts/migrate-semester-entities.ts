import "dotenv/config";

import mongoose from "mongoose";

import { connectDatabase } from "../src/config/database";
import { loadEnv } from "../src/config/env";
import { CourseSlot } from "../src/models/course-slot.model";
import { CurriculumSemester } from "../src/models/curriculum-semester.model";
import { Semester } from "../src/models/semester.model";
import { User } from "../src/models/user.model";

const LEGACY_MAX_SEMESTER = 9;
const COURSE_SLOT_COLLECTION = "courseslots";

async function ensureSemesterEntities(): Promise<Map<number, mongoose.Types.ObjectId>> {
  const byNumber = new Map<number, mongoose.Types.ObjectId>();

  for (let n = 1; n <= LEGACY_MAX_SEMESTER; n += 1) {
    const code = `HK${n}`;
    const semester = await Semester.findOneAndUpdate(
      { code },
      {
        $set: {
          name: `Học kỳ ${n}`,
          sortOrder: n,
          isActive: true,
        },
        $setOnInsert: { code },
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    );
    if (semester) {
      byNumber.set(n, semester._id);
    }
  }

  return byNumber;
}

async function dropLegacyIndexes(): Promise<void> {
  const collectionNames = ["courseslots", "curriculumcourses"];
  for (const name of collectionNames) {
    const exists = await mongoose.connection.db!.listCollections({ name }).hasNext();
    if (!exists) continue;
    const collection = mongoose.connection.collection(name);
    const indexes = await collection.indexes();
    const legacyCourseIndex = indexes.find(
      (index) =>
        index.key &&
        "semesterNumber" in index.key &&
        ("curriculumId" in index.key || "majorId" in index.key) &&
        "subjectId" in index.key,
    );
    if (legacyCourseIndex?.name) {
      await collection.dropIndex(legacyCourseIndex.name);
      console.log(`Dropped legacy index: ${legacyCourseIndex.name}`);
    }
  }

  const users = mongoose.connection.collection("users");
  const userIndexes = await users.indexes();
  const legacyUserFields = userIndexes.filter(
    (index) => index.key && "currentSemester" in index.key,
  );
  for (const index of legacyUserFields) {
    if (index.name) {
      await users.dropIndex(index.name);
      console.log(`Dropped legacy user index: ${index.name}`);
    }
  }
}

async function ensureNewIndexes(): Promise<void> {
  await CourseSlot.syncIndexes();
  await CurriculumSemester.syncIndexes();
  await Semester.syncIndexes();
}

async function migrate(): Promise<void> {
  await connectDatabase(loadEnv());
  await dropLegacyIndexes();
  const semesterByNumber = await ensureSemesterEntities();

  const legacyCollection = (await mongoose.connection.db!.listCollections({ name: "curriculumcourses" }).hasNext())
    ? "curriculumcourses"
    : COURSE_SLOT_COLLECTION;

  const rawCourses = await mongoose.connection.collection(legacyCollection).find({}).toArray();

  let coursesUpdated = 0;
  let curriculumSemestersCreated = 0;

  for (const raw of rawCourses) {
    const semesterNumber = raw.semesterNumber as number | undefined;
    const semesterIdFromDoc = raw.semesterId as mongoose.Types.ObjectId | undefined;
    const curriculumId = (raw.curriculumId ?? raw.majorId) as mongoose.Types.ObjectId;
    let semesterId = semesterIdFromDoc;

    if (!semesterId && semesterNumber !== undefined) {
      semesterId = semesterByNumber.get(semesterNumber);
      if (semesterId) {
        await mongoose.connection.collection(legacyCollection).updateOne(
          { _id: raw._id },
          {
            $set: { semesterId },
            $unset: { semesterNumber: "" },
          },
        );
        coursesUpdated += 1;
      }
    } else if (semesterId && semesterNumber !== undefined) {
      await mongoose.connection.collection(legacyCollection).updateOne(
        { _id: raw._id },
        { $unset: { semesterNumber: "" } },
      );
    }

    if (semesterId) {
      const link = await CurriculumSemester.findOneAndUpdate(
        { curriculumId, semesterId },
        {
          $set: { isActive: true },
          $setOnInsert: { curriculumId, semesterId },
        },
        { upsert: true, returnDocument: "after" },
      );
      if (link) curriculumSemestersCreated += 1;
    }
  }

  const rawUsers = await mongoose.connection.collection("users").find({}).toArray();
  let usersUpdated = 0;

  for (const raw of rawUsers) {
    const currentSemester = raw.currentSemester as number | undefined;
    const currentSemesterId = raw.currentSemesterId as mongoose.Types.ObjectId | undefined;
    if (currentSemesterId || currentSemester === undefined || currentSemester === null) {
      continue;
    }
    const semesterId = semesterByNumber.get(currentSemester);
    if (!semesterId) continue;

    await mongoose.connection.collection("users").updateOne(
      { _id: raw._id },
      {
        $set: { currentSemesterId: semesterId },
        $unset: { currentSemester: "" },
      },
    );
    usersUpdated += 1;
  }

  console.log(
    `Semester migration complete: courses=${coursesUpdated}, curriculumSemesterLinks=${curriculumSemestersCreated}, users=${usersUpdated}`,
  );
  await ensureNewIndexes();
}

void migrate()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
