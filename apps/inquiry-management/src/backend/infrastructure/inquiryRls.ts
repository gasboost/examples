import {
  and,
  or,
  eq,
  column,
  literal,
  principal,
  RowLevelSecurity,
} from "@gasboost/rls";
import { z } from "zod";
import { inquiryTable } from "../../shared/tables";

const identity = z.object({
  userId: z.string(),
  inquiryRead: z.boolean(),
  inquiryCreate: z.boolean(),
  inquiryUpdate: z.boolean(),
  isAdmin: z.boolean(),
});
const admin = eq(principal(identity, "isAdmin"), literal(true));
const editable = and(
  eq(principal(identity, "inquiryUpdate"), literal(true)),
  or(
    admin,
    eq(column(inquiryTable, "assigneeId"), principal(identity, "userId")),
  ),
  or(
    eq(column(inquiryTable, "status"), literal("未対応")),
    eq(column(inquiryTable, "status"), literal("対応中")),
  ),
);
export const inquiryRls = new RowLevelSecurity({
  table: inquiryTable,
  select: { using: eq(principal(identity, "inquiryRead"), literal(true)) },
  insert: {
    check: and(
      eq(principal(identity, "inquiryCreate"), literal(true)),
      eq(column(inquiryTable, "createdBy"), principal(identity, "userId")),
      eq(column(inquiryTable, "status"), literal("未対応")),
      eq(column(inquiryTable, "version"), literal(1)),
      or(admin, eq(column(inquiryTable, "assigneeId"), literal(undefined))),
    ),
  },
  update: { using: editable, check: editable },
});
