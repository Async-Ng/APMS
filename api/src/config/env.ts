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
    ALLOWED_EMAIL_DOMAINS: z
      .string()
      .default("fpt.edu.vn,fe.edu.vn")
      .transform((value, ctx) => {
        const domains = value
          .split(",")
          .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
          .filter(Boolean);
        if (domains.length === 0) {
          ctx.addIssue({ code: "custom", message: "At least one email domain is required" });
          return z.NEVER;
        }
        return [...new Set(domains)];
      }),
    AWS_REGION: z.string().min(1),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    S3_BUCKET_NAME: z.string().min(1),
    SES_FROM_EMAIL: z.string().email(),
    APP_URL: z.string().url(),
    GOOGLE_CLOUD_PROJECT: z.string().min(1),
    GOOGLE_CLOUD_LOCATION: z.string().default("asia-southeast1"),
    GEMINI_CHAT_MODEL: z.string().default("gemini-2.5-flash"),
    GEMINI_VISION_MODEL: z.string().default("gemini-2.5-flash"),
    // Lightweight model used for query rewriting and chunk reranking (cheap + fast).
    GEMINI_RERANK_MODEL: z.string().default("gemini-2.5-flash"),
    // Thinking budget for the chat model. 0 disables reasoning; -1 = dynamic; >0 = fixed token budget.
    GEMINI_CHAT_THINKING_BUDGET: z.coerce.number().int().min(-1).default(2048),
    GEMINI_EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),
    GEMINI_EMBEDDING_OUTPUT_DIMENSION: z.coerce.number().int().positive().default(1024),
    GEMINI_EMBED_MIN_INTERVAL_MS: z.coerce.number().int().min(0).default(100),
    GEMINI_EMBED_TOKENS_PER_MINUTE: z.coerce.number().int().positive().default(200_000),
    EMBED_CONCURRENCY: z.coerce.number().int().positive().default(5),
    EMBED_BATCH_SIZE: z.coerce.number().int().positive().default(32),
    GEMINI_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
    GEMINI_RETRY_BASE_MS: z.coerce.number().int().min(100).default(1000),
    GEMINI_QUOTA_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(2),
    GEMINI_QUOTA_RETRY_BASE_MS: z.coerce.number().int().min(100).default(15_000),
    // Image/vision processing during document extraction.
    // NOTE: do NOT use z.coerce.boolean() — it treats any non-empty string (incl. "false") as true.
    DOC_VISION_ENABLED: z
      .string()
      .default("true")
      .transform((v) => v !== "false" && v !== "0"),
    // "all" sends every PDF page through vision markdown parsing (best quality);
    // "auto" only sends scanned pages or pages with images/tables/formulas (saves quota).
    DOC_VISION_PAGE_STRATEGY: z.enum(["all", "auto"]).default("all"),
    DOC_VISION_MAX_PAGES: z.coerce.number().int().positive().optional(),
    // Legacy name for DOC_VISION_MAX_PAGES; still honored as a fallback.
    DOC_VISION_MAX_IMAGES: z.coerce.number().int().positive().optional(),
    DOC_VISION_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(8192),
    DOC_VISION_SCANNED_TEXT_THRESHOLD: z.coerce.number().int().min(0).default(100),
    DOC_VISION_CONCURRENCY: z.coerce.number().int().positive().default(4),
    MAX_UPLOAD_BYTES: z.coerce.number().default(52_428_800),
    S3_PRESIGN_EXPIRES_SECONDS: z.coerce.number().default(900),
    CHAT_DAILY_LIMIT_PER_USER: z.coerce.number().int().min(0).default(50),
    TRASH_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
    TRASH_PURGE_INTERVAL_MS: z.coerce.number().int().min(60_000).default(86_400_000),
    DOCUMENT_WORKER_POLL_MS: z.coerce.number().int().min(1000).default(5_000),
    DOCUMENT_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(3),
  });

export type Env = Omit<z.infer<typeof envSchema>, "DOC_VISION_MAX_PAGES" | "DOC_VISION_MAX_IMAGES"> & {
  DOC_VISION_MAX_PAGES: number;
};

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid environment variables:\n${formatted}`);
  }

  const { DOC_VISION_MAX_IMAGES, ...data } = result.data;

  return {
    ...data,
    COGNITO_REGION: data.COGNITO_REGION ?? data.AWS_REGION,
    DOC_VISION_MAX_PAGES: data.DOC_VISION_MAX_PAGES ?? DOC_VISION_MAX_IMAGES ?? 60,
  };
}
