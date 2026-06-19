import * as geminiProvider from "./gemini.provider";
import type { ChatTurn } from "./types";

const MAX_HISTORY_TURNS = 6;

/**
 * Rewrite a (possibly elliptical) follow-up question into a self-contained,
 * standalone query using the recent conversation history. This dramatically
 * improves retrieval for multi-turn chats where the user says things like
 * "explain the second one" or "what about that?".
 *
 * Falls back to the original question on any error so the chat flow never breaks.
 * Returns the original question unchanged when there is no prior history.
 */
export async function rewriteQueryWithHistory(
  question: string,
  history: ChatTurn[],
): Promise<string> {
  const priorTurns = history.filter((m) => m.content.trim().length > 0);
  if (priorTurns.length === 0) {
    return question;
  }

  const transcript = priorTurns
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
    .join("\n");

  const prompt = `You rewrite a follow-up question into a standalone search query for a document retrieval system.

Rules:
- Resolve pronouns and references ("it", "that", "the second one", "this topic") using the conversation.
- Keep the original language of the question.
- Output ONLY the rewritten query, no explanation, no quotes.
- If the question is already self-contained, return it unchanged.

Conversation so far:
${transcript}

Follow-up question: ${question}

Standalone query:`;

  try {
    const rewritten = await geminiProvider.generateLite(prompt, {
      maxOutputTokens: 256,
    });
    const cleaned = rewritten.replace(/^["'`]+|["'`]+$/g, "").trim();
    return cleaned.length > 0 ? cleaned : question;
  } catch (error) {
    console.warn(
      `[query-rewrite] failed, using original question: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return question;
  }
}
