import { Types } from "mongoose";

import { AppError } from "../errors/AppError";

export function parseObjectId(value: string, fieldName = "id"): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
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
