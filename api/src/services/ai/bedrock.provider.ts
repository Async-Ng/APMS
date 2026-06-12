import { ConverseCommand, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

import { getBedrockClient, getEnv } from "../../config/aws";
import { withBedrockRetry } from "./bedrock-retry";
import type { ChatTurn, EmbeddingInputType } from "./types";

interface TitanEmbeddingResponse {
  embedding: number[];
}

interface CohereEmbeddingV3Response {
  embeddings: number[][];
}

interface CohereEmbeddingV4Response {
  embeddings: {
    float?: number[][];
  };
}

function isCohereEmbedV4Model(modelId: string): boolean {
  return modelId.includes("embed-v4");
}

function isCohereEmbeddingModel(modelId: string): boolean {
  if (isCohereEmbedV4Model(modelId)) {
    return true;
  }
  return modelId.startsWith("cohere.");
}

function buildEmbeddingRequestBody(
  modelId: string,
  text: string,
  inputType: EmbeddingInputType,
  outputDimension: number,
): Record<string, unknown> {
  if (isCohereEmbedV4Model(modelId)) {
    return {
      texts: [text],
      input_type: inputType,
      embedding_types: ["float"],
      output_dimension: outputDimension,
      truncate: "END",
    };
  }

  if (isCohereEmbeddingModel(modelId)) {
    return {
      texts: [text],
      input_type: inputType,
      truncate: "END",
    };
  }

  const body: Record<string, unknown> = { inputText: text };

  if (modelId.includes("titan-embed-text-v2")) {
    body.dimensions = outputDimension;
    body.normalize = true;
  }

  return body;
}

function parseCohereEmbedding(modelId: string, parsed: unknown): number[] {
  if (isCohereEmbedV4Model(modelId)) {
    const v4 = parsed as CohereEmbeddingV4Response;
    const vector = v4.embeddings?.float?.[0];
    if (!vector?.length) {
      throw new Error("Cohere Embed v4 response missing embeddings.float[0]");
    }
    return vector;
  }

  const v3 = parsed as CohereEmbeddingV3Response;
  const vector = v3.embeddings?.[0];
  if (!vector?.length) {
    throw new Error("Cohere embedding response missing embeddings[0]");
  }
  return vector;
}

function parseEmbeddingResponse(
  modelId: string,
  raw: string,
  expectedDimensions: number,
): number[] {
  const parsed = JSON.parse(raw) as TitanEmbeddingResponse | CohereEmbeddingV3Response | CohereEmbeddingV4Response;

  if (isCohereEmbeddingModel(modelId)) {
    const vector = parseCohereEmbedding(modelId, parsed);
    if (vector.length !== expectedDimensions) {
      throw new Error(
        `Cohere embedding dimension mismatch: expected ${expectedDimensions}, got ${vector.length}`,
      );
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

  const outputDimension = env.BEDROCK_EMBEDDING_OUTPUT_DIMENSION;

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: Buffer.from(
      JSON.stringify(buildEmbeddingRequestBody(modelId, text, inputType, outputDimension)),
    ),
  });

  const response = await withBedrockRetry(
    () => getBedrockClient().send(command),
    "embed",
  );
  return parseEmbeddingResponse(modelId, Buffer.from(response.body).toString(), outputDimension);
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
