import { AUTH_METADATA_KEY } from "@gasboost/auth-client/metadata";

export function authenticated(userId: string) {
  CacheService.getScriptCache().put(
    userId,
    JSON.stringify({
      id: userId,
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    }),
    60,
  );
  return { [AUTH_METADATA_KEY]: { token: userId } };
}
