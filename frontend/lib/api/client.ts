import { getApiBaseUrl } from "@/lib/env";
import type { ApiErrorPayload } from "@/types/api";

import { notifyAuthenticationFailure } from "./auth-events";
import { AUTHENTICATION_ERROR_CODES, ApiError } from "./errors";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  accessToken?: string | null;
  body?: unknown;
};

function isErrorDetail(
  value: unknown,
): value is { code: string; message: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const detail = value as Record<string, unknown>;
  return typeof detail.code === "string" && typeof detail.message === "string";
}

async function readResponseBody(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

function toApiError(response: Response, payload: unknown): ApiError {
  const errorPayload =
    typeof payload === "object" && payload !== null
      ? (payload as ApiErrorPayload)
      : {};

  if (isErrorDetail(errorPayload.detail)) {
    return new ApiError(
      response.status,
      errorPayload.detail.code,
      errorPayload.detail.message,
      errorPayload.detail,
    );
  }

  if (response.status === 422 && Array.isArray(errorPayload.detail)) {
    return new ApiError(
      response.status,
      "VALIDATION_ERROR",
      "The submitted information is invalid.",
      errorPayload.detail,
    );
  }

  return new ApiError(
    response.status,
    "HTTP_ERROR",
    "The service could not complete the request.",
    payload,
  );
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { accessToken, body, headers: suppliedHeaders, ...requestInit } = options;
  const headers = new Headers(suppliedHeaders);

  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(
      `${getApiBaseUrl()}/${path.replace(/^\/+/, "")}`,
      {
        ...requestInit,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Unable to reach the Route53 Clone API.",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseBody = await readResponseBody(response);
  if (!response.ok) {
    const error = toApiError(response, responseBody);
    if (
      error.status === 401 &&
      AUTHENTICATION_ERROR_CODES.has(error.code)
    ) {
      notifyAuthenticationFailure();
    }
    throw error;
  }

  return responseBody as T;
}
