import type { Customer } from "../domain/Customer";

export interface CustomerRepository {
  list(
    keyword: string,
    page: number,
    pageSize: number,
  ): { customers: Customer[]; total: number };
  find(id: string): Customer | null;
  save(customer: Customer): void;
  transaction<T>(work: () => T): T;
}
