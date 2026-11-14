import { afterEach, vi } from "vitest";

// Only GAS built-ins are replaced. Handlers and RPC dispatch use the real app.
vi.stubGlobal("HtmlService", {
  createHtmlOutputFromFile: (filename: string) => ({
    filename,
    title: "",
    setTitle(title: string) {
      this.title = title;
      return this;
    },
  }),
});

afterEach(() => vi.restoreAllMocks());

// Install before @gasboost/client captures the GAS browser global.
export const gasBrowser = { script: { run: {} as object } };
vi.stubGlobal("google", gasBrowser);
