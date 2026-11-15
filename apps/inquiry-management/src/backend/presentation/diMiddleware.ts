import type { InquiryActor } from "../domain/Inquiry";
import { authorization, authorizationRepository } from "../lib/auth";
import { policy } from "../../shared/policy";
import type { AppsScriptMiddleware } from "@gasboost/app";
import type { AuthState } from "@gasboost/auth-app";
import { container, type DiContainer } from "../lib/di";

type DiState = {
  container: DiContainer;
  inquiryActor: InquiryActor;
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
    const permissions = await authorization.resolve(session.userId);
    const isAdmin = (
      await authorizationRepository.role.findByUserId(session.userId)
    ).includes("管理者");
    context.state.set("inquiryActor", { userId: session.userId, isAdmin });
    db.setPrincipal({
      isAdmin,
      inquiryRead: policy.can(permissions, { inquiry: ["read"] }),
      inquiryCreate: policy.can(permissions, { inquiry: ["create"] }),
      inquiryUpdate: policy.can(permissions, { inquiry: ["update"] }),
      userId: session.userId,
      customerRead: policy.can(permissions, { customer: ["read"] }),
      customerCreate: policy.can(permissions, { customer: ["create"] }),
      customerUpdate: policy.can(permissions, { customer: ["update"] }),
    });
    return await next();
  } finally {
    // SheetDB is shared; never retain a request's identity after it finishes.
    db.setPrincipal({});
  }
};
