import { Customer } from "../../src/backend/domain/Customer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { db } from "../../src/backend/lib/db";
import { container } from "../../src/backend/lib/di";
import { CustomerNotFound } from "../../src/backend/application/UpdateCustomer";
import { resetDatabase } from "../mocks/db";

let id: string;
const originalTime = new Date("2026-11-15T00:00:00.000Z");
beforeEach(() => {
  resetDatabase();
  db.setPrincipal({
    userId: "staff",
    customerRead: true,
    customerCreate: true,
    customerUpdate: true,
  });
  vi.useFakeTimers();
  vi.setSystemTime(originalTime);
  id = container.resolve("customerRepository").create({
    name: "山田",
    email: "a@example.com",
    phone: "090",
    note: "備考",
  }).id;
  vi.setSystemTime("2026-11-15T01:00:00.000Z");
});
afterEach(() => {
  db.setPrincipal({});
  resetDatabase();
  vi.useRealTimers();
});

test("UpdateCustomer changes a persisted customer and returns result values while preserving omitted fields", () => {
  const result = container
    .resolve("updateCustomer")
    .execute({ id, name: "山田 花子", email: "" });
  expect(result).not.toBeInstanceOf(Customer);
  expect(result).toEqual({
    id,
    name: "山田 花子",
    email: "",
    phone: "090",
    note: "備考",
    createdAt: originalTime.toISOString(),
    updatedAt: "2026-11-15T01:00:00.000Z",
  });
  const saved = container.resolve("customerRepository").find(id);
  expect(saved).toBeInstanceOf(Customer);
  expect(saved?.name).toBe("山田 花子");
  expect(saved?.email).toBe("");
  expect(saved?.phone).toBe("090");
  expect(saved?.note).toBe("備考");
  expect(saved?.createdAt).toEqual(originalTime);
  expect(saved?.updatedAt).toEqual(new Date("2026-11-15T01:00:00.000Z"));
});

test("UpdateCustomer rejects a missing customer without creating it", () => {
  const missing = "22222222-2222-4222-8222-222222222222";
  expect(() =>
    container.resolve("updateCustomer").execute({ id: missing, name: "不在" }),
  ).toThrow(CustomerNotFound);
  expect(container.resolve("customerRepository").find(missing)).toBeNull();
});
