import { JSEncrypt } from "jsencrypt";
import {
  clearSession,
  store,
  updateTokens,
  type AuthSession,
} from "../store/auth";

const DEVELOPMENT_API_URL = "http://localhost:8080/api";
export const API_URL = (
  import.meta.env.VITE_API_URL || DEVELOPMENT_API_URL
).replace(/\/$/, "");

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiFailureEnvelope {
  success: false;
  code?: string;
  message?: string;
  path?: string;
  errors?: ApiFieldError[];
}

export interface ApiFieldError {
  field: string;
  code: string;
  message?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly data?: unknown;

  constructor(message: string, status = 0, code?: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const friendlyHttpMessage = (status: number): string => {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403)
    return "You do not have permission to perform this action.";
  if (status === 404) return "The requested resource was not found.";
  if (status >= 500)
    return "The server is temporarily unavailable. Please try again later.";
  return "Something went wrong. Please try again.";
};

export const sanitizeErrorMessage = (
  message: string,
  status: number,
): string => {
  const value = message.trim();
  if (
    !value ||
    value.length > 500 ||
    /<\s*!?doctype\s|<\s*(html|body)[\s>]/i.test(value)
  ) {
    return friendlyHttpMessage(status);
  }
  return value;
};

const parseResponse = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  if (response.headers.get("content-type")?.includes("application/json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
  return text;
};

const toApiError = (data: unknown, status: number): ApiError => {
  if (isRecord(data)) {
    const message =
      typeof data.message === "string"
        ? sanitizeErrorMessage(data.message, status)
        : friendlyHttpMessage(status);
    return new ApiError(
      message,
      status,
      typeof data.code === "string" ? data.code : undefined,
      data,
    );
  }
  return new ApiError(
    typeof data === "string"
      ? sanitizeErrorMessage(data, status)
      : friendlyHttpMessage(status),
    status,
    undefined,
    data,
  );
};

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = store.getState().auth.session?.refreshToken;
    if (!refreshToken)
      throw new ApiError(
        "Your session has expired. Please sign in again.",
        401,
      );

    const response = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client-Type": "WEB" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await parseResponse(response);
    if (!response.ok) throw toApiError(data, response.status);
    const payload = unwrap<{ token: string; refreshToken?: string }>(
      data,
      response.status,
    );
    store.dispatch(updateTokens(payload));
    return payload.token;
  })()
    .catch((error: unknown) => {
      store.dispatch(clearSession());
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
};

export const unwrap = <T>(data: unknown, status = 200): T => {
  if (isRecord(data) && "success" in data) {
    if (data.success === true) return data.data as T;
    throw toApiError(data, status);
  }
  return data as T;
};

const authEndpoints = new Set([
  "v1/auth/login",
  "v1/auth/refresh",
  "v1/auth/logout",
]);

const request = async <T>(
  endpoint: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> => {
  const normalizedEndpoint = endpoint.replace(/^\//, "");
  const token = store.getState().auth.session?.token;
  try {
    const response = await fetch(`${API_URL}/${normalizedEndpoint}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "X-Client-Type": "WEB",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const data = await parseResponse(response);

    if (!response.ok) {
      const error = toApiError(data, response.status);
      if (response.status === 401 && !authEndpoints.has(normalizedEndpoint)) {
        if (!retried && error.code === "SEC_103") {
          await refreshAccessToken();
          return request<T>(endpoint, options, true);
        }
        store.dispatch(clearSession());
      }
      throw error;
    }
    return unwrap<T>(data, response.status);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error
        ? sanitizeErrorMessage(error.message, 0)
        : "Unable to reach the server. Please check your connection.",
    );
  }
};

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

let publicKeyPromise: Promise<string> | null = null;
const encryptPassword = async (password: string): Promise<string> => {
  publicKeyPromise ??= fetch(
    `${import.meta.env.BASE_URL}keys/public_key.pem`,
  ).then(async (response) => {
    if (!response.ok) throw new Error("Unable to load login encryption key.");
    return response.text();
  });
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(await publicKeyPromise);
  const encrypted = encryptor.encrypt(password);
  if (!encrypted) throw new Error("Unable to encrypt password.");
  return encrypted;
};

interface LoginPayload {
  token?: string;
  refreshToken?: string;
  fullName?: string;
  role?: string;
  user?: { id: string; username: string; email?: string };
}

export const authApi = {
  async login(username: string, password: string): Promise<AuthSession> {
    const result = await api.post<LoginPayload>("v1/auth/login", {
      username,
      password: await encryptPassword(password),
    });
    if (!result.token)
      throw new ApiError("The server returned an invalid login response.");
    return {
      token: result.token,
      refreshToken: result.refreshToken,
      user: {
        id: result.user?.id ?? username,
        username: result.user?.username ?? username,
        email: result.user?.email,
        fullName: result.fullName,
        role: result.role,
      },
    };
  },
  async logout(): Promise<void> {
    const refreshToken = store.getState().auth.session?.refreshToken;
    try {
      if (refreshToken)
        await api.post<void>("v1/auth/logout", { refreshToken });
    } finally {
      store.dispatch(clearSession());
    }
  },
};
