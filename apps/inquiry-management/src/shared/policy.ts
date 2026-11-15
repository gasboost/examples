import { AuthorizationPolicy } from "@gasboost/auth/authorization";

// Bootstrap's default administrator role is "管理者".
export const roles = { admin: "管理者", staff: "一般スタッフ" } as const;

export const policy = new AuthorizationPolicy({
  customers: ["read", "create", "update"],
  inquiries: [
    "read",
    "create",
    "update",
    "changeStatus",
    "addComment",
    "assign",
  ],
  staff: ["create", "changeRole", "disable"],
})
  .linkRole(roles.admin, {
    customers: ["read", "create", "update"],
    inquiries: [
      "read",
      "create",
      "update",
      "changeStatus",
      "addComment",
      "assign",
    ],
    staff: ["create", "changeRole", "disable"],
  })
  .linkRole(roles.staff, {
    customers: ["read", "create", "update"],
    inquiries: ["read", "create", "update", "changeStatus", "addComment"],
  });

// Record-dependent permission checks additionally require shared/rls.ts.
export type BusinessRole = typeof policy.$types.role;
export type Permission = typeof policy.$types.permission;
