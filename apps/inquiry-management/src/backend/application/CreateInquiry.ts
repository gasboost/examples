import {
  Inquiry,
  InquiryForbidden,
  type InquiryActor,
  type InquiryDetails,
} from "../domain/Inquiry";
import type { CustomerRepository } from "./CustomerRepository";
import { CustomerNotFound } from "./UpdateCustomer";
import type { InquiryRepository } from "./InquiryRepository";
import { InquiryResult } from "./InquiryResult";

export class CreateInquiry {
  constructor(
    readonly repository: InquiryRepository,
    readonly customers: CustomerRepository,
    readonly uuid: () => string,
    readonly now: () => Date,
    readonly transaction: <T>(work: () => T) => T,
  ) {}
  execute(
    input: InquiryDetails & { assigneeId?: string },
    actor: InquiryActor,
  ) {
    return this.transaction(() => {
      if (input.assigneeId !== undefined && !actor.isAdmin)
        throw new InquiryForbidden();
      if (!this.customers.find({ id: input.customerId }).length)
        throw new CustomerNotFound();
      const now = this.now();
      const inquiry = new Inquiry({
        ...input,
        id: this.uuid(),
        status: "未対応",
        createdBy: actor.userId,
        receivedAt: now,
        updatedAt: now,
        version: 1,
      });
      this.repository.save(inquiry);
      return new InquiryResult(inquiry);
    });
  }
}
