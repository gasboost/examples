import type { CustomerRepository } from "./CustomerRepository";

export class ListCustomers {
  constructor(readonly repository: CustomerRepository) {}

  execute(input: { keyword: string; page: number; pageSize: number }) {
    const { customers, total } = this.repository.list(
      input.keyword,
      input.page,
      input.pageSize,
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
