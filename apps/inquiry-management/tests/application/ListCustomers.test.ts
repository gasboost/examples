import { afterEach, beforeEach, expect, test } from "vitest";
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
});
afterEach(() => {
  db.setPrincipal({});
  resetDatabase();
});

test("ListCustomers searches and pages real persisted customers and returns result values", () => {
  const repository = container.resolve("customerRepository");
  const now = new Date("2026-11-15T00:00:00.000Z");
  for (let index = 1; index <= 23; index++)
    repository.save(
      Customer.create(
        {
          name: index === 23 ? "佐藤" : `山田${index}`,
          email: "a@example.com",
          phone: "090",
          note: "備考",
        },
        `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
        now,
      ),
    );
  const first = container
    .resolve("listCustomers")
    .execute({ keyword: "山田", page: 1, pageSize: 20 });
  const second = container
    .resolve("listCustomers")
    .execute({ keyword: "山田", page: 2, pageSize: 20 });
  expect(first.customers).toHaveLength(20);
  expect(second).toMatchObject({
    total: 22,
    page: 2,
    pageSize: 20,
    totalPages: 2,
  });
  expect(second.customers).toHaveLength(2);
  expect(second.customers[0]).not.toBeInstanceOf(Customer);
  expect(second.customers[0]).toEqual({
    id: "11111111-1111-4111-8111-000000000021",
    name: "山田21",
    email: "a@example.com",
    phone: "090",
    note: "備考",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  expect(first.customers.map((customer) => customer.id)).not.toContain(
    second.customers[0].id,
  );
});

test("ListCustomers returns an empty result with paging information for no matches", () => {
  expect(
    container
      .resolve("listCustomers")
      .execute({ keyword: "不在", page: 1, pageSize: 20 }),
  ).toEqual({ customers: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
});
