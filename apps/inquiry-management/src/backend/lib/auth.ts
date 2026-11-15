import { AppsScriptAuth, AppsScriptAuthorization } from "@gasboost/auth";
import {
  SheetOrmAuthRepository,
  SheetOrmAuthorizationRepository,
} from "@gasboost/auth-sheetorm";
import { policy } from "../../shared/policy";
import { authTables, authorizationTables } from "../../shared/tables";
import { db } from "./db";

export const repository = new SheetOrmAuthRepository({
  db,
  schema: authTables.schema,
});
export const authorization = new AppsScriptAuthorization({
  policy,
  repository: new SheetOrmAuthorizationRepository({
    db,
    schema: authorizationTables.schema,
  }),
});
export const auth = new AppsScriptAuth({
  repository,
  appsScript: { enabled: false, isSignupEnabled: false },
  emailPassword: {
    enabled: true,
    isSignupEnabled: false,
    pepper:
      PropertiesService.getScriptProperties().getProperty("AUTH_PEPPER") || "",
    passwordReset: {
      delivery: {
        async send({ email, token }: { email: string; token: string }) {
          const base =
            PropertiesService.getScriptProperties().getProperty("APP_URL") ||
            ScriptApp.getService().getUrl();
          if (!base)
            throw new Error(
              "Deploy the Web App before requesting a password reset.",
            );
          const url = `${base.split("#")[0]}${base.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}#/reset-password`;
          MailApp.sendEmail({
            to: email,
            subject: "問い合わせ管理：パスワードの設定・再設定",
            body: `次のリンクからパスワードを設定してください。\n${url}`,
          });
        },
      },
    },
  },
  runtime: {
    cacheService: CacheService,
    propertiesService: PropertiesService,
    session: Session,
    utilities: Utilities,
  },
  session: { storageType: "cache" },
  user: {
    data: async ({ user }) => ({
      permissions: await authorization.resolve(user.id),
    }),
  },
});
