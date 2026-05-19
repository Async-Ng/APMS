import mongoose from "mongoose";

import type { Env } from "./env";

export async function connectDatabase(env: Env): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
}
