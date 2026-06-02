import { z } from "zod";

const aiProviderSchema = z.enum(["auto", "bedrock", "gemini"]);

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
    BEDROCK_MODEL_ID: z.string().optional(),
    BEDROCK_EMBEDDING_MODEL_ID: z.string().optional(),
    AI_PROVIDER: aiProviderSchema.default("auto"),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_CHAT_MODEL: z.string().default("gemini-2.0-flash-lite"),
    GEMINI_EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),
    MAX_UPLOAD_BYTES: z.coerce.number().default(52_428_800),
    S3_PRESIGN_EXPIRES_SECONDS: z.coerce.number().default(900),
  })
  .superRefine((data, ctx) => {
    if (
      (data.AI_PROVIDER === "gemini" || data.AI_PROVIDER === "auto") &&
      !data.GEMINI_API_KEY?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["GEMINI_API_KEY"],
        message: "GEMINI_API_KEY is required when AI_PROVIDER is auto or gemini",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;
export type AiProviderMode = z.infer<typeof aiProviderSchema>;

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
