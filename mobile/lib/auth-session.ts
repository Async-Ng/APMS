import { signOut } from "aws-amplify/auth";

type ClearUserFn = () => void;

let clearUserHandler: ClearUserFn | null = null;
let handlingUnauthorized = false;

export function registerAuthSessionHandlers(handlers: { clearUser: ClearUserFn }): void {
  clearUserHandler = handlers.clearUser;
}

export async function clearAuthSession(): Promise<void> {
  if (handlingUnauthorized) {
    return;
  }

  handlingUnauthorized = true;
  try {
    await signOut();
  } catch {
    // Session may already be invalid
  }
  clearUserHandler?.();
  handlingUnauthorized = false;
}
