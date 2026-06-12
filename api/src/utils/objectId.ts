import { Types } from "mongoose";

import { createAppError, ErrorCode } from "../errors/error-codes";

export function parseObjectId(value: string, fieldName = "id"): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw createAppError(ErrorCode.VALIDATION_ERROR, 400, {
      technicalDetail: `Invalid ${fieldName}`,
    });
  }
  return new Types.ObjectId(value);
}

export function parseOptionalObjectId(
  value: string | null | undefined,
  fieldName: string,
): Types.ObjectId | null {
  if (value === null || value === undefined || value === "null" || value === "") {
    return null;
  }
  return parseObjectId(value, fieldName);
}
