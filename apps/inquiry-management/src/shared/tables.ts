import { createAuthTables, createAuthorizationTables } from "@gasboost/auth";

import { defineTable } from "@gasboost/table";
import { inquiryRecord } from "./schemas/inquiry";
import { customerRecord } from "./schemas/customer";

export const customerTable = defineTable({
  name: "Customer",
  primaryKey: "id",
  schema: customerRecord,
});

export const inquiryTable = defineTable({
  name: "Inquiry",
  primaryKey: "id",
  schema: inquiryRecord,
});

export const authTables = createAuthTables();
export const authorizationTables = createAuthorizationTables();
export const tables = [
  customerTable,
  inquiryTable,
  authTables.user,
  authTables.account,
  authTables.passwordReset,
  authorizationTables.role,
  authorizationTables.permission,
] as const;
