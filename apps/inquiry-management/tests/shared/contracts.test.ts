import { describe, expect, it } from "vitest";
import * as contracts from "../../src/shared/schemas/contracts";
import {
  customerSchema,
  inquirySchema,
  inquiryEventSchema,
  inquiryEventPayloadSchema,
} from "../../src/shared/schemas/records";
import { customer, event, ids, inquiry } from "./fixtures";

const inquiryInput = {
  subject: inquiry.subject,
  description: inquiry.description,
  customerId: ids.customer,
  channel: inquiry.channel,
};

describe("shared input/output contracts", () => {
  it("separates user-editable fields from server generated records", () => {
    expect(
      contracts.createCustomerInputSchema.parse({ name: " 顧客 " }),
    ).toEqual({ name: "顧客" });
    expect(contracts.createInquiryInputSchema.parse(inquiryInput)).toEqual(
      inquiryInput,
    );
    expect(customerSchema.parse(customer)).toEqual(customer);
    expect(inquirySchema.parse(inquiry)).toEqual(inquiry);
    for (const key of [
      "id",
      "actorId",
      "createdBy",
      "userId",
      "role",
      "version",
      "receivedAt",
      "updatedAt",
      "status",
    ]) {
      expect(
        contracts.createInquiryInputSchema.safeParse({
          ...inquiryInput,
          [key]: "forged",
        }).success,
      ).toBe(false);
    }
    expect(
      contracts.createCustomerInputSchema.safeParse({ ...customer }).success,
    ).toBe(false);
    expect(
      contracts.updateInquiryInputSchema.safeParse({
        ...inquiryInput,
        id: ids.inquiry,
        version: 0,
        assigneeId: ids.other,
      }).success,
    ).toBe(false);
  });

  it("validates required content, UUIDs, enums, dates and subject boundaries", () => {
    expect(
      contracts.createCustomerInputSchema.safeParse({ name: " " }).success,
    ).toBe(false);
    expect(
      contracts.createCustomerInputSchema.safeParse({
        name: "顧客",
        email: "bad",
      }).success,
    ).toBe(false);
    expect(
      contracts.createCustomerInputSchema.safeParse({
        name: "顧客",
        email: "customer@example.com",
        phone: "03-0000-0000",
        note: "備考",
      }).success,
    ).toBe(true);
    for (const patch of [
      { subject: " " },
      { subject: "あ".repeat(201) },
      { description: " " },
      { customerId: "invalid" },
      { channel: "fax" },
    ]) {
      expect(
        contracts.createInquiryInputSchema.safeParse({
          ...inquiryInput,
          ...patch,
        }).success,
      ).toBe(false);
    }
    expect(
      contracts.createInquiryInputSchema.safeParse({
        ...inquiryInput,
        subject: "あ".repeat(200),
        assigneeId: null,
      }).success,
    ).toBe(true);
    expect(
      inquirySchema.safeParse({ ...inquiry, receivedAt: "yesterday" }).success,
    ).toBe(false);
  });

  it.each([
    [contracts.updateInquiryInputSchema, { ...inquiryInput, id: ids.inquiry }],
    [contracts.addCommentInputSchema, { inquiryId: ids.inquiry, body: "確認" }],
    [
      contracts.changeStatusInputSchema,
      { inquiryId: ids.inquiry, status: "対応中" },
    ],
    [
      contracts.changeAssigneeInputSchema,
      { inquiryId: ids.inquiry, assigneeId: null },
    ],
  ])(
    "requires a nonnegative integer version for inquiry mutations",
    (schema, input) => {
      for (const version of [undefined, -1, 1.5, "1"]) {
        expect(schema.safeParse({ ...input, version }).success).toBe(false);
      }
      expect(schema.safeParse({ ...input, version: 0 }).success).toBe(true);
      expect(
        schema.safeParse({ ...input, version: 2, actorId: ids.admin }).success,
      ).toBe(false);
    },
  );

  it("expresses multiple statuses, all assignee filters, channels and stable paging/sort defaults", () => {
    const defaults = contracts.searchInquiriesInputSchema.parse({});
    expect(defaults).toEqual({
      statuses: [],
      keyword: "",
      page: 1,
      pageSize: 20,
      sortBy: "updatedAt",
      sortDirection: "desc",
    });
    for (const assignee of [
      { type: "all" },
      { type: "me" },
      { type: "unassigned" },
      { type: "staff", userId: ids.staff },
    ]) {
      expect(
        contracts.searchInquiriesInputSchema.parse({
          statuses: ["未対応", "対応中"],
          assignee,
          channel: "メール",
          keyword: " 製品 ",
          page: 2,
          sortBy: "receivedAt",
          sortDirection: "asc",
        }).assignee,
      ).toEqual(assignee);
    }
    for (const patch of [
      { page: 0 },
      { page: 1.5 },
      { pageSize: 50 },
      { statuses: ["unknown"] },
      { assignee: { type: "staff" } },
      { assignee: { type: "me", userId: ids.other } },
      { sortBy: "subject" },
    ]) {
      expect(
        contracts.searchInquiriesInputSchema.safeParse(patch).success,
      ).toBe(false);
    }
    expect(
      contracts.searchCustomersInputSchema.parse({ keyword: " 顧客 " }),
    ).toEqual({ keyword: "顧客", page: 1, pageSize: 20 });
  });

  it("discriminates and validates all event payloads including assignment and release", () => {
    for (const payload of [
      { type: "comment", body: "メモ" },
      { type: "statusChanged", from: "未対応", to: "対応中" },
      { type: "assigneeChanged", from: null, to: ids.staff },
      { type: "assigneeChanged", from: ids.staff, to: null },
    ]) {
      expect(
        inquiryEventSchema.safeParse({ ...event, type: payload.type, payload })
          .success,
      ).toBe(true);
    }
    for (const payload of [
      { type: "comment", body: " " },
      { type: "comment", from: "未対応", to: "完了" },
      { type: "statusChanged", from: "unknown", to: "完了" },
      { type: "assigneeChanged", from: ids.staff },
    ]) {
      expect(inquiryEventPayloadSchema.safeParse(payload).success).toBe(false);
    }
    expect(
      inquiryEventSchema.safeParse({ ...event, type: "statusChanged" }).success,
    ).toBe(false);
  });

  it("parses customer and inquiry outputs, details and mutation results", () => {
    expect(contracts.createCustomerOutputSchema.parse(customer)).toEqual(
      customer,
    );
    expect(
      contracts.updateCustomerInputSchema.parse({
        id: ids.customer,
        name: "変更",
      }),
    ).toEqual({ id: ids.customer, name: "変更" });
    expect(contracts.updateCustomerOutputSchema.parse(customer)).toEqual(
      customer,
    );
    expect(
      contracts.searchCustomersOutputSchema.parse({
        items: [customer],
        total: 1,
        page: 1,
        pageSize: 20,
      }).items,
    ).toEqual([customer]);
    expect(contracts.createInquiryOutputSchema.parse(inquiry)).toEqual(inquiry);
    expect(contracts.updateInquiryOutputSchema.parse(inquiry)).toEqual(inquiry);
    expect(contracts.getInquiryInputSchema.parse({ id: ids.inquiry })).toEqual({
      id: ids.inquiry,
    });
    expect(
      contracts.getInquiryOutputSchema.parse({
        inquiry,
        customer,
        events: [event],
      }).events,
    ).toEqual([event]);
    const result = { inquiry, event };
    expect(contracts.addCommentOutputSchema.parse(result)).toEqual(result);
    const statusResult = {
      inquiry,
      event: {
        ...event,
        type: "statusChanged",
        payload: { type: "statusChanged", from: "未対応", to: "対応中" },
      },
    };
    expect(contracts.changeStatusOutputSchema.parse(statusResult)).toEqual(
      statusResult,
    );
    const assigneeResult = {
      inquiry,
      event: {
        ...event,
        type: "assigneeChanged",
        payload: { type: "assigneeChanged", from: null, to: ids.staff },
      },
    };
    expect(contracts.changeAssigneeOutputSchema.parse(assigneeResult)).toEqual(
      assigneeResult,
    );
    expect(contracts.changeStatusOutputSchema.safeParse(result).success).toBe(
      false,
    );
    expect(contracts.changeAssigneeOutputSchema.safeParse(result).success).toBe(
      false,
    );
    const page = {
      items: [inquiry],
      total: 1,
      page: 1,
      pageSize: 20,
      statusCounts: { 未対応: 1, 対応中: 0, 完了: 0 },
    };
    expect(contracts.searchInquiriesOutputSchema.parse(page)).toEqual(page);
    expect(
      contracts.searchInquiriesOutputSchema.safeParse({
        ...page,
        items: Array.from({ length: 21 }, () => inquiry),
      }).success,
    ).toBe(false);
  });
});
