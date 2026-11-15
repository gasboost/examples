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
  const saved: Customer[] = [];
  for (let index = 1; index <= 23; index++) {
    saved.push(
      repository.create({
        name: index === 23 ? "佐藤" : `山田${index}`,
        email: "a@example.com",
        phone: "090",
        note: "備考",
      }),
    );
  }
  const matching = saved
    .filter((customer) => customer.name.includes("山田"))
    .sort((a, b) => a.id.localeCompare(b.id));
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
    id: matching[20].id,
    name: matching[20].name,
    email: "a@example.com",
    phone: "090",
    note: "備考",
    createdAt: matching[20].createdAt.toISOString(),
    updatedAt: matching[20].updatedAt.toISOString(),
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
