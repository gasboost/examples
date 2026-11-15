import { expect, test } from "vitest";
import { Customer } from "../../src/backend/domain/Customer";

const original = new Customer({
  id: "11111111-1111-4111-8111-111111111111",
  name: "山田",
  email: "a@example.com",
  phone: "03",
  note: "備考",
  createdAt: new Date("2026-11-15T00:00:00.000Z"),
  updatedAt: new Date("2026-11-15T00:00:00.000Z"),
});
const now = new Date("2026-11-15T01:00:00.000Z");

test("Customer updates specified attributes and its update time while retaining identity and creation time", () => {
  const updated = original.update(
    { name: "佐藤", email: "sato@example.com", phone: "090", note: "変更" },
    now,
  );
  expect(updated).toBeInstanceOf(Customer);
  expect(updated).toEqual({
    id: original.id,
    name: "佐藤",
    email: "sato@example.com",
    phone: "090",
    note: "変更",
    createdAt: original.createdAt,
    updatedAt: now,
  });
  expect(original.name).toBe("山田");
  expect(original.updatedAt).toEqual(original.createdAt);
});

test("Customer retains unspecified attributes on partial changes", () => {
  const updated = original.update({ name: "佐藤", phone: undefined }, now);
  expect(updated).toEqual({ ...original, name: "佐藤", updatedAt: now });
});

test("Customer can clear optional attributes without altering the name or identity", () => {
  const updated = original.update({ email: "", phone: "", note: "" }, now);
  expect(updated).toEqual({
    ...original,
    email: "",
    phone: "",
    note: "",
    updatedAt: now,
  });
});
