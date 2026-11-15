import type { AppsScriptMiddleware } from "@gasboost/app";
import type { AuthState } from "@gasboost/auth-app";
import { container, type DiContainer } from "../lib/di";

type DiState = {
  container: DiContainer;
};

export const diMiddleware: AppsScriptMiddleware<
  AuthState,
  AuthState & DiState
> = async (context, next) => {
  const session = context.state.get("session");
  context.state.set("container", container);
  const db = container.resolve("db");
  db.setPrincipal({ userId: session.userId });
  try {
    return await next();
  } finally {
    // SheetDB is shared; never retain a request's identity after it finishes.
    db.setPrincipal({});
  }
};
