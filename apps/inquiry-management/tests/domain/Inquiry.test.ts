import { expect, test } from "vitest";
import {
  Inquiry,
  InquiryCompleted,
  InquiryForbidden,
} from "../../src/backend/domain/Inquiry";
import { record, time } from "../mocks/inquiries";

const inquiry = new Inquiry({ ...record, receivedAt: time, updatedAt: time });
test.each([
  { userId: "admin", isAdmin: true },
  { userId: "staff", isAdmin: false },
])(
  "authorized editor changes details and preserves other attributes: %j",
  (actor) => {
    const now = new Date(time.getTime() + 1000);
    const updated = inquiry.update({ subject: "変更" }, actor, now);
    expect(updated).toEqual({ ...inquiry, subject: "変更", updatedAt: now });
    expect(inquiry.subject).toBe(record.subject);
  },
);
test.each(["other", "old-staff"])("rejects non-assignees %s", (userId) => {
  expect(() => inquiry.update({}, { userId, isAdmin: false }, time)).toThrow(
    InquiryForbidden,
  );
});
test("unassigned inquiry cannot be edited by staff", () => {
  expect(() =>
    new Inquiry({ ...inquiry, assigneeId: undefined }).update(
      {},
      { userId: "staff", isAdmin: false },
      time,
    ),
  ).toThrow(InquiryForbidden);
});
test.each([
  { userId: "admin", isAdmin: true },
  { userId: "staff", isAdmin: false },
])("completed inquiry cannot be edited: %j", (actor) => {
  expect(() =>
    new Inquiry({ ...inquiry, status: "完了" }).update({}, actor, time),
  ).toThrow(InquiryCompleted);
});
test("in-progress inquiry permits normal edits", () => {
  expect(
    new Inquiry({ ...inquiry, status: "対応中" }).update(
      { description: "追記" },
      { userId: "staff", isAdmin: false },
      time,
    ).description,
  ).toBe("追記");
});
