import { afterEach, beforeEach, expect, test } from "vitest";
import { db } from "../../src/backend/lib/db";
import { resetDatabase } from "../mocks/db";
import {
  principal,
  seedInquiries,
  record,
  missingId,
} from "../mocks/inquiries";
beforeEach(() => {
  resetDatabase();
  principal();
  seedInquiries();
});
afterEach(() => {
  db.setPrincipal({});
  resetDatabase();
});
test.each([true, false])(
  "all inquiries can be read with permission, admin=%s",
  (isAdmin) => {
    principal("other", isAdmin);
    expect(db.table("Inquiry").find()).toHaveLength(1);
  },
);
test.each([
  {},
  { userId: "outsider", isAdmin: true },
  { userId: "staff", inquiryRead: true },
])("rejects unauthorized writes %j", (identity) => {
  db.setPrincipal(identity);
  expect(() =>
    db.table("Inquiry").create([{ ...record, id: missingId }]),
  ).toThrow();
  expect(() =>
    db.table("Inquiry").update([{ ...record, subject: "不正" }]),
  ).toThrow();
  expect(() => db.table("Inquiry").delete([record.id])).toThrow();
});
test("missing read permission hides inquiries", () => {
  db.setPrincipal({ userId: "staff" });
  expect(db.table("Inquiry").find()).toEqual([]);
});
test.each(["staff", "admin"])(
  "current assignee or admin can update: %s",
  (userId) => {
    principal(userId, userId === "admin");
    db.table("Inquiry").update([{ ...record, subject: "更新" }]);
    expect(db.table("Inquiry").find()[0]).toMatchObject({
      subject: "更新",
      version: 2,
    });
  },
);
test("non-assignee cannot update", () => {
  principal("other", false);
  expect(() =>
    db.table("Inquiry").update([{ ...record, subject: "不正" }]),
  ).toThrow();
});
test.each(["完了", "unassigned"])(
  "rejects ordinary edits of %s rows",
  (state) => {
    resetDatabase();
    db.seed("Inquiry", [
      {
        ...record,
        status: state === "完了" ? "完了" : "未対応",
        assigneeId: state === "unassigned" ? undefined : "staff",
      },
    ]);
    principal("staff", false);
    const row = db.table("Inquiry").find()[0];
    expect(() =>
      db.table("Inquiry").update([{ ...row, subject: "不正" }]),
    ).toThrow();
    if (state === "完了") {
      principal();
      expect(() =>
        db.table("Inquiry").update([{ ...row, subject: "不正" }]),
      ).toThrow();
    }
  },
);
test("staff inserts must be unassigned and attributed to the server principal", () => {
  principal("staff", false);
  expect(() =>
    db
      .table("Inquiry")
      .create([{ ...record, id: missingId, createdBy: "staff" }]),
  ).toThrow();
  expect(() =>
    db
      .table("Inquiry")
      .create([{ ...record, id: missingId, assigneeId: undefined }]),
  ).toThrow();
  db.table("Inquiry").create([
    { ...record, id: missingId, assigneeId: undefined, createdBy: "staff" },
  ]);
  expect(db.table("Inquiry").find()).toHaveLength(2);
});
