import type { Customer, CustomerDetails } from "../domain/Customer";

export interface CustomerRepository {
  list(
    keyword: string,
    page: number,
    pageSize: number,
  ): { customers: Customer[]; total: number };
  find(id: string): Customer | null;
  create(details: CustomerDetails): Customer;
  update(id: string, details: Partial<CustomerDetails>): Customer | null;
}
