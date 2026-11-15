import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { db } from "../../src/backend/lib/db";
import { container } from "../../src/backend/lib/di";
import { Customer } from "../../src/backend/domain/Customer";
import { CustomerNotFound } from "../../src/backend/application/UpdateCustomer";
import { resetDatabase } from "../mocks/db";

const id = "11111111-1111-4111-8111-111111111111";
const originalTime = new Date("2026-11-15T00:00:00.000Z");
beforeEach(() => {
  resetDatabase();
  db.setPrincipal({
    userId: "staff",
    customerRead: true,
    customerCreate: true,
    customerUpdate: true,
  });
  container
    .resolve("customerRepository")
    .save(
      Customer.create(
        { name: "山田", email: "a@example.com", phone: "090", note: "備考" },
        id,
        originalTime,
      ),
    );
  vi.useFakeTimers();
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

test("UpdateCustomer preserves the stored customer when a Domain invariant fails", () => {
  expect(() =>
    container.resolve("updateCustomer").execute({ id, name: " " }),
  ).toThrow();
  const unchanged = container.resolve("customerRepository").find(id);
  expect(unchanged?.name).toBe("山田");
  expect(unchanged?.updatedAt).toEqual(originalTime);
});
