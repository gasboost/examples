import { appsScriptClient } from "@gasboost/client";
import { expect, test } from "vitest";
import app, { type AppType } from "../../src/backend/main";

test("typed RPC reaches the registered backend handler", async () => {
  const { client } = appsScriptClient<AppType>({
    transport: { call: (name, input) => app.dispatch(name, input) },
  });
  await expect(client.getApplicationStatus()).resolves.toEqual({
    name: "問い合わせ管理",
    status: "ok",
  });
});

test("GET serves the built frontend with the application title", () => {
  const doGet = (
    globalThis as unknown as {
      doGet: (event: object) => unknown;
    }
  ).doGet;
  expect(doGet({ parameter: {}, parameters: {} })).toMatchObject({
    filename: "index",
    title: "問い合わせ管理",
  });
});
