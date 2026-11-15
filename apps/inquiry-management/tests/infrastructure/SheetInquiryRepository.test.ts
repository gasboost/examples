import { afterEach, beforeEach, expect, test } from "vitest";
import { db } from "../../src/backend/lib/db";
import { container } from "../../src/backend/lib/di";
import { Inquiry } from "../../src/backend/domain/Inquiry";
import { sheetTables } from "../../src/backend/lib/sheets";
import { resetDatabase } from "../mocks/db";
import { principal, record, time, missingId } from "../mocks/inquiries";

beforeEach(() => {
  resetDatabase();
  principal();
});
afterEach(() => {
  db.setPrincipal({});
  resetDatabase();
});
test("saves and restores all attributes with the original UUID, dates and ORM version", () => {
  const repository = container.resolve("inquiryRepository");
  const inquiry = new Inquiry({ ...record, receivedAt: time, updatedAt: time });
  repository.save(inquiry);
  for (const table of sheetTables) table.cache.clear();
  expect(repository.find({ id: inquiry.id })).toEqual([inquiry]);
  expect(repository.find({ id: missingId })).toEqual([]);
  repository.save(
    inquiry.update(
      { subject: "変更" },
      { userId: "admin", isAdmin: true },
      new Date(time.getTime() + 1000),
    ),
  );
  for (const table of sheetTables) table.cache.clear();
  expect(repository.find({})[0]).toEqual({
    ...inquiry,
    subject: "変更",
    updatedAt: new Date(time.getTime() + 1000),
    version: 2,
  });
  expect(() => repository.save(inquiry)).toThrow("Optimistic lock");
});
test("restores optional unassigned state", () => {
  const repository = container.resolve("inquiryRepository");
  repository.save(
    new Inquiry({
      ...record,
      assigneeId: undefined,
      receivedAt: time,
      updatedAt: time,
    }),
  );
  for (const table of sheetTables) table.cache.clear();
  expect(repository.find({})[0].assigneeId).toBeUndefined();
});
test("persisted schema rejects malformed attributes", () => {
  expect(() =>
    container.resolve("inquiryRepository").save(
      new Inquiry({
        ...record,
        subject: "",
        receivedAt: time,
        updatedAt: time,
      }),
    ),
  ).toThrow();
});
