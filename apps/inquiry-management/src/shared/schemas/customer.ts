import { z } from "zod";

// Used by customer forms and the persisted Customer model; not an RPC contract.
export const customerFields = z.object({
  name: z.string().trim().min(1, "氏名を入力してください。"),
  email: z
    .union([z.email("メールアドレスの形式が正しくありません。"), z.literal("")])
    .optional(),
  phone: z.string().optional(),
  note: z.string().optional(),
});

export const customerRecord = customerFields.extend({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
