import { AUTH_METADATA_KEY } from "@gasboost/auth-client/metadata";
import { afterEach, expect, test, vi } from "vitest";
import app from "../src/backend/main";
import { auth } from "../src/backend/lib/auth";
import { db } from "../src/backend/lib/db";
import { container } from "../src/backend/lib/di";

afterEach(() => vi.restoreAllMocks());

test("authenticated handlers can resolve existing dependencies through state", async () => {
  const session = {
    id: "test-session",
    userId: "test-user",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  };
  const getSession = vi.spyOn(auth.session, "get").mockResolvedValue(session);
  const handler = vi.fn();
  const testApp = app.call("testDiDependencies", (_input, context) => {
    const di = context.state.get("container");
    expect(context.state.get("session")).toBe(session);
    expect(di).toBe(container);
    expect(Object.keys(di.registrations).sort()).toEqual(["auth", "db"]);
    expect(di.resolve("db")).toBe(db);
    expect(di.resolve("auth")).toBe(auth);
    handler();
    return "ok";
  });

  const response = await testApp.dispatch("testDiDependencies", undefined, {
    [AUTH_METADATA_KEY]: { token: session.id },
  });

  expect(getSession).toHaveBeenCalledWith(session.id);
  expect(handler).toHaveBeenCalledOnce();
  expect(JSON.parse(response.contents)).toBe("ok");
});

test("authentication blocks protected handlers while existing auth RPCs remain public", async () => {
  const handler = vi.fn(() => "unreachable");
  const testApp = app.call("testDiProtected", handler);

  await expect(testApp.dispatch("testDiProtected")).rejects.toThrow(
    "UNAUTHORIZED",
  );
  expect(handler).not.toHaveBeenCalled();

  const response = await testApp.dispatch("getSession", {
    sessionId: "missing-session",
  });
  expect(JSON.parse(response.contents)).toBeNull();
});
