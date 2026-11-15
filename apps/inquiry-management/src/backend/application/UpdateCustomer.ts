import type { CustomerDetails } from "../domain/Customer";
import type { CustomerRepository } from "./CustomerRepository";

export class CustomerNotFound extends Error {}

export class UpdateCustomer {
  constructor(
    readonly repository: CustomerRepository,
    readonly now: () => Date,
    readonly transaction: <T>(work: () => T) => T,
  ) {}

  execute(input: { id: string } & Partial<CustomerDetails>) {
    return this.transaction(() => {
      const [customer] = this.repository.find({ id: input.id });
      if (!customer) throw new CustomerNotFound();
      const { id: _id, ...details } = input;
      const updated = customer.update(details, this.now());
      this.repository.save(updated);
      return {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        note: updated.note,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    });
  }
}
