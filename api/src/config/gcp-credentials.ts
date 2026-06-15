import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const GCP_SA_FILE = join(tmpdir(), "gcp-sa.json");

interface ServiceAccountJson {
  type?: string;
  client_email?: string;
  private_key?: string;
}

function parseServiceAccountJson(raw: string): ServiceAccountJson {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON must be a JSON object");
  }

  const sa = parsed as ServiceAccountJson;

  if (sa.type !== "service_account") {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON must have type "service_account"');
  }
  if (!sa.client_email?.trim()) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is missing client_email");
  }
  if (!sa.private_key?.trim()) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is missing private_key");
  }

  return sa;
}

function hasAdcSource(): boolean {
  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
  );
}

function needsGcpCredentials(): boolean {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  return provider === "gemini" || provider === "auto";
}

/**
 * Bootstrap Application Default Credentials for Vertex AI on PaaS (Render, etc.).
 * Must run before any Google GenAI client is created.
 */
export function initGcpCredentials(): void {
  const jsonRaw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();

  if (jsonRaw) {
    parseServiceAccountJson(jsonRaw);
    writeFileSync(GCP_SA_FILE, jsonRaw, { encoding: "utf8", mode: 0o600 });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = GCP_SA_FILE;
    console.log(`[gcp] ADC configured from GOOGLE_APPLICATION_CREDENTIALS_JSON → ${GCP_SA_FILE}`);
    return;
  }

  const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (filePath) {
    console.log(`[gcp] Using GOOGLE_APPLICATION_CREDENTIALS file: ${filePath}`);
    return;
  }

  if (process.env.NODE_ENV === "production" && needsGcpCredentials()) {
    console.warn(
      "[gcp] WARNING: Vertex AI requires ADC but neither GOOGLE_APPLICATION_CREDENTIALS_JSON " +
        "nor GOOGLE_APPLICATION_CREDENTIALS is set. Embed/chat will fail until credentials are configured.",
    );
  }
}
