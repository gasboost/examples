import {
  RowLevelSecurity,
  allow,
  and,
  column,
  eq,
  exists,
  literal,
  or,
  outerColumn,
  principal,
} from "@gasboost/rls";
import { z } from "zod";
import { roles } from "./policy";
import { idSchema } from "./schemas/records";
import { customerTable, inquiryTable, inquiryEventTable } from "./tables";

// Server authentication/authorization supplies these values (Issue #4).
// Parsing a request against this schema does NOT authenticate its principal.
export const principalSchema = z.strictObject({
  userId: idSchema,
  role: z.enum([roles.admin, roles.staff]),
});
export type Principal = z.infer<typeof principalSchema>;

const isAdmin = eq(principal(principalSchema, "role"), literal(roles.admin));
const canManageInquiry = or(
  isAdmin,
  eq(column(inquiryTable, "assigneeId"), principal(principalSchema, "userId")),
);

// allow() assumes an authenticated business context. Issue #3 must attach
// this AST to SheetDB AND set/clear the server principal per request.
export const customerSecurity = new RowLevelSecurity({
  table: customerTable,
  select: { using: allow() },
  insert: { check: allow() },
  update: { using: allow(), check: allow() },
});
export const inquirySecurity = new RowLevelSecurity({
  table: inquiryTable,
  select: { using: allow() },
  insert: { check: allow() },
  update: { using: canManageInquiry, check: canManageInquiry },
});
export const inquiryEventSecurity = new RowLevelSecurity({
  table: inquiryEventTable,
  select: { using: allow() },
  insert: {
    check: and(
      eq(
        column(inquiryEventTable, "actorId"),
        principal(principalSchema, "userId"),
      ),
      exists(
        inquiryTable,
        and(
          eq(
            column(inquiryTable, "id"),
            outerColumn(inquiryEventTable, "inquiryId"),
          ),
          canManageInquiry,
        ),
      ),
    ),
  },
});

// Missing operations deny; auth library internals deliberately have no RLS.
export const rowLevelSecurity = [
  customerSecurity,
  inquirySecurity,
  inquiryEventSecurity,
] as const;
