import { authenticatedFetch } from "../auth";

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string, statusText: string) {
    super(`API ${status}: ${body || statusText}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /**
   * Best-effort parse of `body` as JSON. Returns `null` on failure.
   * Backends that follow the FastAPI convention return
   * `{detail: {error: "...", ...}}` for typed errors.
   */
  get parsedBody(): unknown {
    if (!this.body) return null;
    try {
      return JSON.parse(this.body);
    } catch {
      return null;
    }
  }

  /**
   * Domain error code surfaced by the backend, if any.
   * Pulled from `body.detail.error` when the body is JSON of the form
   * `{ detail: { error: string, ... } }`. Returns `null` otherwise.
   */
  get code(): string | null {
    const parsed = this.parsedBody;
    if (!parsed || typeof parsed !== "object") return null;
    const detail = (parsed as { detail?: unknown }).detail;
    if (!detail || typeof detail !== "object") return null;
    const error = (detail as { error?: unknown }).error;
    return typeof error === "string" ? error : null;
  }
}

async function readError(res: Response) {
  const body = await res.text().catch(() => "");
  return new ApiError(res.status, body, res.statusText);
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedFetch(path, init);

  if (!res.ok) {
    throw await readError(res);
  }

  return res.json() as Promise<T>;
}

export function apiFetch<T>(path: string): Promise<T> {
  return apiJson<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiJson<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiJson<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiJson<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete(path: string): Promise<void> {
  const res = await authenticatedFetch(path, { method: "DELETE" });

  if (!res.ok && res.status !== 204) {
    throw await readError(res);
  }
}
