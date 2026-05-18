import { ApiError } from "./client";

export type ApiErrorCode =
  | "card_cooldown_active"
  | "concurrent_reprocess"
  | "upload_not_found"
  | "upload_invalid"
  | "permission_denied"
  | "not_found"
  | "conflict";

export function getApiErrorCode(err: unknown): ApiErrorCode | null {
  if (!(err instanceof ApiError)) return null;
  const code = err.code;
  return code === null ? null : (code as ApiErrorCode);
}

export function isApiErrorCode(err: unknown, code: ApiErrorCode): boolean {
  return getApiErrorCode(err) === code;
}
