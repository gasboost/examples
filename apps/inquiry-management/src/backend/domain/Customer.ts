import type { z } from "zod";
import { customerFields, customerRecord } from "../../shared/schemas/customer";

export class Customer {
  readonly data: Readonly<z.infer<typeof customerRecord>>;

  constructor(data: z.infer<typeof customerRecord>) {
    this.data = Object.freeze(customerRecord.parse(data));
  }

  static create(
    fields: z.infer<typeof customerFields>,
    id: string,
    now: string,
  ) {
    return new Customer({
      ...customerFields.parse(fields),
      id,
      createdAt: now,
      updatedAt: now,
    });
  }

  update(fields: Partial<z.infer<typeof customerFields>>, now: string) {
    return new Customer({
      ...this.data,
      ...Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== undefined),
      ),
      updatedAt: now,
    });
  }

  toRecord() {
    return { ...this.data };
  }
}
