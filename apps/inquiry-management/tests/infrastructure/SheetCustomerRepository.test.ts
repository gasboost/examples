import { afterEach, beforeEach, expect, test } from "vitest";
import { authorization } from "../../src/backend/lib/auth";
import { db } from "../../src/backend/lib/db";
import { Customer } from "../../src/backend/domain/Customer";
import { SheetCustomerRepository } from "../../src/backend/infrastructure/SheetCustomerRepository";
import { resetDatabase } from "../mocks/db";

const repository = new SheetCustomerRepository(db);
const id = "11111111-1111-4111-8111-111111111111";
const now = "2026-11-15T00:00:00.000Z";
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
});

test("real SheetORM round-trips a Customer and updates every field", () => {
  const original = Customer.create(
    {
      name: "山田",
      email: "yamada@example.com",
      phone: "03-1234",
      note: "改行\n備考",
    },
    id,
    now,
  );
  repository.save(original);
  expect(repository.find(id)).toEqual(original);
  const updated = original.update(
    { name: "佐藤", email: "", phone: "", note: "新しい備考" },
    "2026-11-15T01:00:00.000Z",
  );
  repository.transaction(() => repository.save(updated));
  expect(new SheetCustomerRepository(db).find(id)).toEqual(updated);
  expect(repository.find("22222222-2222-4222-8222-222222222222")).toBeNull();
});

test("search and paging keep totals and return empty results", () => {
  for (let index = 1; index <= 23; index++)
    repository.save(
      Customer.create(
        { name: index === 23 ? "佐藤" : `山田${index}` },
        `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
        now,
      ),
    );
  expect(repository.list("山田", 1, 20).customers).toHaveLength(20);
  expect(repository.list("山田", 2, 20).customers).toHaveLength(2);
  expect(repository.list("山田", 2, 20).total).toBe(22);
  expect(repository.list("山田", 3, 20)).toEqual({ customers: [], total: 22 });
  expect(repository.list("存在しない", 1, 20)).toEqual({
    customers: [],
    total: 0,
  });
});
