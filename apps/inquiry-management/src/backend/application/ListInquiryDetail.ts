import type { CustomerRepository } from "./CustomerRepository";
import { InquiryNotFound, type InquiryRepository } from "./InquiryRepository";
import { InquiryResult } from "./InquiryResult";

export class ListInquiryDetail {
  constructor(
    readonly repository: InquiryRepository,
    readonly customers: CustomerRepository,
    readonly users: {
      find(id: string): Promise<{ id: string; name: string } | null>;
    },
  ) {}
  async execute(input: { id: string }) {
    const [inquiry] = this.repository.find(input);
    if (!inquiry) throw new InquiryNotFound();
    const [customer] = this.customers.find({ id: inquiry.customerId });
    const [createdBy, assignee] = await Promise.all([
      this.users.find(inquiry.createdBy),
      inquiry.assigneeId ? this.users.find(inquiry.assigneeId) : null,
    ]);
    return {
      ...new InquiryResult(inquiry),
      creator: createdBy ? { id: createdBy.id, name: createdBy.name } : null,
      assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
      customer: customer
        ? {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            note: customer.note,
          }
        : null,
    };
  }
}
