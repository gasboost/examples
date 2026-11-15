import { z } from "zod";
import { customerFields } from "../../shared/schemas/customer";

export const listCustomersInput = z
  .object({
    keyword: z.string().trim().default(""),
    page: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
  })
  .strict();
export const createCustomerInput = customerFields.strict();
export const updateCustomerInput = customerFields
  .partial()
  .extend({ id: z.uuid() })
  .strict();
