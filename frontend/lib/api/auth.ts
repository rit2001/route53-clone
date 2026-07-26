import type {
  AuthUser,
  LoginCredentials,
  LoginResponse,
} from "@/types/auth";

import { apiRequest } from "./client";

export function login(credentials: LoginCredentials): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: credentials,
  });
}

export function getCurrentUser(accessToken: string): Promise<AuthUser> {
  return apiRequest<AuthUser>("/auth/me", { accessToken });
}

export function logout(accessToken: string): Promise<void> {
  return apiRequest<void>("/auth/logout", {
    method: "POST",
    accessToken,
  });
}
