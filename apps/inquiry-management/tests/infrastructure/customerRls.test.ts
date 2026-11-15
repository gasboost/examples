import { afterEach, beforeEach, expect, test } from "vitest";
import { authorization } from "../../src/backend/lib/auth";
import { db } from "../../src/backend/lib/db";
import { resetDatabase } from "../mocks/db";

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "共有顧客",
  createdAt: "2026-11-15T00:00:00.000Z",
  updatedAt: "2026-11-15T00:00:00.000Z",
};
beforeEach(async () => {
  resetDatabase();
  db.setPrincipal({});
  await authorization.role.assign("admin", "管理者");
  await authorization.role.assign("staff", "一般スタッフ");
  db.setPrincipal({
    userId: "admin",
    customerRead: true,
    customerCreate: true,
    customerUpdate: true,
  });
  row.id = db.table("Customer").create([row])[0].id;
});
afterEach(() => {
  db.setPrincipal({});
  resetDatabase();
});

test.each(["admin", "staff"])(
  "RLS allows %s to read, create and update all customers but never delete",
  (userId) => {
    db.setPrincipal({
      userId,
      customerRead: true,
      customerCreate: true,
      customerUpdate: true,
    });
    expect(db.table("Customer").find()).toHaveLength(1);
    db.table("Customer").create([
      { ...row, id: "22222222-2222-4222-8222-222222222222" },
    ]);
    db.table("Customer").update([{ ...row, name: "更新" }]);
    expect(
      db
        .table("Customer")
        .find()
        .map((item) => item.name),
    ).toContain("更新");
    expect(() => db.table("Customer").delete([row.id])).toThrow();
  },
);

test.each([{}, { userId: "outsider" }, { userId: "outsider", role: "管理者" }])(
  "RLS rejects an unauthorized principal %j",
  (principal) => {
    db.setPrincipal(principal);
    expect(db.table("Customer").find()).toEqual([]);
    expect(() =>
      db
        .table("Customer")
        .create([{ ...row, id: "22222222-2222-4222-8222-222222222222" }]),
    ).toThrow();
    expect(() =>
      db.table("Customer").update([{ ...row, name: "不正更新" }]),
    ).toThrow();
    expect(() => db.table("Customer").delete([row.id])).toThrow();
    db.setPrincipal({
      userId: "admin",
      customerRead: true,
      customerCreate: true,
      customerUpdate: true,
    });
    expect(db.table("Customer").find()[0].name).toBe("共有顧客");
  },
);

test("read permission alone cannot insert or update", () => {
  db.setPrincipal({
    userId: "reader",
    customerRead: true,
    customerCreate: false,
    customerUpdate: false,
  });
  expect(db.table("Customer").find()).toHaveLength(1);
  expect(() =>
    db
      .table("Customer")
      .create([{ ...row, id: "22222222-2222-4222-8222-222222222222" }]),
  ).toThrow();
  expect(() =>
    db.table("Customer").update([{ ...row, name: "拒否" }]),
  ).toThrow();
});
