import { z } from "zod";

const customerDetails = z.object({
  name: z.string().trim().min(1, "氏名を入力してください。"),
  email: z
    .union([z.email("メールアドレスの形式が正しくありません。"), z.literal("")])
    .optional(),
  phone: z.string().optional(),
  note: z.string().optional(),
});
export type CustomerDetails = z.infer<typeof customerDetails>;

const customerAttributes = customerDetails.extend({
  id: z.uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export class Customer {
  readonly id: string;
  readonly name: string;
  readonly email: string | undefined;
  readonly phone: string | undefined;
  readonly note: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(
    attributes: CustomerDetails & {
      id: string;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    const validated = customerAttributes.parse(attributes);
    this.id = validated.id;
    this.name = validated.name;
    this.email = validated.email;
    this.phone = validated.phone;
    this.note = validated.note;
    this.createdAt = new Date(validated.createdAt);
    this.updatedAt = new Date(validated.updatedAt);
  }

  static create(details: CustomerDetails, id: string, now: Date) {
    return new Customer({ ...details, id, createdAt: now, updatedAt: now });
  }

  update(details: Partial<CustomerDetails>, now: Date) {
    return new Customer({
      ...this,
      ...Object.fromEntries(
        Object.entries(details).filter(([, value]) => value !== undefined),
      ),
      updatedAt: now,
    });
  }
}
