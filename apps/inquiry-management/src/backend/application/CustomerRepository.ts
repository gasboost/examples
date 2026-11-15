import type { Customer } from "../domain/Customer";

export type CustomerSearch = {
  id?: string;
  keyword?: string;
  offset?: number;
  limit?: number;
};

export interface CustomerRepository {
  find(parameter: CustomerSearch): Customer[];
  save(customer: Customer): void;
}
