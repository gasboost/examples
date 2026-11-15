import type { CustomerRepository } from "./CustomerRepository";

export class ListCustomers {
  constructor(readonly repository: CustomerRepository) {}

  execute(input: { keyword: string; page: number; pageSize: number }) {
    // One read keeps the total and page based on the same set of aggregates.
    const matching = this.repository.find({ keyword: input.keyword });
    const total = matching.length;
    const customers = matching.slice(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize,
    );
    return {
      customers: customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        note: customer.note,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
      })),
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
}
