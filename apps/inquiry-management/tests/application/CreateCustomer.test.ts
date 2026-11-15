import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { db } from "../../src/backend/lib/db";
import { container } from "../../src/backend/lib/di";
import { Customer } from "../../src/backend/domain/Customer";
import { resetDatabase } from "../mocks/db";

beforeEach(() => {
  resetDatabase();
  db.setPrincipal({
    userId: "staff",
    customerRead: true,
    customerCreate: true,
    customerUpdate: true,
  });
  vi.useFakeTimers();
  vi.setSystemTime("2026-11-15T00:00:00.000Z");
});
afterEach(() => {
  db.setPrincipal({});
  resetDatabase();
  vi.useRealTimers();
});

test("CreateCustomer returns the created customer information and persists through the real repository", () => {
  const result = container.resolve("createCustomer").execute({
    name: " 山田 ",
    email: "a@example.com",
    phone: "090",
    note: "備考",
  });
  expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(result).not.toBeInstanceOf(Customer);
  expect(result).toEqual({
    id: result.id,
    name: "山田",
    email: "a@example.com",
    phone: "090",
    note: "備考",
    createdAt: "2026-11-15T00:00:00.000Z",
    updatedAt: "2026-11-15T00:00:00.000Z",
  });
  const saved = container.resolve("customerRepository").find(result.id);
  expect(saved).toBeInstanceOf(Customer);
  expect(saved?.name).toBe("山田");
  expect(saved?.email).toBe("a@example.com");
  expect(saved?.phone).toBe("090");
  expect(saved?.note).toBe("備考");
  expect(saved?.createdAt).toEqual(new Date("2026-11-15T00:00:00.000Z"));
});

test("CreateCustomer accepts omitted optional fields", () => {
  const result = container
    .resolve("createCustomer")
    .execute({ name: "任意項目なし" });
  expect(result.name).toBe("任意項目なし");
  expect(container.resolve("customerRepository").find(result.id)?.name).toBe(
    result.name,
  );
});

test("CreateCustomer delegates required name validation to Domain and saves nothing on failure", () => {
  expect(() =>
    container.resolve("createCustomer").execute({ name: " " }),
  ).toThrow();
  expect(container.resolve("customerRepository").list("", 1, 20).total).toBe(0);
});
