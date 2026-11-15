import type { CustomerDetails } from "../domain/Customer";
import type { CustomerRepository } from "./CustomerRepository";

export class CreateCustomer {
  constructor(readonly repository: CustomerRepository) {}

  execute(input: CustomerDetails) {
    const customer = this.repository.create(input);
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
