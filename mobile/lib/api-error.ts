import { isAxiosError } from "axios";

export function getErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const message = err.response?.data?.message as string | undefined;
    if (message) return message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
