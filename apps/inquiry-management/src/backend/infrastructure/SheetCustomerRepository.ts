import type {
  CustomerRepository,
  CustomerSearch,
} from "../application/CustomerRepository";
import { Customer } from "../domain/Customer";
import { customerTable } from "../../shared/tables";
import type { DB } from "../lib/db";

export class SheetCustomerRepository implements CustomerRepository {
  constructor(readonly db: DB) {}

  find(parameter: CustomerSearch): Customer[] {
    const query = this.db.query("Customer").orderBy("id");
    if (parameter.id !== undefined) query.and("id", "=", [parameter.id]);
    if (parameter.keyword !== undefined)
      query.and("name", "*", [parameter.keyword]);
    if (parameter.offset !== undefined) query.offset(parameter.offset);
    if (parameter.limit !== undefined) query.limit(parameter.limit);
    return this.db.find(query).map((record) => {
      const stored = customerTable.schema.parse(record);
      return new Customer({
        id: stored.id,
        name: stored.name,
        email: stored.email,
        phone: stored.phone,
        note: stored.note,
        createdAt: new Date(stored.createdAt),
        updatedAt: new Date(stored.updatedAt),
      });
    });
  }

  save(customer: Customer): void {
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
}
