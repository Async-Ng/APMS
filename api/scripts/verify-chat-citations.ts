/**
 * Verify chat citations match the web UI ChatCitation shape.
 * Usage: pnpm exec ts-node --files scripts/verify-chat-citations.ts
 */
import "dotenv/config";

import mongoose from "mongoose";

import { loadEnv } from "../src/config/env";
import * as chatService from "../src/services/chat.service";
import { User } from "../src/models/user.model";

function assertCitationShape(
  c: Record<string, unknown>,
  label: string,
): void {
  const required = ["documentId", "documentTitle", "pageNumber", "excerpt"] as const;
  for (const key of required) {
    if (!(key in c)) throw new Error(`${label}: missing field "${key}"`);
  }
  if (typeof c.documentId !== "string" || !c.documentId) {
    throw new Error(`${label}: documentId must be non-empty string`);
  }
  if (typeof c.documentTitle !== "string" || !c.documentTitle) {
    throw new Error(`${label}: documentTitle must be non-empty string`);
  }
  if (c.pageNumber !== null && typeof c.pageNumber !== "number") {
    throw new Error(`${label}: pageNumber must be number | null`);
  }
  if (typeof c.excerpt !== "string" || !c.excerpt) {
    throw new Error(`${label}: excerpt must be non-empty string`);
  }
}

async function main(): Promise<void> {
  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);

  const user = await User.findOne({ disabledAt: null }).sort({ createdAt: 1 });
  if (!user) throw new Error("No active user");

  const question =
    "Giải thích ngắn về Processes and Threads trong tài liệu của tôi.";
  console.log(`[verify] User: ${user.email}`);
  console.log(`[verify] Sending: ${question}`);

  const session = await chatService.createSession(user, {
    title: "Citation UI verify",
    contextType: "all",
  });

  const result = await chatService.sendMessage(user, session.id, question);
  const assistant = result.assistantMessage;

  console.log(`[verify] Session: ${session.id}`);
  console.log(`[verify] Citations: ${assistant.citations.length}`);

  if (assistant.citations.length === 0) {
    throw new Error("No citations returned — RAG may not be finding chunks");
  }

  for (let i = 0; i < assistant.citations.length; i++) {
    const c = assistant.citations[i] as unknown as Record<string, unknown>;
    assertCitationShape(c, `citation[${i}]`);
    console.log(
      `  [${i + 1}] ${String(c.documentTitle)}` +
        (c.pageNumber != null ? ` · p.${c.pageNumber}` : "") +
        ` — excerpt ${String(c.excerpt).length} chars`,
    );
  }

  const detail = await chatService.getSession(user, session.id);
  const saved = detail.messages.find((m) => m.id === assistant.id);
  if (!saved) throw new Error("Assistant message not found in getSession");

  if (saved.citations.length !== assistant.citations.length) {
    throw new Error("getSession citations count mismatch");
  }

  for (const c of saved.citations) {
    assertCitationShape(c as unknown as Record<string, unknown>, "getSession citation");
  }

  console.log("\n[verify] PASSED — citation payload ready for web UI");
  console.log(`[verify] Open: http://localhost:3000/chat/${session.id}`);
}

main()
  .catch((err: unknown) => {
    console.error("[verify] FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => void mongoose.disconnect());
