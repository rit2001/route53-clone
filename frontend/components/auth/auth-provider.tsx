"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentUser,
  login as requestLogin,
  logout as requestLogout,
} from "@/lib/api/auth";
import { registerAuthenticationFailureHandler } from "@/lib/api/auth-events";
import {
  clearSession,
  loadSession,
  storeSession,
} from "@/lib/auth/session-storage";
import type { AuthUser, LoginCredentials } from "@/types/auth";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  accessToken: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = Readonly<{
  children: ReactNode;
}>;

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const restorationStarted = useRef(false);

  const clearAuthentication = useCallback(() => {
    clearSession();
    setUser(null);
    setAccessToken(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  useEffect(
    () => registerAuthenticationFailureHandler(clearAuthentication),
    [clearAuthentication],
  );

  useEffect(() => {
    if (restorationStarted.current) {
      return;
    }
    restorationStarted.current = true;

    const storedSession = loadSession();
    if (!storedSession) {
      queueMicrotask(() => {
        setStatus("unauthenticated");
      });
      return;
    }

    void getCurrentUser(storedSession.accessToken)
      .then((restoredUser) => {
        setUser(restoredUser);
        setAccessToken(storedSession.accessToken);
        setStatus("authenticated");
      })
      .catch(() => {
        clearAuthentication();
      });
  }, [clearAuthentication]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await requestLogin(credentials);
    storeSession({
      accessToken: response.access_token,
      expiresAt: response.expires_at,
    });
    setAccessToken(response.access_token);
    setUser(response.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    const currentToken = accessToken;
    try {
      if (currentToken) {
        await requestLogout(currentToken);
      }
    } catch {
      // Local sign-out must succeed even when the mocked API is unavailable.
    } finally {
      clearAuthentication();
    }
  }, [accessToken, clearAuthentication]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout, accessToken }),
    [user, status, login, logout, accessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
