import axios, { AxiosError } from "axios";
import type { ApiResponse } from "@/types/api";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const TOKEN_KEY = "glicocare.accessToken";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      setStoredToken(null);
      localStorage.removeItem("glicocare.user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// This app moved from the .NET/Axios API to Supabase early on, but this function was
// never updated to match — it only ever recognised Axios error shapes, so every
// toast.error(extractErrorMessage(...)) call in the whole app (Supabase errors, plain
// Error/DOMException from things like the Push API, etc.) silently fell through to the
// generic fallback, hiding the real cause from the user in every single error toast.
export function extractErrorMessage(error: unknown, fallback = "Ocorreu um erro. Tente novamente."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse<unknown> | undefined;
    if (data?.message) return data.message;
    if (data?.errors?.length) return data.errors.join(", ");
  }
  // Supabase (PostgrestError / AuthError) and plain Error/DOMException instances all
  // expose a string `message` property — this covers every non-Axios error the app
  // actually throws today.
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) return message;
  }
  return fallback;
}
