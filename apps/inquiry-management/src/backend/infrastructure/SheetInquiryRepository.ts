import type { InquiryRepository } from "../application/InquiryRepository";
import { Inquiry } from "../domain/Inquiry";
import { inquiryTable } from "../../shared/tables";
import type { DB } from "../lib/db";

export class SheetInquiryRepository implements InquiryRepository {
  constructor(readonly db: DB) {}
  find(parameter: { id?: string }): Inquiry[] {
    const query = this.db.query("Inquiry").orderBy("id");
    if (parameter.id !== undefined) query.and("id", "=", [parameter.id]);
    return this.db.find(query).map((record) => {
      const stored = inquiryTable.schema.parse(record);
      return new Inquiry({
        ...stored,
        receivedAt: new Date(stored.receivedAt),
        updatedAt: new Date(stored.updatedAt),
      });
    });
  }
  save(inquiry: Inquiry): void {
    this.db.table("Inquiry").upsert([
      {
        id: inquiry.id,
        subject: inquiry.subject,
        description: inquiry.description,
        customerId: inquiry.customerId,
        channel: inquiry.channel,
        assigneeId: inquiry.assigneeId,
        status: inquiry.status,
        createdBy: inquiry.createdBy,
        receivedAt: inquiry.receivedAt.toISOString(),
        updatedAt: inquiry.updatedAt.toISOString(),
        version: inquiry.version,
      },
    ]);
  }
}
