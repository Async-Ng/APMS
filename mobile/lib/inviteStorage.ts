import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_INVITE_KEY = "apms_pending_invite_token";

export async function setPendingInviteToken(token: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_INVITE_KEY, token);
}

export async function getPendingInviteToken(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_INVITE_KEY);
}

export async function clearPendingInviteToken(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_INVITE_KEY);
}
