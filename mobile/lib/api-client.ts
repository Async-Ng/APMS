import { fetchAuthSession, signOut } from "aws-amplify/auth";
import axios from "axios";

import { useAuthStore } from "../stores/auth-store";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api",
});

let handlingUnauthorized = false;

api.interceptors.request.use(async (config) => {
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();

  if (idToken) {
    config.headers.Authorization = `Bearer ${idToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (axios.isAxiosError(err) && err.response?.status === 401 && !handlingUnauthorized) {
      handlingUnauthorized = true;
      try {
        await signOut();
      } catch {
        // Session may already be invalid
      }
      useAuthStore.getState().clearUser();
      handlingUnauthorized = false;
    }
    return Promise.reject(err);
  },
);

export { api };
