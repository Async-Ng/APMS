export interface AppErrorOptions {
  code?: string;
  technicalDetail?: string;
  isOperational?: boolean;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly code?: string;
  readonly technicalDetail?: string;

  constructor(message: string, statusCode = 500, options?: AppErrorOptions) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = options?.isOperational ?? true;
    if (options?.code !== undefined) {
      this.code = options.code;
    }
    if (options?.technicalDetail !== undefined) {
      this.technicalDetail = options.technicalDetail;
    }
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}
