import { z } from "zod";

export const idSchema = z.uuid();
// Persisted and RPC timestamps use the same UTC ISO 8601 representation.
export const timestampSchema = z.iso.datetime();
export const versionSchema = z.int().nonnegative();
export const channelSchema = z.enum(["電話", "メール", "来店", "その他"]);
export const statusSchema = z.enum(["未対応", "対応中", "完了"]);

export const customerFieldsSchema = z.object({
  name: z.string().trim().min(1),
  email: z.email().optional(),
  phone: z.string().optional(),
  note: z.string().optional(),
});
export const customerSchema = customerFieldsSchema.extend({
  id: idSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const inquiryFieldsSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  customerId: idSchema,
  channel: channelSchema,
});
export const inquirySchema = inquiryFieldsSchema.extend({
  id: idSchema,
  assigneeId: idSchema.nullable(),
  status: statusSchema,
  createdBy: idSchema,
  receivedAt: timestampSchema,
  updatedAt: timestampSchema,
  version: versionSchema,
});

export const inquiryEventPayloadSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("comment"),
    body: z.string().trim().min(1),
  }),
  z.strictObject({
    type: z.literal("statusChanged"),
    from: statusSchema,
    to: statusSchema,
  }),
  z.strictObject({
    type: z.literal("assigneeChanged"),
    from: idSchema.nullable(),
    to: idSchema.nullable(),
  }),
]);
// Keep a ZodObject for SheetORM columns; the payload discriminator also makes
// each payload independently parseable and narrows its TypeScript union.
export const inquiryEventSchema = z
  .object({
    id: idSchema,
    inquiryId: idSchema,
    type: z.enum(["comment", "statusChanged", "assigneeChanged"]),
    actorId: idSchema,
    createdAt: timestampSchema,
    payload: inquiryEventPayloadSchema,
  })
  .refine((event) => event.type === event.payload.type, {
    path: ["payload", "type"],
    message: "Event and payload types must match",
  });

export type Customer = z.infer<typeof customerSchema>;
export type Inquiry = z.infer<typeof inquirySchema>;
export type InquiryEvent = z.infer<typeof inquiryEventSchema>;
