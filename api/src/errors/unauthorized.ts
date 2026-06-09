import { createAppError, ErrorCode } from "./error-codes";

export function unauthorizedError() {
  return createAppError(ErrorCode.AUTH_UNAUTHORIZED, 401);
}
