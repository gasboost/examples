import type { CustomerDetails } from "../domain/Customer";
import type { CustomerRepository } from "./CustomerRepository";

export class CustomerNotFound extends Error {}

export class UpdateCustomer {
  constructor(readonly repository: CustomerRepository) {}

  execute(input: { id: string } & Partial<CustomerDetails>) {
    const { id, ...details } = input;
    const updated = this.repository.update(id, details);
    if (!updated) throw new CustomerNotFound();
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      note: updated.note,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
