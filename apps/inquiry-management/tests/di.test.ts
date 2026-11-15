import { AUTH_METADATA_KEY } from "@gasboost/auth-client/metadata";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import app from "../src/backend/main";
import { auth } from "../src/backend/lib/auth";
import { db } from "../src/backend/lib/db";
import { container } from "../src/backend/lib/di";

const sessions = [
  { id: "session-a", userId: "user-a" },
  { id: "session-b", userId: "user-b" },
];

beforeEach(() => {
  db.setPrincipal({});
  for (const session of sessions) {
    CacheService.getScriptCache().put(
      session.id,
      JSON.stringify({
        ...session,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      }),
      60,
    );
  }
});

afterEach(() => {
  db.setPrincipal({});
  CacheService.getScriptCache().removeAll(sessions.map(({ id }) => id));
  PropertiesService.getScriptProperties().deleteProperty("APP_STATE");
  vi.restoreAllMocks();
});

test("authenticated handlers resolve existing dependencies and use only the session principal", async () => {
  const handler = vi.fn();
  const testApp = app.call(
    "testDiDependencies",
    (_input: { userId: string }, context) => {
      const di = context.state.get("container");
      expect(context.state.get("session").userId).toBe("user-a");
      expect(di).toBe(container);
      expect(Object.keys(di.registrations).sort()).toEqual([
        "auth",
        "customerRepository",
        "customers",
        "db",
      ]);
      expect(di.resolve("db")).toBe(db);
      expect(di.resolve("auth")).toBe(auth);
      expect(db.principal).toEqual({
        userId: "user-a",
        customerRead: false,
        customerCreate: false,
        customerUpdate: false,
      });
      handler();
      return "ok";
    },
  );

  const response = await testApp.dispatch(
    "testDiDependencies",
    { userId: "forged-user" },
    { [AUTH_METADATA_KEY]: { token: "session-a" }, userId: "forged-user" },
  );

  expect(handler).toHaveBeenCalledOnce();
  expect(JSON.parse(response.contents)).toBe("ok");
  expect(db.principal).toEqual({});
});

test("consecutive users replace the whole principal and clear it after async handlers", async () => {
  const testApp = app.call("testDiUserSwitch", async (_input, context) => {
    await Promise.resolve();
    expect(db.principal).toEqual({
      userId: context.state.get("session").userId,
      customerRead: false,
      customerCreate: false,
      customerUpdate: false,
    });
    return { ...db.principal };
  });

  db.setPrincipal({ userId: "previous-user", role: "admin" });
  for (const session of sessions) {
    const response = await testApp.dispatch("testDiUserSwitch", undefined, {
      [AUTH_METADATA_KEY]: { token: session.id },
    });
    expect(JSON.parse(response.contents)).toEqual({
      userId: session.userId,
      customerRead: false,
      customerCreate: false,
      customerUpdate: false,
    });
    expect(db.principal).toEqual({});
  }
});

test.each(["throw", "reject"])(
  "%s clears the principal before subsequent authenticated or unauthenticated calls",
  async (failure) => {
    const principals: Record<string, unknown>[] = [];
    const testApp = app.call(`testDiFailure-${failure}`, () => {
      principals.push({ ...db.principal });
      if (failure === "throw") throw new Error("handler failed");
      return Promise.resolve().then(() => {
        principals.push({ ...db.principal });
        throw new Error("handler failed");
      });
    });
    const handler = vi.fn(() => ({ ...db.principal }));
    testApp.call(`testDiAfterFailure-${failure}`, handler);

    await expect(
      testApp.dispatch(`testDiFailure-${failure}`, undefined, {
        [AUTH_METADATA_KEY]: { token: "session-a" },
      }),
    ).rejects.toThrow("INTERNAL_ERROR");
    expect(principals).toEqual(
      failure === "throw"
        ? [
            {
              userId: "user-a",
              customerRead: false,
              customerCreate: false,
              customerUpdate: false,
            },
          ]
        : [
            {
              userId: "user-a",
              customerRead: false,
              customerCreate: false,
              customerUpdate: false,
            },
            {
              userId: "user-a",
              customerRead: false,
              customerCreate: false,
              customerUpdate: false,
            },
          ],
    );
    expect(db.principal).toEqual({});

    await expect(
      testApp.dispatch(`testDiAfterFailure-${failure}`),
    ).rejects.toThrow("UNAUTHORIZED");
    expect(handler).not.toHaveBeenCalled();
    expect(db.principal).toEqual({});

    const response = await testApp.dispatch(
      `testDiAfterFailure-${failure}`,
      undefined,
      { [AUTH_METADATA_KEY]: { token: "session-b" } },
    );
    expect(JSON.parse(response.contents)).toEqual({
      userId: "user-b",
      customerRead: false,
      customerCreate: false,
      customerUpdate: false,
    });
    expect(db.principal).toEqual({});
  },
);

test("authentication blocks missing, unknown and expired sessions after a successful call", async () => {
  const handler = vi.fn(() => "ok");
  const testApp = app.call("testDiProtected", handler);
  await testApp.dispatch("testDiProtected", undefined, {
    [AUTH_METADATA_KEY]: { token: "session-a" },
  });
  handler.mockClear();
  CacheService.getScriptCache().put(
    "session-a",
    JSON.stringify({
      ...sessions[0],
      createdAt: new Date(Date.now() - 120_000),
      expiresAt: new Date(Date.now() - 60_000),
    }),
    60,
  );

  for (const metadata of [
    undefined,
    { [AUTH_METADATA_KEY]: { token: "missing-session" } },
    { [AUTH_METADATA_KEY]: { token: "session-a" } },
  ]) {
    await expect(
      testApp.dispatch(
        "testDiProtected",
        {
          userId: "user-a",
          customerRead: false,
          customerCreate: false,
          customerUpdate: false,
        },
        metadata,
      ),
    ).rejects.toThrow("UNAUTHORIZED");
    expect(db.principal).toEqual({});
  }
  expect(handler).not.toHaveBeenCalled();
});

test("existing auth and bootstrap RPCs stay outside authentication and DI", async () => {
  const setPrincipal = vi.spyOn(db, "setPrincipal");
  const response = await app.dispatch("getSession", {
    sessionId: "missing-session",
  });
  expect(JSON.parse(response.contents)).toBeNull();
  PropertiesService.getScriptProperties().setProperty(
    "APP_STATE",
    JSON.stringify({ initialized: true }),
  );
  await expect(
    app.dispatch("initializeApp", { token: "invalid-bootstrap-token" }),
  ).rejects.toThrow("ALREADY_INITIALIZED");
  expect(setPrincipal).not.toHaveBeenCalled();
});
