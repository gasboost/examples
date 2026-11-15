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
    return {
      customers: records.map(
        (record) =>
          new Customer({
            id: record.id,
            name: record.name,
            email: record.email,
            phone: record.phone,
            note: record.note,
            createdAt: new Date(record.createdAt),
            updatedAt: new Date(record.updatedAt),
          }),
      ),
      total,
    };
  }

  find(id: string) {
    const [record] = this.db.find(
      this.db.query("Customer").and("id", "=", [id]),
    );
    return record
      ? new Customer({
          id: record.id,
          name: record.name,
          email: record.email,
          phone: record.phone,
          note: record.note,
          createdAt: new Date(record.createdAt),
          updatedAt: new Date(record.updatedAt),
        })
      : null;
  }

  save(customer: Customer) {
    this.db.table("Customer").upsert([
      {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        note: customer.note,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
      },
    ]);
  }

  transaction<T>(work: () => T): T {
    return this.db.transaction(work);
  }
}
