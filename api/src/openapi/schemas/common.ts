import { registry, z } from "../setup";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i).openapi({
  description: "MongoDB ObjectId (24 hex characters)",
  example: "507f1f77bcf86cd799439011",
});

export const errorResponseSchema = registry.register(
  "ErrorResponse",
  z
    .object({
      status: z.literal("error"),
      message: z.string(),
    })
    .openapi("ErrorResponse"),
);

export function successEnvelope<T extends z.ZodType>(dataSchema: T, name: string) {
  return registry.register(
    `Success_${name}`,
    z
      .object({
        status: z.literal("success"),
        data: dataSchema,
      })
      .openapi(`Success_${name}`),
  );
}

export const rootHealthResponseSchema = registry.register(
  "RootHealthResponse",
  z
    .object({
      status: z.literal("ok"),
    })
    .openapi("RootHealthResponse"),
);

export const apiHealthDataSchema = z.object({
  service: z.string(),
  uptime: z.number(),
});

export const apiHealthResponseSchema = successEnvelope(apiHealthDataSchema, "ApiHealth");
