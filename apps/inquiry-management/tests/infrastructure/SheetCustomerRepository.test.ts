import { Customer } from "../../src/backend/domain/Customer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { db } from "../../src/backend/lib/db";
import { SheetCustomerRepository } from "../../src/backend/infrastructure/SheetCustomerRepository";
import { resetDatabase } from "../mocks/db";

const repository = new SheetCustomerRepository(db);
const now = new Date("2026-11-15T00:00:00.000Z");
beforeEach(() => {
  resetDatabase();
  db.setPrincipal({
    userId: "staff",
    customerRead: true,
    customerCreate: true,
    customerUpdate: true,
  });
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => {
  db.setPrincipal({});
  resetDatabase();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("SheetORM assigns UUIDs and the repository saves, restores and reloads customer information", () => {
  const generated = "11111111-1111-4111-8111-111111111111";
  vi.spyOn(Utilities, "getUuid").mockReturnValue(generated);
  const original = repository.create({
    name: "山田",
    email: "yamada@example.com",
    phone: "03-1234",
    note: "改行\n備考",
  });
  expect(db.definition("Customer").autoNumbering).toBe("uuid");
  expect(original).toBeInstanceOf(Customer);
  expect(original.id).toBe(generated);
  const [stored] = db.table("Customer").find();
  expect(stored).toEqual({
    id: generated,
    name: "山田",
    email: "yamada@example.com",
    phone: "03-1234",
    note: "改行\n備考",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  expect(repository.find(original.id)).toBeInstanceOf(Customer);
  expect(repository.find(original.id)).toEqual({
    ...original,
    createdAt: now,
    updatedAt: now,
  });
  vi.setSystemTime("2026-11-15T01:00:00.000Z");
  const updated = repository.update(original.id, {
    name: "佐藤",
    email: "",
    phone: "",
    note: "新しい備考",
  });
  db.definition("Customer").cache.clear();
  const reloaded = new SheetCustomerRepository(db).find(original.id);
  expect(reloaded).toBeInstanceOf(Customer);
  expect(reloaded).toEqual(updated);
  expect(updated).toEqual({
    id: original.id,
    name: "佐藤",
    email: "",
    phone: "",
    note: "新しい備考",
    createdAt: now,
    updatedAt: new Date("2026-11-15T01:00:00.000Z"),
  });
  expect(db.table("Customer").find()[0]).toEqual({
    ...stored,
    name: "佐藤",
    email: "",
    phone: "",
    note: "新しい備考",
    updatedAt: "2026-11-15T01:00:00.000Z",
  });
});

test("partial updates preserve omitted optional fields and missing IDs never create rows", () => {
  const original = repository.create({
    name: "山田",
    email: "a@example.com",
    phone: "03",
    note: "備考",
  });
  expect(
    repository.update(original.id, { name: "佐藤", email: undefined }),
  ).toEqual({ ...original, name: "佐藤" });
  const missing = "22222222-2222-4222-8222-222222222222";
  expect(repository.find(missing)).toBeNull();
  expect(repository.update(missing, { name: "不在" })).toBeNull();
  expect(repository.list("", 1, 20).total).toBe(1);
});

test("search and paging keep totals and return empty results", () => {
  for (let index = 1; index <= 23; index++)
    repository.create({ name: index === 23 ? "佐藤" : `山田${index}` });
  expect(repository.list("山田", 1, 20).customers).toHaveLength(20);
  expect(repository.list("山田", 2, 20).customers).toHaveLength(2);
  expect(repository.list("山田", 2, 20).total).toBe(22);
  expect(repository.list("山田", 3, 20)).toEqual({ customers: [], total: 22 });
  expect(repository.list("存在しない", 1, 20)).toEqual({
    customers: [],
    total: 0,
  });
});

test("SheetORM enforces record schema on writes and rolls back invalid updates", () => {
  expect(() => repository.create({ name: "山田", email: "invalid" })).toThrow();
  expect(repository.list("", 1, 20).total).toBe(0);
  const original = repository.create({ name: "山田" });
  expect(() => repository.update(original.id, { email: "invalid" })).toThrow();
  expect(repository.find(original.id)).toEqual(original);
});

test.each([
  { id: "invalid" },
  { createdAt: "invalid-date" },
  { updatedAt: "invalid-date" },
])("repository rejects malformed stored records: %j", (invalid) => {
  // Seed bypasses write validation to represent corrupted external sheet data.
  db.seed("Customer", [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "破損データ",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ...invalid,
    },
  ]);
  expect(() => repository.list("", 1, 20)).toThrow();
  expect(() =>
    repository.find(invalid.id ?? "11111111-1111-4111-8111-111111111111"),
  ).toThrow();
});
