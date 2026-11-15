import { afterEach, beforeEach, expect, test, vi } from "vitest";
import app from "../../src/backend/main";
import { authorization } from "../../src/backend/lib/auth";
import { db } from "../../src/backend/lib/db";
import { container } from "../../src/backend/lib/di";
import { resetDatabase } from "../mocks/db";
import { authenticated } from "../mocks/auth";
import {
  principal,
  seedInquiries,
  details,
  record,
  inquiryId,
  missingId,
} from "../mocks/inquiries";

beforeEach(async () => {
  resetDatabase();
  db.setPrincipal({});
  await authorization.role.assign("admin", "管理者");
  await authorization.role.assign("staff", "一般スタッフ");
  await authorization.role.assign("other", "一般スタッフ");
  principal();
  seedInquiries();
  db.setPrincipal({});
});
afterEach(() => {
  vi.restoreAllMocks();
  db.setPrincipal({});
  resetDatabase();
  CacheService.getScriptCache().removeAll([
    "admin",
    "staff",
    "other",
    "outsider",
  ]);
});

test.each(["admin", "staff"])(
  "each RPC authenticates, authorizes and dispatches its own use case for %s",
  async (userId) => {
    const metadata = authenticated(userId);
    const create = vi.spyOn(container.resolve("createInquiry"), "execute");
    const created = JSON.parse(
      (await app.dispatch("createInquiry", details, metadata)).contents,
    );
    expect(create).toHaveBeenCalledExactlyOnceWith(details, {
      userId,
      isAdmin: userId === "admin",
    });
    expect(created).toMatchObject({
      ...details,
      createdBy: userId,
      status: "未対応",
      version: 1,
    });
    const list = vi.spyOn(container.resolve("listInquiries"), "execute");
    const listed = JSON.parse(
      (await app.dispatch("listInquiries", {}, metadata)).contents,
    );
    expect(list).toHaveBeenCalledExactlyOnceWith(
      {
        keyword: "",
        statuses: [],
        sortBy: "updatedAt",
        direction: "desc",
        page: 1,
      },
      { userId, isAdmin: userId === "admin" },
    );
    expect(listed.total).toBe(userId === "admin" ? 2 : 1);
    const detail = vi.spyOn(container.resolve("listInquiryDetail"), "execute");
    const result = JSON.parse(
      (await app.dispatch("listInquiryDetail", { id: inquiryId }, metadata))
        .contents,
    );
    expect(detail).toHaveBeenCalledExactlyOnceWith({ id: inquiryId });
    expect(result).toMatchObject({ ...record, customer: { name: "山田商店" } });
    const update = vi.spyOn(container.resolve("updateInquiry"), "execute");
    const input = { id: inquiryId, version: 1, subject: "変更" };
    expect(
      JSON.parse(
        (await app.dispatch("updateInquiry", input, metadata)).contents,
      ),
    ).toMatchObject({ ...input, version: 2 });
    expect(update).toHaveBeenCalledExactlyOnceWith(input, {
      userId,
      isAdmin: userId === "admin",
    });
    expect(db.principal).toEqual({});
  },
);

const calls = [
  ["createInquiry", "create", details],
  ["listInquiries", "read", {}],
  ["listInquiryDetail", "read", { id: inquiryId }],
  ["updateInquiry", "update", { id: inquiryId, version: 1, subject: "変更" }],
] as const;
test.each(calls)(
  "%s refuses missing authentication, missing role and denied operation permission",
  async (name, action, input) => {
    const execute = vi.spyOn(container.resolve(name), "execute");
    await expect(app.dispatch(name, input)).rejects.toThrow("UNAUTHORIZED");
    await expect(
      app.dispatch(name, input, authenticated("outsider")),
    ).rejects.toThrow("FORBIDDEN");
    await authorization.permission.deny("staff", `inquiry:${action}`);
    await expect(
      app.dispatch(name, input, authenticated("staff")),
    ).rejects.toThrow("FORBIDDEN");
    expect(execute).not.toHaveBeenCalled();
    expect(db.principal).toEqual({});
  },
);

test.each([
  ["createInquiry", {}],
  ["createInquiry", { ...details, subject: "　 " }],
  ["createInquiry", { ...details, subject: "a".repeat(201) }],
  ["createInquiry", { ...details, description: " " }],
  ["createInquiry", { ...details, customerId: "bad" }],
  ["createInquiry", { ...details, channel: "不明" }],
  ["createInquiry", { ...details, createdBy: "admin" }],
  ["createInquiry", { ...details, status: "完了" }],
  ["createInquiry", { ...details, receivedAt: "forged" }],
  ["listInquiries", { statuses: ["invalid"] }],
  ["listInquiries", { assignee: { type: "specified" } }],
  ["listInquiries", { page: 0 }],
  ["listInquiries", { page: 1.5 }],
  ["listInquiries", { sortBy: "subject" }],
  ["listInquiries", { direction: "invalid" }],
  ["listInquiries", { pageSize: 100 }],
  ["listInquiries", { channel: "invalid" }],
  ["listInquiryDetail", { id: "bad" }],
  ["updateInquiry", { id: inquiryId }],
  ["updateInquiry", { id: inquiryId, version: 0 }],
  ["updateInquiry", { id: inquiryId, version: 1, subject: " " }],
  ["updateInquiry", { id: inquiryId, version: 1, description: null }],
  ["updateInquiry", { id: inquiryId, version: 1, assigneeId: "staff" }],
  ["updateInquiry", { id: inquiryId, version: 1, status: "完了" }],
  ["updateInquiry", { id: inquiryId, version: 1, isAdmin: true }],
])("%s rejects malformed or forged input: %j", async (name, input) => {
  await expect(
    app.dispatch(name, input, authenticated("staff")),
  ).rejects.toThrow("INVALID_INPUT");
  expect(db.principal).toEqual({});
});

test("all staff can read and explicitly list other staff's and unassigned inquiries", async () => {
  const metadata = authenticated("other");
  expect(
    JSON.parse((await app.dispatch("listInquiries", {}, metadata)).contents)
      .total,
  ).toBe(0);
  for (const assignee of [
    { type: "all" },
    { type: "specified", userId: "staff" },
  ]) {
    expect(
      JSON.parse(
        (await app.dispatch("listInquiries", { assignee }, metadata)).contents,
      ).total,
    ).toBe(1);
  }
  expect(
    JSON.parse(
      (await app.dispatch("listInquiryDetail", { id: inquiryId }, metadata))
        .contents,
    ).id,
  ).toBe(inquiryId);
  await expect(
    app.dispatch(
      "updateInquiry",
      { id: inquiryId, version: 1, subject: "拒否" },
      metadata,
    ),
  ).rejects.toThrow("FORBIDDEN");
  expect(
    JSON.parse(
      (await app.dispatch("listInquiryDetail", { id: inquiryId }, metadata))
        .contents,
    ).subject,
  ).toBe(record.subject);
});
test("only admins can specify an assignee at creation; unassigned staff-created inquiries cannot be edited by staff", async () => {
  await expect(
    app.dispatch(
      "createInquiry",
      { ...details, assigneeId: "staff" },
      authenticated("staff"),
    ),
  ).rejects.toThrow("FORBIDDEN");
  const assigned = JSON.parse(
    (
      await app.dispatch(
        "createInquiry",
        { ...details, assigneeId: "staff" },
        authenticated("admin"),
      )
    ).contents,
  );
  expect(assigned.assigneeId).toBe("staff");
  const unassigned = JSON.parse(
    (await app.dispatch("createInquiry", details, authenticated("staff")))
      .contents,
  );
  await expect(
    app.dispatch(
      "updateInquiry",
      { id: unassigned.id, version: 1, subject: "拒否" },
      authenticated("staff"),
    ),
  ).rejects.toThrow("FORBIDDEN");
});
test("RPC exposes missing records, missing customers and stale versions as distinct errors", async () => {
  const metadata = authenticated("admin");
  await expect(
    app.dispatch(
      "createInquiry",
      { ...details, customerId: missingId },
      metadata,
    ),
  ).rejects.toThrow("NOT_FOUND");
  await expect(
    app.dispatch("listInquiryDetail", { id: missingId }, metadata),
  ).rejects.toThrow("NOT_FOUND");
  await expect(
    app.dispatch("updateInquiry", { id: missingId, version: 1 }, metadata),
  ).rejects.toThrow("NOT_FOUND");
  await expect(
    app.dispatch(
      "updateInquiry",
      { id: inquiryId, version: 1, customerId: missingId },
      metadata,
    ),
  ).rejects.toThrow("NOT_FOUND");
  await app.dispatch(
    "updateInquiry",
    { id: inquiryId, version: 1, description: "変更" },
    metadata,
  );
  await expect(
    app.dispatch(
      "updateInquiry",
      { id: inquiryId, version: 1, subject: "拒否" },
      metadata,
    ),
  ).rejects.toThrow("CONFLICT");
});
test("completed rows reject ordinary edits even for admin and assignee", async () => {
  resetDatabase();
  await authorization.role.assign("admin", "管理者");
  await authorization.role.assign("staff", "一般スタッフ");
  seedInquiries([{ ...record, status: "完了" }]);
  for (const userId of ["admin", "staff"])
    await expect(
      app.dispatch(
        "updateInquiry",
        { id: inquiryId, version: 1, subject: "拒否" },
        authenticated(userId),
      ),
    ).rejects.toThrow("INQUIRY_COMPLETED");
});
test("role revocation immediately removes the permission to use inquiry RPCs", async () => {
  const metadata = authenticated("admin");
  await app.dispatch("listInquiries", {}, metadata);
  await authorization.role.revoke("admin", "管理者");
  await expect(app.dispatch("listInquiries", {}, metadata)).rejects.toThrow(
    "FORBIDDEN",
  );
});
