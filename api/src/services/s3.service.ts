import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

import { getEnv, getS3Client } from "../config/aws";
import { AppError } from "../errors/AppError";
import { createAppError, ErrorCode } from "../errors/error-codes";

export function buildS3Key(userId: string, originalFilename: string): string {
  const sanitized = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `users/${userId}/${randomUUID()}/${sanitized}`;
}

export async function createPresignedPutUrl(
  s3Key: string,
  mimeType: string,
  fileSizeBytes: number,
): Promise<{ uploadUrl: string; expiresIn: number }> {
  const env = getEnv();
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: s3Key,
    ContentType: mimeType,
    ContentLength: fileSizeBytes,
  });

  const expiresIn = env.S3_PRESIGN_EXPIRES_SECONDS;
  const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn });

  return { uploadUrl, expiresIn };
}

export async function createPresignedGetUrl(s3Key: string): Promise<string> {
  const env = getEnv();
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: s3Key,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn: env.S3_PRESIGN_EXPIRES_SECONDS });
}

export async function getObjectBuffer(s3Key: string): Promise<Buffer> {
  const env = getEnv();
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: s3Key,
  });

  const response = await getS3Client().send(command);

  if (!response.Body) {
    throw createAppError(ErrorCode.NOT_FOUND, 404, { technicalDetail: "S3 object missing" });
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export async function verifyUploadedObject(
  s3Key: string,
  expectedSize: number,
  expectedMimeType: string,
): Promise<void> {
  const env = getEnv();

  try {
    const head = await getS3Client().send(
      new HeadObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: s3Key,
      }),
    );

    if (!head.ContentLength || head.ContentLength !== expectedSize) {
      throw createAppError(ErrorCode.UPLOAD_FAILED, 400, { technicalDetail: "size mismatch" });
    }

    if (head.ContentType && head.ContentType !== expectedMimeType) {
      throw createAppError(ErrorCode.UPLOAD_FAILED, 400, { technicalDetail: "mime mismatch" });
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createAppError(ErrorCode.UPLOAD_FAILED, 400, { technicalDetail: "S3 head failed" });
  }
}
