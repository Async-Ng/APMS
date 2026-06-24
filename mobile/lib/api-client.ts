import { fetchAuthSession } from "aws-amplify/auth";
import axios from "axios";

import { clearAuthSession } from "./auth-session";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api",
  timeout: 30_000,
});

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
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      await clearAuthSession();
    }
    return Promise.reject(err);
  },
);

export { api };
