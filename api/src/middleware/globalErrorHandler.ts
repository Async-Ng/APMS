import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/AppError";
import { ErrorCode, ERROR_MESSAGES } from "../errors/error-codes";

export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;

  const userMessage =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? ERROR_MESSAGES.INTERNAL_ERROR
      : isAppError
        ? err.message
        : ERROR_MESSAGES.INTERNAL_ERROR;

  const code =
    isAppError && err.code
      ? err.code
      : statusCode === 500
        ? ErrorCode.INTERNAL_ERROR
        : undefined;

  if (process.env.NODE_ENV !== "production") {
    if (isAppError && err.technicalDetail) {
      console.error(`[AppError:${err.code ?? "unknown"}] ${err.technicalDetail}`);
    }
    if (statusCode === 500) {
      console.error(err);
    }
  }

  res.status(statusCode).json({
    status: "error",
    ...(code ? { code } : {}),
    message: userMessage,
  });
}
