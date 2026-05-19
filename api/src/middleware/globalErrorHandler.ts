import type { NextFunction, Request, Response } from "express";

interface AppError extends Error {
  statusCode?: number;
}

export function globalErrorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;

  res.status(statusCode).json({
    status: "error",
    message: err.message || "Internal server error",
  });
}
