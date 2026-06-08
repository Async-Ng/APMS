import { ConverseCommand, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

import { getBedrockClient, getEnv } from "../../config/aws";
import { withBedrockRetry } from "./bedrock-retry";
import type { ChatTurn, EmbeddingInputType } from "./types";

interface TitanEmbeddingResponse {
  embedding: number[];
}

interface CohereEmbeddingResponse {
  embeddings: number[][];
}

function isCohereEmbeddingModel(modelId: string): boolean {
  return modelId.startsWith("cohere.");
}

function buildEmbeddingRequestBody(
  modelId: string,
  text: string,
  inputType: EmbeddingInputType,
): Record<string, unknown> {
  if (isCohereEmbeddingModel(modelId)) {
    return {
      texts: [text],
      input_type: inputType,
      truncate: "END",
    };
  }

  const body: Record<string, unknown> = { inputText: text };

  if (modelId.includes("titan-embed-text-v2")) {
    body.dimensions = 1024;
    body.normalize = true;
  }

  return body;
}

function parseEmbeddingResponse(modelId: string, raw: string): number[] {
  const parsed = JSON.parse(raw) as TitanEmbeddingResponse | CohereEmbeddingResponse;

  if (isCohereEmbeddingModel(modelId)) {
    const cohere = parsed as CohereEmbeddingResponse;
    const vector = cohere.embeddings?.[0];
    if (!vector?.length) {
      throw new Error("Cohere embedding response missing embeddings[0]");
    }
    return vector;
  }

  const titan = parsed as TitanEmbeddingResponse;
  if (!titan.embedding?.length) {
    throw new Error("Titan embedding response missing embedding vector");
  }
  return titan.embedding;
}

export async function embedText(
  text: string,
  inputType: EmbeddingInputType = "search_document",
): Promise<number[]> {
  const env = getEnv();
  const modelId = env.BEDROCK_EMBEDDING_MODEL_ID;
  if (!modelId) {
    throw new Error("BEDROCK_EMBEDDING_MODEL_ID is not configured");
  }

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: Buffer.from(JSON.stringify(buildEmbeddingRequestBody(modelId, text, inputType))),
  });

  const response = await withBedrockRetry(
    () => getBedrockClient().send(command),
    "embed",
  );
  return parseEmbeddingResponse(modelId, Buffer.from(response.body).toString());
}

export async function chatWithContext(
  systemPrompt: string,
  messages: ChatTurn[],
): Promise<string> {
  const env = getEnv();
  const modelId = env.BEDROCK_MODEL_ID;
  if (!modelId) {
    throw new Error("BEDROCK_MODEL_ID is not configured");
  }

  const command = new ConverseCommand({
    modelId,
    system: [{ text: systemPrompt }],
    messages: messages.map((m) => ({
      role: m.role,
      content: [{ text: m.content }],
    })),
    inferenceConfig: {
      maxTokens: 1024,
      temperature: 0.3,
    },
  });

  const response = await withBedrockRetry(
    () => getBedrockClient().send(command),
    "chat",
  );

  const text =
    response.output?.message?.content
      ?.map((block) => ("text" in block ? block.text : ""))
      .join("")
      .trim() ?? "";

  if (!text) {
    throw new Error("Bedrock Converse returned empty assistant message");
  }

  return text;
}
