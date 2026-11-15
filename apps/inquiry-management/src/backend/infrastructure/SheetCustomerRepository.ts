import type { CustomerRepository } from "../application/CustomerRepository";
import { Customer, type CustomerDetails } from "../domain/Customer";
import { customerTable } from "../../shared/tables";
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
      customers: records.map((record) => {
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
      }),
      total,
    };
  }

  find(id: string) {
    const [record] = this.db.find(
      this.db.query("Customer").and("id", "=", [id]),
    );
    if (!record) return null;
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
  }

  create(details: CustomerDetails) {
    const now = new Date().toISOString();
    const [record] = this.db.table("Customer").create([
      {
        name: details.name,
        email: details.email,
        phone: details.phone,
        note: details.note,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    return new Customer({
      id: record.id,
      name: record.name,
      email: record.email,
      phone: record.phone,
      note: record.note,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  }

  update(id: string, details: Partial<CustomerDetails>) {
    return this.db.transaction(() => {
      const existing = this.find(id);
      if (!existing) return null;
      const [updated] = this.db.table("Customer").update([
        {
          id: existing.id,
          name: details.name === undefined ? existing.name : details.name,
          email: details.email === undefined ? existing.email : details.email,
          phone: details.phone === undefined ? existing.phone : details.phone,
          note: details.note === undefined ? existing.note : details.note,
          createdAt: existing.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      return new Customer({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        note: updated.note,
        createdAt: new Date(updated.createdAt),
        updatedAt: new Date(updated.updatedAt),
      });
    });
  }
}
