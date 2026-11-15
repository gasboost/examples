import { afterEach, beforeEach, expect, test } from "vitest";
import { Customer } from "../../src/backend/domain/Customer";
import { db } from "../../src/backend/lib/db";
import { SheetCustomerRepository } from "../../src/backend/infrastructure/SheetCustomerRepository";
import { resetDatabase } from "../mocks/db";

const repository = new SheetCustomerRepository(db);
const now = new Date("2026-11-15T00:00:00.000Z");
const original = new Customer({
  id: "11111111-1111-4111-8111-111111111111",
  name: "山田",
  email: "a@example.com",
  phone: "03",
  note: "改行\n備考",
  createdAt: now,
  updatedAt: now,
});
beforeEach(() => {
  resetDatabase();
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
});

test("save returns void, preserves the aggregate ID and find restores the saved Customer", () => {
  expect(repository.save(original)).toBeUndefined();
  const [stored] = db.table("Customer").find();
  expect(stored).toEqual({
    id: original.id,
    name: "山田",
    email: "a@example.com",
    phone: "03",
    note: "改行\n備考",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  const [restored] = repository.find({ id: original.id });
  expect(restored).toBeInstanceOf(Customer);
  expect(restored).toEqual(original);
  expect(restored).not.toBe(original);
  expect(original.id).toBe(stored.id);
});

test("saving the same identity persists the supplied state and a fresh repository reloads it", () => {
  repository.save(original);
  const changed = new Customer({
    id: original.id,
    name: "佐藤",
    email: "",
    phone: "",
    note: "新しい備考",
    createdAt: now,
    updatedAt: new Date("2026-11-15T01:00:00.000Z"),
  });
  expect(repository.save(changed)).toBeUndefined();
  db.definition("Customer").cache.clear();
  const reloaded = new SheetCustomerRepository(db).find({ id: original.id });
  expect(reloaded).toHaveLength(1);
  expect(reloaded[0]).toBeInstanceOf(Customer);
  expect(reloaded[0]).toEqual(changed);
  expect(db.table("Customer").find()).toHaveLength(1);
  expect(db.table("Customer").find()[0].updatedAt).toBe(
    "2026-11-15T01:00:00.000Z",
  );
});

test("find supports no conditions, ID, keyword and query paging, returning arrays including empty matches", () => {
  for (let index = 1; index <= 23; index++)
    repository.save(
      new Customer({
        id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
        name: index === 23 ? "佐藤" : `山田${index}`,
        createdAt: now,
        updatedAt: now,
      }),
    );
  expect(repository.find({})).toHaveLength(23);
  expect(repository.find({ keyword: "山田" })).toHaveLength(22);
  expect(
    repository.find({ keyword: "山田", offset: 0, limit: 20 }),
  ).toHaveLength(20);
  const second = repository.find({ keyword: "山田", offset: 20, limit: 20 });
  expect(second).toHaveLength(2);
  expect(second[0]).toBeInstanceOf(Customer);
  expect(second[0].name).toBe("山田21");
  expect(repository.find({ keyword: "山田", offset: 40, limit: 20 })).toEqual(
    [],
  );
  expect(repository.find({ keyword: "不在" })).toEqual([]);
  expect(
    repository.find({ id: "22222222-2222-4222-8222-222222222222" }),
  ).toEqual([]);
});

test("SheetORM rejects an invalid record on save without changing persisted data", () => {
  repository.save(original);
  const invalid = new Customer({ ...original, email: "invalid" });
  expect(() => repository.save(invalid)).toThrow();
  expect(repository.find({ id: original.id })).toEqual([original]);
});

test.each([
  { id: "invalid" },
  { createdAt: "invalid-date" },
  { updatedAt: "invalid-date" },
])("repository rejects malformed stored records: %j", (invalid) => {
  // Seed bypasses write validation to represent corrupted external sheet data.
  db.seed("Customer", [
    {
      id: original.id,
      name: "破損データ",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ...invalid,
    },
  ]);
  expect(() => repository.find({})).toThrow();
});
