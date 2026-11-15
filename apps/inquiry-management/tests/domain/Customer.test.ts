import { expect, test } from "vitest";
import { Customer } from "../../src/backend/domain/Customer";

const id = "11111111-1111-4111-8111-111111111111";
const now = "2026-11-15T00:00:00.000Z";

test("Customer keeps optional fields and trims the required name", () => {
  expect(
    Customer.create(
      {
        name: " 山田 花子 ",
        email: "hanako@example.com",
        phone: "03-1234-5678",
        note: "備考\n2行目",
      },
      id,
      now,
    ).toRecord(),
  ).toEqual({
    id,
    name: "山田 花子",
    email: "hanako@example.com",
    phone: "03-1234-5678",
    note: "備考\n2行目",
    createdAt: now,
    updatedAt: now,
  });
  expect(Customer.create({ name: "山田" }, id, now).data.name).toBe("山田");
});

test.each([
  { name: "" },
  { name: "　 " },
  { name: "山田", email: "invalid" },
  { name: "山田", phone: 123 },
  { name: "山田", note: false },
])("Customer rejects invalid data: %j", (fields) => {
  // Deliberately exercise the runtime boundary with untrusted data.
  expect(() => Customer.create(fields as never, id, now)).toThrow();
});

test("updating preserves identity, creation date and omitted values, and supports clearing optional fields", () => {
  const original = Customer.create(
    { name: "山田", email: "a@example.com", phone: "03", note: "備考" },
    id,
    now,
  );
  const changed = original.update(
    { name: "佐藤", email: "", note: "", phone: undefined },
    "2026-11-15T01:00:00.000Z",
  );
  expect(changed.toRecord()).toEqual({
    id,
    name: "佐藤",
    email: "",
    phone: "03",
    note: "",
    createdAt: now,
    updatedAt: "2026-11-15T01:00:00.000Z",
  });
  expect(original.data.name).toBe("山田");
  expect(() => original.update({ name: " " }, now)).toThrow();
});
