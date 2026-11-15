import { afterEach, beforeEach, expect, test } from "vitest";
import app from "../../src/backend/main";
import { authorization } from "../../src/backend/lib/auth";
import { db } from "../../src/backend/lib/db";
import { resetDatabase } from "../mocks/db";
import { authenticated } from "../mocks/auth";

const missingId = "11111111-1111-4111-8111-111111111111";
beforeEach(async () => {
  resetDatabase();
  db.setPrincipal({});
  await authorization.role.assign("admin", "管理者");
  await authorization.role.assign("staff", "一般スタッフ");
});
afterEach(() => {
  db.setPrincipal({});
  resetDatabase();
  CacheService.getScriptCache().removeAll(["admin", "staff", "outsider"]);
});

test.each(["admin", "staff"])(
  "%s can call each API through real auth middleware, DI, use case and repository",
  async (userId) => {
    const metadata = authenticated(userId);
    const created = JSON.parse(
      (
        await app.dispatch(
          "createCustomer",
          { name: " 山田 ", email: "a@example.com", phone: "03", note: "備考" },
          metadata,
        )
      ).contents,
    );
    expect(created).toMatchObject({
      name: "山田",
      email: "a@example.com",
      phone: "03",
      note: "備考",
    });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    const updated = JSON.parse(
      (
        await app.dispatch(
          "updateCustomer",
          {
            id: created.id,
            name: "山田 花子",
            email: "",
            phone: "",
            note: "変更",
          },
          metadata,
        )
      ).contents,
    );
    expect(updated).toMatchObject({
      id: created.id,
      name: "山田 花子",
      email: "",
      phone: "",
      note: "変更",
      createdAt: created.createdAt,
    });
    const listed = JSON.parse(
      (
        await app.dispatch(
          "listCustomers",
          { keyword: "花子", page: 1 },
          metadata,
        )
      ).contents,
    );
    expect(listed).toEqual({
      customers: [updated],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    expect(
      JSON.parse(
        (await app.dispatch("listCustomers", { keyword: "不在" }, metadata))
          .contents,
      ).customers,
    ).toEqual([]);
    await expect(
      app.dispatch("updateCustomer", { id: missingId, name: "不在" }, metadata),
    ).rejects.toThrow("NOT_FOUND");
    expect(db.principal).toEqual({});
  },
);

test.each([
  ["listCustomers", {}],
  ["createCustomer", { name: "山田" }],
  ["updateCustomer", { id: missingId, name: "山田" }],
])(
  "%s rejects unauthenticated and unprivileged callers",
  async (name, input) => {
    for (const metadata of [undefined, authenticated("outsider")]) {
      await expect(
        app.dispatch(name as string, input, metadata),
      ).rejects.toThrow(metadata ? "FORBIDDEN" : "UNAUTHORIZED");
      expect(db.principal).toEqual({});
    }
  },
);

test.each([
  ["listCustomers", { page: 0 }],
  ["listCustomers", { page: 1.5 }],
  ["listCustomers", { pageSize: 101 }],
  ["listCustomers", { keyword: 123 }],
  ["createCustomer", { name: " " }],
  ["createCustomer", { name: "山田", email: "invalid" }],
  ["createCustomer", { name: "山田", phone: 123 }],
  ["createCustomer", { name: "山田", note: null }],
  ["createCustomer", { name: "山田", id: missingId }],
  ["updateCustomer", { id: "invalid" }],
  ["updateCustomer", { id: missingId, name: "" }],
  ["updateCustomer", { id: missingId, email: "invalid" }],
  ["updateCustomer", { id: missingId, updatedAt: "forged" }],
])("%s validates untrusted input %j", async (name, input) => {
  await expect(
    app.dispatch(name as string, input, authenticated("staff")),
  ).rejects.toThrow("INVALID_INPUT");
});

test.each([
  ["listCustomers", "read", {}],
  ["createCustomer", "create", { name: "拒否" }],
  ["updateCustomer", "update", { id: missingId, name: "拒否" }],
] as const)(
  "%s applies its own operation permission",
  async (name, action, input) => {
    await authorization.permission.deny("staff", `customer:${action}`);
    await expect(
      app.dispatch(name, input, authenticated("staff")),
    ).rejects.toThrow("FORBIDDEN");
  },
);

test("role revocation and permission overrides are reflected in subsequent calls", async () => {
  const metadata = authenticated("staff");
  await app.dispatch("listCustomers", {}, metadata);
  await authorization.role.revoke("staff", "一般スタッフ");
  await expect(app.dispatch("listCustomers", {}, metadata)).rejects.toThrow(
    "FORBIDDEN",
  );
  await authorization.permission.allow("staff", "customer:read");
  expect(
    JSON.parse((await app.dispatch("listCustomers", {}, metadata)).contents)
      .customers,
  ).toEqual([]);
});
