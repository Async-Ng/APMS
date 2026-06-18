import { z } from "zod";

const envSchema = z
  .object({
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    MONGODB_URI: z.string().min(1),
    COGNITO_USER_POOL_ID: z.string().min(1),
    COGNITO_CLIENT_ID: z.string().min(1),
    COGNITO_REGION: z.string().min(1).optional(),
    AWS_REGION: z.string().min(1),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    S3_BUCKET_NAME: z.string().min(1),
    GOOGLE_CLOUD_PROJECT: z.string().min(1),
    GOOGLE_CLOUD_LOCATION: z.string().default("asia-southeast1"),
    GEMINI_CHAT_MODEL: z.string().default("gemini-2.5-flash"),
    GEMINI_VISION_MODEL: z.string().default("gemini-2.5-flash"),
    GEMINI_EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),
    GEMINI_EMBEDDING_OUTPUT_DIMENSION: z.coerce.number().int().positive().default(1024),
    GEMINI_EMBED_DELAY_MS: z.coerce.number().int().min(0).default(0),
    EMBED_CONCURRENCY: z.coerce.number().int().positive().default(5),
    SENTENCE_EMBED_CONCURRENCY: z.coerce.number().int().positive().default(4),
    GEMINI_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
    GEMINI_RETRY_BASE_MS: z.coerce.number().int().min(100).default(1000),
    // Image/vision processing during document extraction.
    // NOTE: do NOT use z.coerce.boolean() — it treats any non-empty string (incl. "false") as true.
    DOC_VISION_ENABLED: z
      .string()
      .default("true")
      .transform((v) => v !== "false" && v !== "0"),
    DOC_VISION_MAX_IMAGES: z.coerce.number().int().positive().default(30),
    DOC_VISION_SCANNED_TEXT_THRESHOLD: z.coerce.number().int().min(0).default(100),
    DOC_VISION_CONCURRENCY: z.coerce.number().int().positive().default(3),
    MAX_UPLOAD_BYTES: z.coerce.number().default(52_428_800),
    S3_PRESIGN_EXPIRES_SECONDS: z.coerce.number().default(900),
    CHAT_DAILY_LIMIT_PER_USER: z.coerce.number().int().min(0).default(50),
    TRASH_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid environment variables:\n${formatted}`);
  }

  const data = result.data;

  return {
    ...data,
    COGNITO_REGION: data.COGNITO_REGION ?? data.AWS_REGION,
  };
}
