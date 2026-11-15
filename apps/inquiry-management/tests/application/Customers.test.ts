import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { authorization } from "../../src/backend/lib/auth";
import { db } from "../../src/backend/lib/db";
import { container } from "../../src/backend/lib/di";
import { CustomerNotFound } from "../../src/backend/application/Customers";
import { resetDatabase } from "../mocks/db";

beforeEach(async () => {
  resetDatabase();
  await authorization.role.assign("staff", "一般スタッフ");
  db.setPrincipal({
    userId: "staff",
    customerRead: true,
    customerCreate: true,
    customerUpdate: true,
  });
});
afterEach(() => {
  db.setPrincipal({});
  resetDatabase();
  vi.useRealTimers();
});

test("DI real use case and repository create, search and update while retaining all information", () => {
  const customers = container.resolve("customers");
  vi.useFakeTimers();
  vi.setSystemTime("2026-11-15T00:00:00.000Z");
  const created = customers.create({
    name: " 山田 ",
    email: "a@example.com",
    phone: "090",
    note: "備考",
  });
  expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(created.createdAt).toBe("2026-11-15T00:00:00.000Z");
  vi.setSystemTime("2026-11-15T01:00:00.000Z");
  const updated = customers.update({
    id: created.id,
    name: "山田 花子",
    email: "",
  });
  expect(updated).toEqual({
    ...created,
    name: "山田 花子",
    email: "",
    updatedAt: "2026-11-15T01:00:00.000Z",
  });
  expect(customers.list({ keyword: "花子", page: 1, pageSize: 20 })).toEqual({
    customers: [updated],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });
  expect(
    customers.list({ keyword: "不在", page: 1, pageSize: 20 }).totalPages,
  ).toBe(0);
  expect(() =>
    customers.update({
      id: "11111111-1111-4111-8111-111111111111",
      name: "不在",
    }),
  ).toThrow(CustomerNotFound);
  expect(() => customers.update({ id: created.id, name: " " })).toThrow();
  expect(
    customers.list({ keyword: "花子", page: 1, pageSize: 20 }).customers,
  ).toEqual([updated]);
});
