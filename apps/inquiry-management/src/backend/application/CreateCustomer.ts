import { Customer, type CustomerDetails } from "../domain/Customer";
import type { CustomerRepository } from "./CustomerRepository";

export class CreateCustomer {
  constructor(
    readonly repository: CustomerRepository,
    readonly uuid: () => string,
    readonly now: () => Date,
  ) {}

  execute(input: CustomerDetails) {
    const now = this.now();
    const customer = new Customer({
      ...input,
      id: this.uuid(),
      createdAt: now,
      updatedAt: now,
    });
    this.repository.save(customer);
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      note: customer.note,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }
}
