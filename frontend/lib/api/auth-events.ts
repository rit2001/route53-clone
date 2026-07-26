type AuthenticationFailureHandler = () => void;

const authenticationFailureHandlers =
  new Set<AuthenticationFailureHandler>();

export function registerAuthenticationFailureHandler(
  handler: AuthenticationFailureHandler,
): () => void {
  authenticationFailureHandlers.add(handler);
  return () => authenticationFailureHandlers.delete(handler);
}

export function notifyAuthenticationFailure(): void {
  authenticationFailureHandlers.forEach((handler) => handler());
}
