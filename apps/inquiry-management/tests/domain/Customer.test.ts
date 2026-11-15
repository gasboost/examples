import { expect, test } from "vitest";
import { Customer } from "../../src/backend/domain/Customer";

const id = "11111111-1111-4111-8111-111111111111";
const now = new Date("2026-11-15T00:00:00.000Z");

test("Customer trims the required name and accepts optional contact details", () => {
  const customer = Customer.create(
    {
      name: " 山田 花子 ",
      email: "hanako@example.com",
      phone: "03-1234-5678",
      note: "備考\n2行目",
    },
    id,
    now,
  );
  expect(customer.name).toBe("山田 花子");
  expect(customer.email).toBe("hanako@example.com");
  expect(customer.phone).toBe("03-1234-5678");
  expect(customer.note).toBe("備考\n2行目");
  expect(Customer.create({ name: "山田" }, id, now).name).toBe("山田");
});

test.each([
  { name: "" },
  { name: "　 " },
  { name: "山田", email: "invalid" },
  { name: "山田", phone: 123 },
  { name: "山田", note: false },
])("Customer rejects invalid details: %j", (details) => {
  expect(() => Customer.create(details as never, id, now)).toThrow();
});

test("updating preserves identity, creation date and omitted values, and supports clearing optional fields", () => {
  const original = Customer.create(
    { name: "山田", email: "a@example.com", phone: "03", note: "備考" },
    id,
    now,
  );
  const later = new Date("2026-11-15T01:00:00.000Z");
  const changed = original.update(
    { name: "佐藤", email: "", note: "", phone: undefined },
    later,
  );
  expect(changed.id).toBe(original.id);
  expect(changed.name).toBe("佐藤");
  expect(changed.email).toBe("");
  expect(changed.phone).toBe("03");
  expect(changed.note).toBe("");
  expect(changed.createdAt).toEqual(original.createdAt);
  expect(changed.updatedAt).toEqual(later);
  expect(original.name).toBe("山田");
  expect(original.updatedAt).toEqual(now);
  expect(() => original.update({ name: " " }, later)).toThrow();
});

test("Customer rejects invalid identity and instants", () => {
  expect(() => Customer.create({ name: "山田" }, "invalid-id", now)).toThrow();
  expect(() =>
    Customer.create({ name: "山田" }, id, new Date("invalid")),
  ).toThrow();
});
