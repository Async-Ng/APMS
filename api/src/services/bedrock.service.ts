import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

import { getBedrockClient, getEnv } from "../config/aws";

interface TitanEmbeddingResponse {
  embedding: number[];
  inputTextTokenCount: number;
}

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

export async function embedText(text: string): Promise<number[]> {
  const env = getEnv();

  const command = new InvokeModelCommand({
    modelId: env.BEDROCK_EMBEDDING_MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: Buffer.from(JSON.stringify({ inputText: text })),
  });

  const response = await getBedrockClient().send(command);
  const body = JSON.parse(Buffer.from(response.body).toString()) as TitanEmbeddingResponse;

  return body.embedding;
}

export async function chatWithContext(
  systemPrompt: string,
  messages: ClaudeMessage[],
): Promise<string> {
  const env = getEnv();

  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  };

  const command = new InvokeModelCommand({
    modelId: env.BEDROCK_MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: Buffer.from(JSON.stringify(requestBody)),
  });

  const response = await getBedrockClient().send(command);
  const body = JSON.parse(Buffer.from(response.body).toString()) as ClaudeResponse;

  const textBlock = body.content.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}
