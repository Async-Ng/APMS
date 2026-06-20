import { z } from "zod";

import { loadEnv } from "../config/env";
import { createAppError, ErrorCode } from "../errors/error-codes";
import {
  AccessEmail,
  toAccessEmailResponse,
  type AccessEmailDocument,
} from "../models/access-email.model";
import type { UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";

const emailSchema = z.string().trim().toLowerCase().max(320).email();

export function normalizeEmail(email: string): string | null {
  const result = emailSchema.safeParse(email);
  return result.success ? result.data : null;
}

export function isAllowedDomain(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const domain = normalized.split("@").at(-1);
  return Boolean(domain && loadEnv().ALLOWED_EMAIL_DOMAINS.includes(domain));
}

export async function isEmailAllowed(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (isAllowedDomain(normalized)) return true;
  return Boolean(await AccessEmail.exists({ email: normalized, isActive: true }));
}

export async function listAccessEmails(options: {
  page: number;
  limit: number;
  search?: string | undefined;
  status: "active" | "inactive" | "all";
}) {
  const filter: Record<string, unknown> = {};
  if (options.status !== "all") filter.isActive = options.status === "active";
  if (options.search) {
    const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { email: { $regex: escaped, $options: "i" } },
      { note: { $regex: escaped, $options: "i" } },
    ];
  }

  const skip = (options.page - 1) * options.limit;
  const [entries, total] = await Promise.all([
    AccessEmail.find(filter).sort({ createdAt: -1 }).skip(skip).limit(options.limit),
    AccessEmail.countDocuments(filter),
  ]);
  return {
    entries: entries.map(toAccessEmailResponse),
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

type BulkStatus = "created" | "reactivated" | "already_active" | "invalid";

interface BulkResult {
  index: number;
  email: string;
  status: BulkStatus;
  id?: string;
  message?: string;
}

async function createOrReactivate(
  admin: UserDocument,
  email: string,
  note: string | undefined,
): Promise<{ status: Exclude<BulkStatus, "invalid">; entry: AccessEmailDocument }> {
  let existing = await AccessEmail.findOne({ email });
  if (existing?.isActive) return { status: "already_active", entry: existing };

  if (existing) {
    existing.isActive = true;
    existing.updatedBy = admin._id;
    existing.deactivatedBy = null;
    existing.deactivatedAt = null;
    if (note !== undefined) existing.note = note;
    await existing.save();
    return { status: "reactivated", entry: existing };
  }

  try {
    existing = await AccessEmail.create({
      email,
      note: note ?? "",
      isActive: true,
      createdBy: admin._id,
      updatedBy: admin._id,
    });
    return { status: "created", entry: existing };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      const raced = await AccessEmail.findOne({ email });
      if (raced?.isActive) return { status: "already_active", entry: raced };
      if (raced) return createOrReactivate(admin, email, note);
    }
    throw error;
  }
}

export async function bulkUpsertAccessEmails(
  admin: UserDocument,
  entries: Array<{ email: string; note?: string }>,
) {
  const results: BulkResult[] = [];

  for (const [index, input] of entries.entries()) {
    const email = normalizeEmail(input.email);
    if (!email) {
      results.push({
        index,
        email: input.email.trim().toLowerCase(),
        status: "invalid",
        message: "Invalid email address",
      });
      continue;
    }

    const outcome = await createOrReactivate(admin, email, input.note);
    results.push({
      index,
      email,
      status: outcome.status,
      id: outcome.entry._id.toString(),
    });
  }

  const summary = {
    total: results.length,
    created: results.filter((result) => result.status === "created").length,
    reactivated: results.filter((result) => result.status === "reactivated").length,
    alreadyActive: results.filter((result) => result.status === "already_active").length,
    invalid: results.filter((result) => result.status === "invalid").length,
  };
  return { summary, results };
}

function assertCanDeactivateSelf(admin: UserDocument, entry: AccessEmailDocument): void {
  if (
    entry.email === admin.email.trim().toLowerCase() &&
    !isAllowedDomain(admin.email)
  ) {
    throw createAppError(ErrorCode.CANNOT_REVOKE_SELF_ACCESS, 409);
  }
}

export async function updateAccessEmail(
  admin: UserDocument,
  accessEmailId: string,
  input: { note?: string; isActive?: boolean },
) {
  const entry = await AccessEmail.findById(parseObjectId(accessEmailId));
  if (!entry) throw createAppError(ErrorCode.ACCESS_EMAIL_NOT_FOUND, 404);

  if (input.isActive === false) {
    assertCanDeactivateSelf(admin, entry);
    entry.isActive = false;
    entry.deactivatedBy = admin._id;
    entry.deactivatedAt = new Date();
  } else if (input.isActive === true) {
    entry.isActive = true;
    entry.deactivatedBy = null;
    entry.deactivatedAt = null;
  }
  if (input.note !== undefined) entry.note = input.note;
  entry.updatedBy = admin._id;
  await entry.save();
  return toAccessEmailResponse(entry);
}

export async function deactivateAccessEmail(admin: UserDocument, accessEmailId: string) {
  return updateAccessEmail(admin, accessEmailId, { isActive: false });
}
