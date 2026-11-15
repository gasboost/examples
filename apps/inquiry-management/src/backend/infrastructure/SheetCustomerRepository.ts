import type { CustomerRepository } from "../application/CustomerRepository";
import { Customer } from "../domain/Customer";
import type { DB } from "../lib/db";

export class SheetCustomerRepository implements CustomerRepository {
  constructor(readonly db: DB) {}

  list(keyword: string, page: number, pageSize: number) {
    const query = this.db
      .query("Customer")
      .and("name", "*", [keyword])
      .orderBy("id");
    const total = this.db.find(query).length;
    const records = this.db.find(
      query.limit(pageSize).offset((page - 1) * pageSize),
    );
    return { customers: records.map((record) => new Customer(record)), total };
  }

  find(id: string) {
    const [record] = this.db.find(
      this.db.query("Customer").and("id", "=", [id]),
    );
    return record ? new Customer(record) : null;
  }

  save(customer: Customer) {
    this.db.table("Customer").upsert([customer.toRecord()]);
  }

  transaction<T>(work: () => T): T {
    return this.db.transaction(work);
  }
}
