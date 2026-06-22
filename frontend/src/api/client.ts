const BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type ApiOptions = {
  method?: string;
  token?: string | null;
  json?: unknown;
  formData?: FormData;
};

async function readErrorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  return body?.detail ?? response.statusText;
}

// A 401 on a request that carried a token means the session itself is dead (expired, or
// the user no longer exists) - not just "this one call failed". AuthProvider registers a
// handler here so any API call, anywhere, can trigger a clean logout instead of leaving a
// dead token in localStorage that keeps letting RequireAuth wave the user onto pages whose
// data calls will just fail.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData; // browser sets the multipart Content-Type boundary itself
  } else if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
  });

  if (!response.ok) {
    if (response.status === 401 && options.token) {
      unauthorizedHandler?.();
    }
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function apiDownload(
  path: string,
  token: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      unauthorizedHandler?.();
    }
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? "download";

  return { blob: await response.blob(), filename };
}
