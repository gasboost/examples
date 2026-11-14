import app from "../../src/backend/main";
import { gasBrowser } from "./runtime";

// The GAS browser transport is the external boundary, not the query or UI.
export function installScriptRun(fail = false) {
  let onSuccess: (value: { contents: string }) => void;
  let onFailure: (error: Error) => void;
  const runner = {
    withSuccessHandler(handler: typeof onSuccess) {
      onSuccess = handler;
      return runner;
    },
    withFailureHandler(handler: typeof onFailure) {
      onFailure = handler;
      return runner;
    },
    getApplicationStatus() {
      queueMicrotask(() => {
        if (fail) onFailure(new Error("private server details"));
        else
          void app.dispatch("getApplicationStatus").then(onSuccess, onFailure);
      });
    },
  };
  gasBrowser.script.run = runner;
}
