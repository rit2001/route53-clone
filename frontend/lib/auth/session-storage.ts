import type { StoredSession } from "@/types/auth";

export const SESSION_STORAGE_KEY = "route53_clone_session";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && window.localStorage !== undefined;
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Record<string, unknown>;
  return (
    typeof session.accessToken === "string" &&
    session.accessToken.length > 0 &&
    typeof session.expiresAt === "string" &&
    !Number.isNaN(Date.parse(session.expiresAt))
  );
}

export function storeSession(session: StoredSession): void {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
    }),
  );
}

export function loadSession(now = Date.now()): StoredSession | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession: unknown = JSON.parse(rawSession);
    if (
      !isStoredSession(parsedSession) ||
      Date.parse(parsedSession.expiresAt) <= now
    ) {
      clearSession();
      return null;
    }
    const session = {
      accessToken: parsedSession.accessToken,
      expiresAt: parsedSession.expiresAt,
    };
    storeSession(session);
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}
