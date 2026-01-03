// Default to same-origin API. If deploying frontend separately (e.g. CDN),
// set VITE_API_BASE_URL to your backend origin + "/api" (or just the origin and keep API_BASE as "/api").
// Examples:
// - VITE_API_BASE_URL=https://api.example.com/api
// - VITE_API_BASE_URL=https://api.example.com  (we'll append "/api" below)
const rawBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
const normalizedBase = rawBase?.replace(/\/+$/, "");

// CRITICAL: Validate that if VITE_API_BASE_URL is provided, it must include protocol (https:// or http://)
// Without protocol, browsers treat it as a relative path and prepend the current origin
if (normalizedBase && !/^https?:\/\//i.test(normalizedBase)) {
  const errorMsg = `[api.ts] ERROR: VITE_API_BASE_URL must include protocol (https:// or http://). 
Current value: "${normalizedBase}"
Expected format: "https://your-backend-domain.com" or "https://your-backend-domain.com/api"
This causes requests to be treated as relative paths, resulting in 404 errors.`;
  console.error(errorMsg);
  throw new Error(errorMsg);
}

// Fix: Convert HTTPS localhost to HTTP (local development servers typically use HTTP)
// This prevents ERR_SSL_PROTOCOL_ERROR when VITE_API_BASE_URL is set to https://localhost
let fixedBase = normalizedBase;
if (normalizedBase && /^https:\/\/localhost/i.test(normalizedBase)) {
  fixedBase = normalizedBase.replace(/^https:/i, "http:");
  console.warn(
    `[api.ts] Converted HTTPS localhost to HTTP: ${normalizedBase} -> ${fixedBase}`
  );
}

const API_BASE = fixedBase
  ? fixedBase.endsWith("/api")
    ? fixedBase
    : `${fixedBase}/api`
  : "/api";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new ApiError(error.message || "Request failed", response.status, error);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, data: unknown) =>
    apiRequest<T>(endpoint, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown) =>
    apiRequest<T>(endpoint, { method: "PUT", body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data: unknown) =>
    apiRequest<T>(endpoint, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "DELETE" }),
};
