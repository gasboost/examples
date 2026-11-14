// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { installScriptRun } from "../mocks/browser";
import { gasBrowser } from "../mocks/runtime";
import { App } from "../../src/frontend/App";

afterEach(() => {
  cleanup();
  gasBrowser.script.run = {};
});

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
  return queryClient;
}

test("displays RPC connection status", async () => {
  installScriptRun();
  const queryClient = renderApp();
  expect(screen.getByRole("status").textContent).toBe(
    "サーバーに接続しています…",
  );
  await screen.findByText("問い合わせ管理：接続済み");
  queryClient.clear();
});

test("displays a public connection error", async () => {
  installScriptRun(true);
  const queryClient = renderApp();
  await screen.findByText("サーバーに接続できませんでした。");
  expect(screen.queryByText(/private server details/)).toBeNull();
  queryClient.clear();
});
