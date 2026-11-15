import {
  AppsScript,
  AppsScriptError,
  type InferAppsScript,
} from "@gasboost/app";
import {
  authentication,
  authErrorHandler,
  handlers,
  authorization as authorize,
} from "@gasboost/auth-app";
import type { z } from "zod";
import { CustomerNotFound } from "./application/UpdateCustomer";
import {
  createCustomerInput,
  listCustomersInput,
  updateCustomerInput,
} from "./presentation/customerSchemas";
import { auth, authorization } from "./lib/auth";
import { bootstrap } from "./lib/bootstrap";
import { templateValue } from "./lib/templateValue";
import { diMiddleware } from "./presentation/diMiddleware";

const app = new AppsScript()
  .get((request) => {
    const template = HtmlService.createTemplateFromFile("index");
    template.__BOOTSTRAP__ = templateValue(bootstrap.handle(request));
    return template.evaluate().setTitle("GAS BOOST");
  })
  .calls(bootstrap.handlers())
  .use(authErrorHandler())
  .calls(handlers(auth))
  .use(authentication(auth))
  .use(diMiddleware)
  .call(
    "listCustomers",
    (input: z.input<typeof listCustomersInput>, context) => {
      const parsed = listCustomersInput.safeParse(input);
      if (!parsed.success)
        throw new AppsScriptError({
          code: "INVALID_INPUT",
          message: "検索条件が正しくありません。",
        });
      return context.state
        .get("container")
        .resolve("listCustomers")
        .execute(parsed.data);
    },
    [authorize(authorization, { customer: ["read"] })],
  )
  .call(
    "createCustomer",
    (input: z.input<typeof createCustomerInput>, context) => {
      const parsed = createCustomerInput.safeParse(input);
      if (!parsed.success)
        throw new AppsScriptError({
          code: "INVALID_INPUT",
          message: "顧客情報が正しくありません。",
        });
      return context.state
        .get("container")
        .resolve("createCustomer")
        .execute(parsed.data);
    },
    [authorize(authorization, { customer: ["create"] })],
  )
  .call(
    "updateCustomer",
    (input: z.input<typeof updateCustomerInput>, context) => {
      const parsed = updateCustomerInput.safeParse(input);
      if (!parsed.success)
        throw new AppsScriptError({
          code: "INVALID_INPUT",
          message: "顧客情報が正しくありません。",
        });
      try {
        return context.state
          .get("container")
          .resolve("updateCustomer")
          .execute(parsed.data);
      } catch (error) {
        if (error instanceof CustomerNotFound)
          throw new AppsScriptError({
            code: "NOT_FOUND",
            message: "顧客が見つかりません。",
          });
        throw error;
      }
    },
    [authorize(authorization, { customer: ["update"] })],
  );

export default app;
export type AppType = InferAppsScript<typeof app>;
