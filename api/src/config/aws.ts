import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { S3Client } from "@aws-sdk/client-s3";

import { loadEnv } from "./env";

let s3Client: S3Client | null = null;
let bedrockClient: BedrockRuntimeClient | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    const env = loadEnv();
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  return s3Client;
}

export function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    const env = loadEnv();
    bedrockClient = new BedrockRuntimeClient({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  return bedrockClient;
}

export function getEnv() {
  return loadEnv();
}
