import { QueryClient, QueryFunction } from "@tanstack/react-query";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getApiBase(): string | null {
  const rawBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  const normalizedBase = rawBase?.replace(/\/+$/, "");
  if (!normalizedBase) return null;

  // Fix: Convert HTTPS localhost to HTTP (local development servers typically use HTTP)
  // This prevents ERR_SSL_PROTOCOL_ERROR when VITE_API_BASE_URL is set to https://localhost
  let fixedBase = normalizedBase;
  if (/^https:\/\/localhost/i.test(normalizedBase)) {
    fixedBase = normalizedBase.replace(/^https:/i, "http:");
    console.warn(
      `[queryClient.ts] Converted HTTPS localhost to HTTP: ${normalizedBase} -> ${fixedBase}`
    );
  }

  return fixedBase.endsWith("/api") ? fixedBase : `${fixedBase}/api`;
}

function resolveUrl(urlOrPath: string): string {
  // If it's already an absolute URL, don't touch it.
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;

  const base = getApiBase();
  // Only rewrite same-origin API paths.
  if (base && urlOrPath.startsWith("/api")) return `${base}${urlOrPath.slice("/api".length)}`;
  return urlOrPath;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(resolveUrl(url), {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...getAuthHeaders(),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = resolveUrl(queryKey.join("/") as string);
    const res = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
