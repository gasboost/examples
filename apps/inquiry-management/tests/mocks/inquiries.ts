import type { z } from "zod";
import type { inquiryRecord } from "../../src/shared/schemas/inquiry";
import { db } from "../../src/backend/lib/db";
export const customerId = "11111111-1111-4111-8111-111111111111";
export const inquiryId = "22222222-2222-4222-8222-222222222222";
export const missingId = "99999999-9999-4999-8999-999999999999";
export const time = new Date("2026-11-15T00:00:00.000Z");
export const actor = { userId: "admin", isAdmin: true };
export const details = {
  subject: "商品相談",
  description: "在庫について",
  customerId,
  channel: "電話" as const,
};
export const record = {
  ...details,
  id: inquiryId,
  assigneeId: "staff",
  status: "未対応" as const,
  createdBy: "admin",
  receivedAt: time.toISOString(),
  updatedAt: time.toISOString(),
  version: 1,
};
export function principal(userId = "admin", isAdmin = true) {
  db.setPrincipal({
    userId,
    isAdmin,
    inquiryRead: true,
    inquiryCreate: true,
    inquiryUpdate: true,
    customerRead: true,
    customerCreate: true,
    customerUpdate: true,
  });
}
export function seedInquiries(
  rows: z.infer<typeof inquiryRecord>[] = [record],
) {
  db.seed("user", [
    { id: "admin", name: "管理者 太郎" },
    { id: "staff", name: "担当 花子" },
  ]);
  db.seed("Customer", [
    {
      id: customerId,
      name: "山田商店",
      email: "contact@example.com",
      createdAt: time.toISOString(),
      updatedAt: time.toISOString(),
    },
  ]);
  db.seed("Inquiry", rows);
}
