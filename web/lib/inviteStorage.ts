const PENDING_INVITE_KEY = "apms_pending_invite_token";

export function setPendingInviteToken(token: string): void {
  window.localStorage.setItem(PENDING_INVITE_KEY, token);
}

export function getPendingInviteToken(): string | null {
  return window.localStorage.getItem(PENDING_INVITE_KEY);
}

export function clearPendingInviteToken(): void {
  window.localStorage.removeItem(PENDING_INVITE_KEY);
}
