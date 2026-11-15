import { z } from "zod";

export const inquiryFields = z.object({
  subject: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  customerId: z.uuid(),
  channel: z.enum(["電話", "メール", "来店", "その他"]),
});
export const inquiryRecord = inquiryFields.extend({
  id: z.uuid(),
  assigneeId: z.string().min(1).optional(),
  status: z.enum(["未対応", "対応中", "完了"]),
  createdBy: z.string().min(1),
  receivedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int().positive(),
});
