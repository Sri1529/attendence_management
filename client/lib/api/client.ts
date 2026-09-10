const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }

  get isBadRequest(): boolean {
    return this.status === 400;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isValidationError(): boolean {
    return this.status === 422 || this.status === 400;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

let accessToken: string | null = null;
let refreshToken: string | null = null;

export const setAuthTokens = (access: string | null, refresh: string | null) => {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== "undefined") {
    if (access) localStorage.setItem("access_token", access);
    else localStorage.removeItem("access_token");

    if (refresh) localStorage.setItem("refresh_token", refresh);
    else localStorage.removeItem("refresh_token");
  }
};

export const getStoredTokens = () => {
  if (typeof window !== "undefined") {
    const access = accessToken || localStorage.getItem("access_token");
    const refresh = refreshToken || localStorage.getItem("refresh_token");
    return { accessToken: access, refreshToken: refresh };
  }
  return { accessToken, refreshToken };
};

export const clearAuthTokens = () => {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
};

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  signal?: AbortSignal;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function fetchApi<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, headers = {}, signal, ...customConfig } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  const { accessToken: currentAccess, refreshToken: currentRefresh } =
    getStoredTokens();

  if (requiresAuth && currentAccess) {
    requestHeaders["Authorization"] = `Bearer ${currentAccess}`;
  }

  const config: RequestInit = {
    method: "GET",
    signal,
    ...customConfig,
    headers: requestHeaders,
  };

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  try {
    let response = await fetch(url, config);

    // Single-flight 401 Unauthorized token refresh strategy
    if (response.status === 401 && requiresAuth && currentRefresh && !endpoint.includes("/auth/login")) {
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: currentRefresh }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setAuthTokens(data.accessToken, data.refreshToken);
            processQueue(null, data.accessToken);

            // Retry original request with new access token
            requestHeaders["Authorization"] = `Bearer ${data.accessToken}`;
            response = await fetch(url, { ...config, headers: requestHeaders });
          } else {
            clearAuthTokens();
            processQueue(new ApiError("Session expired. Please log in again.", 401), null);
          }
        } catch (err) {
          clearAuthTokens();
          processQueue(err, null);
        } finally {
          isRefreshing = false;
        }
      } else {
        // Queue concurrent requests while single refresh is in-flight
        return new Promise<T>((resolve, reject) => {
          failedQueue.push({
            resolve: (newAccessToken) => {
              requestHeaders["Authorization"] = `Bearer ${newAccessToken as string}`;
              fetch(url, { ...config, headers: requestHeaders })
                .then((res) => res.json())
                .then((data) => resolve(data as T))
                .catch(reject);
            },
            reject: (err) => reject(err),
          });
        });
      }
    }

    if (!response.ok) {
      let errorData: { message?: string | string[] } | undefined;
      try {
        errorData = (await response.json()) as { message?: string | string[] };
      } catch {
        errorData = { message: response.statusText };
      }

      const message =
        Array.isArray(errorData?.message)
          ? errorData.message.join(", ")
          : errorData?.message || `Request failed with status ${response.status}`;

      throw new ApiError(message, response.status, errorData);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if ((error as Error).name === "AbortError") {
      throw new ApiError("Request cancelled", 0, { aborted: true });
    }
    throw new ApiError(
      (error as Error).message || "Network request failed. Please check your connection.",
      500
    );
  }
}

export async function fetchBlob(
  endpoint: string,
  options: RequestOptions = {}
): Promise<Blob> {
  const { requiresAuth = true, headers = {}, signal, ...customConfig } = options;

  const requestHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  const { accessToken: currentAccess } = getStoredTokens();

  if (requiresAuth && currentAccess) {
    requestHeaders["Authorization"] = `Bearer ${currentAccess}`;
  }

  const config: RequestInit = {
    method: "GET",
    signal,
    ...customConfig,
    headers: requestHeaders,
  };

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, config);

  if (!response.ok) {
    throw new ApiError(`Failed to fetch file (${response.status})`, response.status);
  }

  return response.blob();
}

// Convenient HTTP Helper Methods
export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    fetchApi<T>(endpoint, { ...options, method: "GET" }),

  getBlob: (endpoint: string, options?: RequestOptions) =>
    fetchBlob(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    fetchApi<T>(endpoint, { ...options, method: "DELETE" }),
};
