import { AuthorizationPolicy } from "@gasboost/auth/authorization";

export const policy = new AuthorizationPolicy({
  customer: ["read", "create", "update"],
})
  .linkRole("管理者", { customer: ["read", "create", "update"] })
  .linkRole("一般スタッフ", { customer: ["read", "create", "update"] });
