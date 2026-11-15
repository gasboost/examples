import { z } from "zod";
import {
  channelSchema,
  customerFieldsSchema,
  customerSchema,
  idSchema,
  inquiryEventSchema,
  inquiryFieldsSchema,
  inquirySchema,
  statusSchema,
  versionSchema,
} from "./records";

export const PAGE_SIZE = 20;
const pageSchema = z.int().min(1).default(1);
const keywordSchema = z.string().trim().default("");

export const createCustomerInputSchema = customerFieldsSchema.strict();
// Edits submit the full set of editable fields, including optional values.
export const updateCustomerInputSchema = customerFieldsSchema
  .extend({ id: idSchema })
  .strict();
export const searchCustomersInputSchema = z.strictObject({
  keyword: keywordSchema,
  page: pageSchema,
  pageSize: z.literal(PAGE_SIZE).default(PAGE_SIZE),
});
export const createCustomerOutputSchema = customerSchema;
export const updateCustomerOutputSchema = customerSchema;
export const searchCustomersOutputSchema = z.object({
  items: z.array(customerSchema).max(PAGE_SIZE),
  total: z.int().nonnegative(),
  page: z.int().min(1),
  pageSize: z.literal(PAGE_SIZE),
});

// Initial assignee selection still requires the admin operation permission.
// Status, receivedAt, creator, version and IDs are generated on the server.
export const createInquiryInputSchema = inquiryFieldsSchema
  .extend({ assigneeId: idSchema.nullable().optional() })
  .strict();
export const updateInquiryInputSchema = inquiryFieldsSchema
  .extend({ id: idSchema, version: versionSchema })
  .strict();
export const assigneeFilterSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("all") }),
  z.strictObject({ type: z.literal("me") }),
  z.strictObject({ type: z.literal("staff"), userId: idSchema }),
  z.strictObject({ type: z.literal("unassigned") }),
]);
// The server/UI selects the role-dependent assignee default. "me" is resolved
// from the authenticated server context, never from a client-supplied userId.
export const searchInquiriesInputSchema = z.strictObject({
  statuses: z.array(statusSchema).default([]),
  assignee: assigneeFilterSchema.optional(),
  channel: channelSchema.optional(),
  keyword: keywordSchema,
  page: pageSchema,
  pageSize: z.literal(PAGE_SIZE).default(PAGE_SIZE),
  sortBy: z.enum(["receivedAt", "updatedAt"]).default("updatedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});
export const getInquiryInputSchema = z.strictObject({ id: idSchema });
export const createInquiryOutputSchema = inquirySchema;
export const updateInquiryOutputSchema = inquirySchema;
export const searchInquiriesOutputSchema = z.object({
  items: z.array(inquirySchema).max(PAGE_SIZE),
  total: z.int().nonnegative(),
  page: z.int().min(1),
  pageSize: z.literal(PAGE_SIZE),
  statusCounts: z.object({
    未対応: z.int().nonnegative(),
    対応中: z.int().nonnegative(),
    完了: z.int().nonnegative(),
  }),
});
export const getInquiryOutputSchema = z.object({
  inquiry: inquirySchema,
  customer: customerSchema,
  events: z.array(inquiryEventSchema),
});

const inquiryMutationFields = { inquiryId: idSchema, version: versionSchema };
export const addCommentInputSchema = z.strictObject({
  ...inquiryMutationFields,
  body: z.string().trim().min(1),
});
export const changeStatusInputSchema = z.strictObject({
  ...inquiryMutationFields,
  status: statusSchema,
});
export const changeAssigneeInputSchema = z.strictObject({
  ...inquiryMutationFields,
  assigneeId: idSchema.nullable(),
});
// Version increment rules and atomic inquiry/event writes belong to UseCases.
export const addCommentOutputSchema = z.object({
  inquiry: inquirySchema,
  event: inquiryEventSchema.refine((event) => event.type === "comment"),
});
export const changeStatusOutputSchema = z.object({
  inquiry: inquirySchema,
  event: inquiryEventSchema.refine((event) => event.type === "statusChanged"),
});
export const changeAssigneeOutputSchema = z.object({
  inquiry: inquirySchema,
  event: inquiryEventSchema.refine((event) => event.type === "assigneeChanged"),
});
