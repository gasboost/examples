import { eq, literal, principal, RowLevelSecurity } from "@gasboost/rls";
import { z } from "zod";
import { customerTable } from "../../shared/tables";

// DI middleware derives these permissions from the authenticated user's policy.
// Both staff roles share every customer; deletion remains denied.
const identity = z.object({
  customerRead: z.boolean(),
  customerCreate: z.boolean(),
  customerUpdate: z.boolean(),
});
const read = eq(principal(identity, "customerRead"), literal(true));
const create = eq(principal(identity, "customerCreate"), literal(true));
const update = eq(principal(identity, "customerUpdate"), literal(true));
export const customerRls = new RowLevelSecurity({
  table: customerTable,
  select: { using: read },
  insert: { check: create },
  update: { using: update, check: update },
});
