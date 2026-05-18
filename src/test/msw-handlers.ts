import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { components } from "@/lib/api/openapi-types";

type UserRead = components["schemas"]["UserRead"];
type UserPermissionsRead = components["schemas"]["UserPermissionsRead"];

export const sampleUser: UserRead = {
  id: "00000000-0000-0000-0000-000000000001",
  primary_email: "sample.user@example.com",
  status: "active",
  last_login_at: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
  profile: null,
};

export const samplePermissions: UserPermissionsRead = {
  permissions: ["course.read", "lesson.read"],
};

export const handlers = [
  http.get("http://localhost:8000/api/v1/users/me", () =>
    HttpResponse.json(sampleUser),
  ),
  http.get("http://localhost:8000/api/v1/users/me/permissions", () =>
    HttpResponse.json(samplePermissions),
  ),
];

export const server = setupServer(...handlers);
