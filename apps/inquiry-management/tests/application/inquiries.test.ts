import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { db } from "../../src/backend/lib/db";
import { container } from "../../src/backend/lib/di";
import { Inquiry } from "../../src/backend/domain/Inquiry";
import { sheetGateway } from "../../src/backend/lib/sheets";
import { resetDatabase } from "../mocks/db";
import {
  principal,
  seedInquiries,
  details,
  record,
  inquiryId,
  missingId,
  actor,
  time,
} from "../mocks/inquiries";
beforeEach(() => {
  resetDatabase();
  principal();
  seedInquiries();
  vi.useFakeTimers();
  vi.setSystemTime(time.getTime() + 1000);
});
afterEach(() => {
  db.setPrincipal({});
  resetDatabase();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
test("CreateInquiry determines identity, timestamps, initial status and version on the server", () => {
  principal("staff", false);
  const result = container
    .resolve("createInquiry")
    .execute(details, { userId: "staff", isAdmin: false });
  expect(result).not.toBeInstanceOf(Inquiry);
  expect(result).toMatchObject({
    ...details,
    status: "未対応",
    createdBy: "staff",
    receivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  });
  expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(
    container.resolve("inquiryRepository").find({ id: result.id })[0],
  ).toMatchObject({ ...details, assigneeId: undefined });
});
test("CreateInquiry accepts admin assignment, rejects staff assignment and missing customer", () => {
  expect(
    container
      .resolve("createInquiry")
      .execute({ ...details, assigneeId: "staff" }, actor).assigneeId,
  ).toBe("staff");
  expect(() =>
    container
      .resolve("createInquiry")
      .execute(
        { ...details, assigneeId: "staff" },
        { userId: "staff", isAdmin: false },
      ),
  ).toThrow();
  expect(() =>
    container
      .resolve("createInquiry")
      .execute({ ...details, customerId: missingId }, actor),
  ).toThrow();
  expect(container.resolve("inquiryRepository").find({})).toHaveLength(2);
});
test("ListInquiryDetail reads any inquiry and joins customer and safe user references", async () => {
  principal("other", false);
  expect(
    await container.resolve("listInquiryDetail").execute({ id: inquiryId }),
  ).toMatchObject({
    id: inquiryId,
    customer: { name: "山田商店", email: "contact@example.com" },
    createdBy: "admin",
    assigneeId: "staff",
    creator: { id: "admin", name: "管理者 太郎" },
    assignee: { id: "staff", name: "担当 花子" },
  });
  await expect(
    container.resolve("listInquiryDetail").execute({ id: missingId }),
  ).rejects.toThrow();
});
test("UpdateInquiry persists domain edits, preserves attributes and returns ORM's incremented version", () => {
  principal("staff", false);
  const result = container
    .resolve("updateInquiry")
    .execute(
      { id: inquiryId, version: 1, subject: "変更" },
      { userId: "staff", isAdmin: false },
    );
  expect(result).toEqual({
    ...record,
    subject: "変更",
    updatedAt: new Date().toISOString(),
    version: 2,
  });
  expect(
    container.resolve("inquiryRepository").find({ id: inquiryId })[0],
  ).toMatchObject({ subject: "変更", version: 2 });
  expect(() =>
    container
      .resolve("updateInquiry")
      .execute({ id: inquiryId, version: 1, subject: "上書き" }, actor),
  ).toThrow();
});
test("UpdateInquiry rejects missing records and customers without modifying data", () => {
  for (const input of [
    { id: missingId, version: 1 },
    { id: inquiryId, version: 1, customerId: missingId },
  ])
    expect(() =>
      container.resolve("updateInquiry").execute(input, actor),
    ).toThrow();
  expect(container.resolve("inquiryRepository").find({})[0].subject).toBe(
    record.subject,
  );
});
test("UpdateInquiry checks latest assignee and completion before persisting", () => {
  principal("other", false);
  expect(() =>
    container
      .resolve("updateInquiry")
      .execute(
        { id: inquiryId, version: 1, subject: "拒否" },
        { userId: "other", isAdmin: false },
      ),
  ).toThrow();
  for (const attributes of [
    { assigneeId: undefined },
    { status: "完了" as const },
  ]) {
    resetDatabase();
    seedInquiries([{ ...record, ...attributes }]);
    expect(() =>
      container
        .resolve("updateInquiry")
        .execute(
          { id: inquiryId, version: 1 },
          { userId: "staff", isAdmin: false },
        ),
    ).toThrow();
  }
});
test("UpdateInquiry retains persisted state after an external write failure", () => {
  vi.spyOn(sheetGateway, "update").mockImplementationOnce(() => {
    throw new Error("write failed");
  });
  expect(() =>
    container
      .resolve("updateInquiry")
      .execute({ id: inquiryId, version: 1, subject: "変更" }, actor),
  ).toThrow("write failed");
  expect(container.resolve("inquiryRepository").find({})[0]).toMatchObject({
    subject: record.subject,
    version: 1,
    updatedAt: time,
  });
});
const query = {
  keyword: "",
  statuses: [],
  sortBy: "updatedAt" as const,
  direction: "desc" as const,
  page: 1,
};
test("ListInquiries defaults by role and supports every assignee condition", () => {
  const useCase = container.resolve("listInquiries");
  expect(useCase.execute(query, actor).total).toBe(1);
  expect(
    useCase.execute(query, { userId: "other", isAdmin: false }).total,
  ).toBe(0);
  expect(
    useCase.execute(query, { userId: "staff", isAdmin: false }).total,
  ).toBe(1);
  for (const assignee of [
    { type: "all" as const },
    { type: "specified" as const, userId: "staff" },
  ])
    expect(
      useCase.execute(
        { ...query, assignee },
        { userId: "other", isAdmin: false },
      ).total,
    ).toBe(1);
  expect(
    useCase.execute({ ...query, assignee: { type: "unassigned" } }, actor)
      .total,
  ).toBe(0);
});
test.each(["商品", "在庫", "山田", "不存在"])(
  "ListInquiries matches subject, description and customer substrings: %s",
  (keyword) => {
    expect(
      container.resolve("listInquiries").execute({ ...query, keyword }, actor)
        .total,
    ).toBe(keyword === "不存在" ? 0 : 1);
  },
);
test("ListInquiries computes filtered totals, status counts, stable sorting and 20-item pages", () => {
  resetDatabase();
  const rows = Array.from({ length: 45 }, (_, i) => ({
    ...record,
    id: `22222222-2222-4222-8222-${String(i).padStart(12, "0")}`,
    status: (["未対応", "対応中", "完了"] as const)[i % 3],
    channel: i % 2 ? ("メール" as const) : ("電話" as const),
    assigneeId: i % 2 ? undefined : "staff",
    updatedAt: new Date(time.getTime() + i * 1000).toISOString(),
    receivedAt: new Date(time.getTime() + (44 - i) * 1000).toISOString(),
  }));
  seedInquiries(rows);
  const useCase = container.resolve("listInquiries");
  const all = useCase.execute(query, actor);
  expect(all).toMatchObject({
    total: 45,
    pageSize: 20,
    totalPages: 3,
    statusCounts: { 未対応: 15, 対応中: 15, 完了: 15 },
  });
  expect(all.inquiries).toHaveLength(20);
  expect(all.inquiries[0].id).toBe(rows[44].id);
  expect(useCase.execute({ ...query, page: 3 }, actor).inquiries).toHaveLength(
    5,
  );
  expect(useCase.execute({ ...query, page: 4 }, actor).inquiries).toEqual([]);
  for (const sortBy of ["receivedAt", "updatedAt"] as const)
    for (const direction of ["asc", "desc"] as const) {
      const result = useCase.execute({ ...query, sortBy, direction }, actor);
      const expected =
        sortBy === "updatedAt"
          ? direction === "asc"
            ? rows[0]
            : rows[44]
          : direction === "asc"
            ? rows[44]
            : rows[0];
      expect(result.inquiries[0].id).toBe(expected.id);
    }
  const filtered = useCase.execute(
    {
      ...query,
      statuses: ["未対応", "完了"],
      channel: "メール",
      assignee: { type: "unassigned" },
    },
    actor,
  );
  expect(filtered.total).toBe(14);
  expect(filtered.statusCounts).toEqual({ 未対応: 7, 対応中: 0, 完了: 7 });
});
