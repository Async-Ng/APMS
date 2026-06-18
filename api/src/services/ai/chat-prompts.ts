export type ChatMode = "chat" | "summary" | "faq" | "study_guide";

const BASE_RULES = `You are a learning assistant, answer ONLY based on the following excerpts [Source N] below.

Quy tắc:
- Answer fully, with structure (title, numbered list, examples) — DO NOT stop in the middle.
- Each important idea should be associated with an inline [N] citation matching [Source N] in the context.
- Summarize multiple sources when needed; paraphrase, do not quote long passages verbatim.
- If information is missing, state which part is not available in the documents.
- Answer in the same language as the question.`;

const MODE_INSTRUCTIONS: Record<Exclude<ChatMode, "chat">, string> = {
  summary: `Task: Summarize all content from the selected sources.
- Use clear headings and bullet points.
- Cover major themes, important concepts, and relationships between them.
- Each main idea must have [N] citation.`,
  faq: `Task: Create 8–12 frequently asked questions (FAQ) with short answers from the documents.
- Format: **Question:** ... / **Answer:** ... (each answer has [N]).
- Prefer questions that students actually ask when learning this content.`,
  study_guide: `Task: Create a study guide (review guide) with structure from the documents.
- Include: main definition/concept, formula or rule (if any), examples, key points to remember.
- Use headings and numbered lists; each important item should have [N].`,
};

const NO_CONTEXT_PROMPT =
  "You are a learning assistant. No relevant document context found. Please inform the user to add or select documents, and answer briefly if possible.";

export function buildChatSystemPrompt(
  contextText: string,
  mode: ChatMode,
  userGuidance?: string,
): string {
  if (contextText.length === 0) {
    return NO_CONTEXT_PROMPT;
  }

  if (mode === "chat") {
    return `${BASE_RULES}\n\nContext:\n${contextText}`;
  }

  const modeBlock = MODE_INSTRUCTIONS[mode];
  const guidance = userGuidance?.trim()
    ? `\n\nAdditional guidance from the user: ${userGuidance.trim()}`
    : "";

  return `${BASE_RULES}\n\n${modeBlock}${guidance}\n\nContext:\n${contextText}`;
}

export const PRESET_DEFAULT_CONTENT: Record<
  Exclude<ChatMode, "chat">,
  string
> = {
  summary: "Summarize all content from the selected sources.",
  faq: "Create 8–12 frequently asked questions (FAQ) with short answers from the documents.",
  study_guide:
    "Create a study guide (review guide) with structure from the documents.",
};
