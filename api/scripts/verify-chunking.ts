/**
 * Verify document chunking + embeddings + optional semantic retrieval.
 *
 * Usage:
 *   pnpm exec ts-node --files scripts/verify-chunking.ts
 *   pnpm exec ts-node --files scripts/verify-chunking.ts <documentId>
 *   pnpm exec ts-node --files scripts/verify-chunking.ts --query "Processes and Threads"
 */
import "dotenv/config";

import mongoose from "mongoose";

import { loadEnv } from "../src/config/env";
import { DocumentChunk } from "../src/models/document-chunk.model";
import { Document } from "../src/models/document.model";
import { User } from "../src/models/user.model";
import * as searchService from "../src/services/search.service";

// Must match chunking.service.ts
const EXPECTED_CHUNK_SIZE = 1500;
const EXPECTED_OVERLAP = 150;
const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

interface Issue {
  documentId: string;
  title: string;
  message: string;
}

function parseArgs(): { documentId?: string; query?: string } {
  const args = process.argv.slice(2);
  let documentId: string | undefined;
  let query: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--query" && args[i + 1]) {
      query = args[++i];
    } else if (arg.startsWith("--query=")) {
      query = arg.slice("--query=".length);
    } else if (!arg.startsWith("-")) {
      documentId = arg;
    }
  }

  const out: { documentId?: string; query?: string } = {};
  if (documentId) out.documentId = documentId;
  if (query) out.query = query;
  return out;
}

function longestSharedSuffixPrefix(a: string, b: string, maxLen = 200): number {
  const tail = a.slice(-maxLen);
  const head = b.slice(0, maxLen);
  const limit = Math.min(tail.length, head.length);
  for (let len = limit; len > 0; len--) {
    if (tail.slice(-len) === head.slice(0, len)) {
      return len;
    }
  }
  return 0;
}

async function verifyDocument(
  doc: { _id: mongoose.Types.ObjectId; title: string; mimeType: string; status: string },
  expectedEmbedDims: number,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const id = doc._id.toString();
  const fail = (message: string) => issues.push({ documentId: id, title: doc.title, message });

  if (doc.status !== "ready") {
    fail(`status is "${doc.status}" (expected "ready")`);
    return issues;
  }

  const chunks = await DocumentChunk.find({ documentId: doc._id })
    .sort({ chunkIndex: 1 })
    .select("chunkIndex content pageNumber embedding")
    .lean();

  if (chunks.length === 0) {
    if (doc.mimeType === PPTX_MIME) {
      return issues; // known: PPTX not extracted yet
    }
    fail("no chunks (extract may have failed or document is empty)");
    return issues;
  }

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]!;
    const label = `chunk[${c.chunkIndex}]`;

    if (c.chunkIndex !== i) {
      fail(`${label}: chunkIndex gap (expected ${i}, got ${c.chunkIndex})`);
    }

    const len = c.content.length;
    if (len === 0) {
      fail(`${label}: empty content`);
    } else if (i < chunks.length - 1 && len > EXPECTED_CHUNK_SIZE) {
      fail(`${label}: length ${len} exceeds max ${EXPECTED_CHUNK_SIZE}`);
    }

    const dims = c.embedding?.length ?? 0;
    if (dims !== expectedEmbedDims) {
      fail(`${label}: embedding dims ${dims} (expected ${expectedEmbedDims})`);
    }

    if (i > 0) {
      const prev = chunks[i - 1]!;
      const shared = longestSharedSuffixPrefix(prev.content, c.content);
      if (shared < Math.min(20, EXPECTED_OVERLAP / 3)) {
        fail(
          `${label}: low overlap with previous chunk (${shared} chars shared; expected ~${EXPECTED_OVERLAP})`,
        );
      }
    }
  }

  return issues;
}

async function runRetrievalSmokeTest(query: string): Promise<void> {
  console.log("\n--- Retrieval smoke test ---\n");
  const user = await User.findOne({ disabledAt: null }).sort({ createdAt: 1 });
  if (!user) {
    console.log("SKIP: no active user in database");
    return;
  }

  console.log(`User: ${user.email}`);
  console.log(`Query: ${query}`);

  const results = await searchService.semanticSearch(user._id, query, 5);
  if (results.length === 0) {
    console.log("FAIL: vector search returned 0 results");
    process.exitCode = 1;
    return;
  }

  console.log(`\nTop ${results.length} result(s):\n`);
  for (const [i, r] of results.entries()) {
    console.log(`  [${i + 1}] score=${r.score.toFixed(4)} | ${r.documentTitle}`);
    if (r.pageNumber != null) {
      console.log(`      page ~${r.pageNumber}`);
    }
    console.log(`      ${r.excerpt.slice(0, 160).replace(/\s+/g, " ")}...`);
  }
  console.log("\nPASS: retrieval returned relevant chunks");
}

async function main(): Promise<void> {
  const env = loadEnv();
  const { documentId, query } = parseArgs();

  const expectedEmbedDims =
    env.AI_PROVIDER === "gemini"
      ? env.GEMINI_EMBEDDING_OUTPUT_DIMENSION
      : env.AI_PROVIDER === "bedrock"
        ? env.BEDROCK_EMBEDDING_OUTPUT_DIMENSION
        : 384;

  console.log("[verify-chunking] Connecting to MongoDB...");
  await mongoose.connect(env.MONGODB_URI);

  const filter: Record<string, unknown> = { deletedAt: null };
  if (documentId) {
    filter._id = documentId;
  } else {
    filter.status = "ready";
  }

  const documents = await Document.find(filter)
    .select("_id title mimeType status pageCount")
    .sort({ title: 1 })
    .lean();

  if (documents.length === 0) {
    throw new Error(documentId ? `Document not found: ${documentId}` : "No ready documents found");
  }

  console.log(`[verify-chunking] Checking ${documents.length} document(s)`);
  console.log(`[verify-chunking] Expected: chunkSize<=${EXPECTED_CHUNK_SIZE}, overlap~${EXPECTED_OVERLAP}, embedDims=${expectedEmbedDims}\n`);

  const allIssues: Issue[] = [];
  const summary: Array<{ title: string; chunks: number; issues: number }> = [];

  for (const doc of documents) {
    const chunks = await DocumentChunk.countDocuments({ documentId: doc._id });
    const issues = await verifyDocument(doc, expectedEmbedDims);
    allIssues.push(...issues);
    summary.push({ title: doc.title, chunks, issues: issues.length });

    const status = issues.length === 0 ? "PASS" : "FAIL";
    const pptxNote = doc.mimeType === PPTX_MIME && chunks === 0 ? " (PPTX: no extract)" : "";
    console.log(`${status} | ${doc.title} | ${chunks} chunks${pptxNote}`);
    for (const issue of issues) {
      console.log(`       - ${issue.message}`);
    }
  }

  console.log("\n--- Summary ---\n");
  const totalChunks = summary.reduce((n, s) => n + s.chunks, 0);
  const passed = summary.filter((s) => s.issues === 0).length;
  console.log(`Documents: ${passed}/${documents.length} passed`);
  console.log(`Total chunks: ${totalChunks}`);
  console.log(`Issues: ${allIssues.length}`);

  if (query) {
    await runRetrievalSmokeTest(query);
  } else if (allIssues.length === 0 && totalChunks > 0) {
    console.log("\nTip: add --query \"your topic\" to test vector retrieval.");
  }

  if (allIssues.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err: unknown) => {
    console.error("[verify-chunking] FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => void mongoose.disconnect());
