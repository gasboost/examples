import type {
  Customer,
  Inquiry,
  InquiryEvent,
} from "../../src/shared/schemas/records";

export const ids = {
  admin: "00000000-0000-4000-8000-000000000001",
  staff: "00000000-0000-4000-8000-000000000002",
  other: "00000000-0000-4000-8000-000000000003",
  customer: "00000000-0000-4000-8000-000000000004",
  inquiry: "00000000-0000-4000-8000-000000000005",
  event: "00000000-0000-4000-8000-000000000006",
  missing: "00000000-0000-4000-8000-000000000007",
};
const now = "2026-11-15T00:00:00.000Z";
export const customer: Customer = {
  id: ids.customer,
  name: "サンプル顧客",
  createdAt: now,
  updatedAt: now,
};
export const inquiry: Inquiry = {
  id: ids.inquiry,
  subject: "見積もりの相談",
  description: "製品の見積もりをお願いします。",
  customerId: ids.customer,
  assigneeId: ids.staff,
  channel: "電話",
  status: "未対応",
  createdBy: ids.admin,
  receivedAt: now,
  updatedAt: now,
  version: 0,
};
export const event: InquiryEvent = {
  id: ids.event,
  inquiryId: ids.inquiry,
  actorId: ids.admin,
  createdAt: now,
  type: "comment",
  payload: { type: "comment", body: "確認します。" },
};
