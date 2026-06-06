const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
const SESSION_KEY = "emr.session";

export type User = {
  id: number;
  email: string;
  fullName: string;
  roles: string[];
  wallets: string[];
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { code: string; message: string; details?: Record<string, string> };
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setSession(session: Session | null) {
  if (typeof window === "undefined") return;
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("emr-session-change"));
}

let refreshPromise: Promise<Session | null> | null = null;

async function refreshSession(): Promise<Session | null> {
  const current = getSession();
  if (!current?.refreshToken) return null;
  if (!refreshPromise) {
    refreshPromise = publicApi<Session>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    })
      .then((session) => {
        setSession(session);
        return session;
      })
      .catch(() => {
        setSession(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    throw new ApiClientError(payload?.error?.message ?? `API request failed (${response.status})`,
      response.status, payload?.error?.code);
  }
  return payload.data;
}

export async function publicApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  return parseResponse<T>(response);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const session = getSession();
  if (!session) throw new ApiClientError("Phiên đăng nhập không tồn tại", 401);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry && (await refreshSession())) return apiFetch<T>(path, init, false);
  return parseResponse<T>(response);
}

export async function apiDownload(path: string): Promise<Blob> {
  const session = getSession();
  if (!session) throw new ApiClientError("Phiên đăng nhập không tồn tại", 401);
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  if (!response.ok) throw new ApiClientError(`Không thể tải file (${response.status})`, response.status);
  return response.blob();
}
