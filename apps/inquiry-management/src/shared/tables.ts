import { createAuthTables, createAuthorizationTables } from "@gasboost/auth";

import { defineTable } from "@gasboost/table";
import { customerRecord } from "./schemas/customer";

export const customerTable = defineTable({
  name: "Customer",
  primaryKey: "id",
  schema: customerRecord,
});

export const authTables = createAuthTables();
export const authorizationTables = createAuthorizationTables();
export const tables = [
  customerTable,
  authTables.user,
  authTables.account,
  authTables.passwordReset,
  authorizationTables.role,
  authorizationTables.permission,
] as const;
