/**
 * Smoke test: create chat session + send one message (full RAG + Nova Micro).
 * Usage: pnpm exec ts-node --files scripts/test-chat.ts [question]
 */
import "dotenv/config";

import mongoose from "mongoose";

import { loadEnv } from "../src/config/env";
import { getActiveProvider } from "../src/services/ai/ai.service";
import * as chatService from "../src/services/chat.service";
import { User } from "../src/models/user.model";

async function main(): Promise<void> {
  const env = loadEnv();
  const question =
    process.argv.slice(2).join(" ").trim() ||
    "Tóm tắt ngắn nội dung tài liệu đã upload của tôi.";

  console.log("[test-chat] Connecting to MongoDB...");
  await mongoose.connect(env.MONGODB_URI);

  const user = await User.findOne({ disabledAt: null }).sort({ createdAt: 1 });
  if (!user) {
    throw new Error("No active user in database — sign in via web/mobile first.");
  }

  console.log(`[test-chat] User: ${user.email} (${user._id.toString()})`);
  console.log(`[test-chat] Question: ${question}`);

  const session = await chatService.createSession(user, {
    title: "CLI smoke test",
    contextType: "all",
  });
  console.log(`[test-chat] Session created: ${session.id}`);

  console.log(`[test-chat] AI_PROVIDER=${env.AI_PROVIDER}, active before send: ${getActiveProvider()}`);
  console.log("[test-chat] Sending message (embed → vector search → chat)...");
  const start = Date.now();
  const result = await chatService.sendMessage(user, session.id, question);
  const ms = Date.now() - start;

  console.log(`[test-chat] Done in ${ms}ms, active provider after send: ${getActiveProvider()}`);
  console.log("\n--- Assistant reply ---\n");
  console.log(result.assistantMessage.content);
  console.log("\n--- Citations ---\n");
  if (result.assistantMessage.citations.length === 0) {
    console.log("(none — no matching chunks or documents not ready)");
  } else {
    for (const c of result.assistantMessage.citations) {
      console.log(`- ${c.documentTitle} (page ${c.pageNumber ?? "n/a"})`);
      console.log(`  ${c.excerpt.slice(0, 120)}...`);
    }
  }
}

main()
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[test-chat] FAILED:", message);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  })
  .finally(() => void mongoose.disconnect());
