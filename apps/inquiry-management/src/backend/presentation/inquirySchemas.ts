import { z } from "zod";
import { inquiryFields, inquiryRecord } from "../../shared/schemas/inquiry";

export const createInquiryInput = inquiryFields
  .extend({ assigneeId: z.string().min(1).optional() })
  .strict();
export const inquiryIdInput = z.object({ id: z.uuid() }).strict();
export const updateInquiryInput = inquiryFields
  .partial()
  .extend({ id: z.uuid(), version: z.number().int().positive() })
  .strict();
export const listInquiriesInput = z
  .object({
    keyword: z.string().trim().default(""),
    statuses: z.array(inquiryRecord.shape.status).default([]),
    assignee: z
      .discriminatedUnion("type", [
        z.object({ type: z.literal("all") }).strict(),
        z.object({ type: z.literal("me") }).strict(),
        z.object({ type: z.literal("unassigned") }).strict(),
        z
          .object({ type: z.literal("specified"), userId: z.string().min(1) })
          .strict(),
      ])
      .optional(),
    channel: inquiryFields.shape.channel.optional(),
    sortBy: z.enum(["receivedAt", "updatedAt"]).default("updatedAt"),
    direction: z.enum(["asc", "desc"]).default("desc"),
    page: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).default(1),
  })
  .strict();
