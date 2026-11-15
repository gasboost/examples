import { createAuthTables, createAuthorizationTables } from "@gasboost/auth";
import { defineTable } from "@gasboost/table";
import {
  customerSchema,
  inquirySchema,
  inquiryEventSchema,
} from "./schemas/records";

export const authTables = createAuthTables();
export const authorizationTables = createAuthorizationTables();
export const customerTable = defineTable({
  name: "Customer",
  schema: customerSchema,
  primaryKey: "id",
});
export const inquiryTable = defineTable({
  name: "Inquiry",
  schema: inquirySchema,
  primaryKey: "id",
});
export const inquiryEventTable = defineTable({
  name: "InquiryEvent",
  schema: inquiryEventSchema,
  primaryKey: "id",
});
export const tables = [
  authTables.user,
  authTables.account,
  authTables.passwordReset,
  authorizationTables.role,
  authorizationTables.permission,
  customerTable,
  inquiryTable,
  inquiryEventTable,
] as const;
