export type AuthUser = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: "bearer";
  expires_at: string;
  user: AuthUser;
};

export type StoredSession = {
  accessToken: string;
  expiresAt: string;
};
