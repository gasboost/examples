import { describe, expect, it, vi } from "vitest";
import {
  InMemorySession,
  InMemoryContext,
  SecurityPolicy,
  OAuthScope,
} from "@gasboost/fake-core";
import { AppsScriptBootstrap } from "@gasboost/bootstrap";
import { policy, roles } from "../../src/shared/policy";
import { routes } from "../../src/shared/routes";
import {
  authTables,
  authorizationTables,
  tables,
} from "../../src/shared/tables";
import { sheetTables } from "../../src/backend/lib/sheets";
import { auth, authorization, repository } from "../../src/backend/lib/auth";
import { db } from "../../src/backend/lib/db";

describe("shared permissions, registration and routes", () => {
  it.each([roles.admin, roles.staff])(
    "grants common operations to %s",
    (role) => {
      const permissions = policy.resolve({ roles: [role], permissions: [] });
      expect(
        policy.can(permissions, {
          customers: ["read", "create", "update"],
          inquiries: ["read", "create", "update", "changeStatus", "addComment"],
        }),
      ).toBe(true);
      for (const permission of [
        "inquiries:assign",
        "staff:create",
        "staff:changeRole",
        "staff:disable",
      ]) {
        expect(
          permissions.includes(permission as typeof policy.$types.permission),
        ).toBe(role === roles.admin);
      }
    },
  );

  it("denies unknown roles and preserves effective permission overrides for session guards", () => {
    expect(policy.resolve({ roles: ["unknown"], permissions: [] })).toEqual([]);
    const permissions = policy.resolve({
      roles: [roles.admin],
      permissions: [{ permission: "inquiries:assign", effect: "deny" }],
    });
    expect(policy.can(permissions, { inquiries: ["assign"] })).toBe(false);
    expect(policy.can(permissions, { inquiries: ["read"] })).toBe(true);
  });

  it("grants business permissions to the administrator actually created by Bootstrap", async () => {
    const originalSession = Session;
    const email = "bootstrap@example.com";
    const token = "shared-contract-bootstrap-token";
    const properties = PropertiesService.getScriptProperties();
    vi.stubGlobal(
      "Session",
      new InMemorySession(
        new InMemoryContext(
          email,
          email,
          { type: "WEB_APP", executeAs: "USER" },
          new SecurityPolicy([OAuthScope.USERINFO_EMAIL]),
          "ja",
          "Asia/Tokyo",
        ),
      ),
    );
    const sendEmail = vi.fn();
    vi.stubGlobal("MailApp", { sendEmail });
    properties.setProperty(
      "APP_URL",
      "https://script.google.com/macros/s/test/exec",
    );
    properties.setProperty(
      "APP_STATE",
      JSON.stringify({
        initialized: false,
        bootstrap: {
          token,
          email,
          expiresAt: Date.now() + 60_000,
          attempts: 0,
          notified: true,
        },
      }),
    );
    const bootstrap = new AppsScriptBootstrap({
      db,
      auth,
      authorization,
      authRepository: repository,
    });
    try {
      await expect(
        bootstrap.handlers().initializeApp({ token }),
      ).resolves.toEqual({ initialized: true });
      const [assigned] = db.table(authorizationTables.role.name).find();
      expect(assigned.role).toBe(roles.admin);
      const permissions = await authorization.resolve(assigned.userId);
      expect(
        policy.can(permissions, {
          customers: ["read", "create", "update"],
          inquiries: [
            "read",
            "create",
            "update",
            "changeStatus",
            "addComment",
            "assign",
          ],
          staff: ["create", "changeRole", "disable"],
        }),
      ).toBe(true);
      expect(sendEmail).toHaveBeenCalledOnce();
    } finally {
      vi.stubGlobal("Session", originalSession);
      properties.deleteProperty("APP_URL");
      properties.deleteProperty("APP_STATE");
    }
  });

  it("registers exactly three business tables alongside all generated auth tables", () => {
    expect(tables.map((table) => table.name)).toEqual([
      authTables.user.name,
      authTables.account.name,
      authTables.passwordReset.name,
      authorizationTables.role.name,
      authorizationTables.permission.name,
      "Customer",
      "Inquiry",
      "InquiryEvent",
    ]);
    expect(sheetTables.map((table) => table.name)).toEqual(
      tables.map((table) => table.name),
    );
    for (const table of tables) {
      expect(
        sheetTables.find((sheet) => sheet.name === table.name)?.schema,
      ).toBe(table.schema);
    }
  });

  it("preserves Registry authentication routes and adds business entry routes", () => {
    expect(routes).toEqual({
      home: "/",
      customers: "/customers",
      inquiries: "/inquiries",
      staff: "/staff",
      auth: {
        signIn: "/sign-in",
        signUp: "/sign-up",
        forgotPassword: "/forgot-password",
        resetPassword: "/reset-password",
      },
      system: {
        forbidden: "/forbidden",
        bootstrap: "/bootstrap",
        unauthorized: "/unauthorized",
      },
    });
  });
});
