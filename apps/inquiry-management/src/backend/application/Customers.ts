import type { z } from "zod";
import type { customerFields } from "../../shared/schemas/customer";
import { Customer } from "../domain/Customer";
import type { CustomerRepository } from "./CustomerRepository";

export class CustomerNotFound extends Error {}

export class Customers {
  constructor(
    readonly repository: CustomerRepository,
    readonly uuid: () => string,
    readonly now: () => string,
  ) {}

  list(input: { keyword: string; page: number; pageSize: number }) {
    const { customers, total } = this.repository.list(
      input.keyword,
      input.page,
      input.pageSize,
    );
    return {
      customers: customers.map((customer) => customer.toRecord()),
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }

  create(input: z.infer<typeof customerFields>) {
    const customer = Customer.create(input, this.uuid(), this.now());
    this.repository.save(customer);
    return customer.toRecord();
  }

  update(input: { id: string } & Partial<z.infer<typeof customerFields>>) {
    return this.repository.transaction(() => {
      const customer = this.repository.find(input.id);
      if (!customer) throw new CustomerNotFound();
      const { id: _id, ...fields } = input;
      const updated = customer.update(fields, this.now());
      this.repository.save(updated);
      return updated.toRecord();
    });
  }
}
