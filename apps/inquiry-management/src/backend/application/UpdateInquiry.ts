import type { InquiryActor, InquiryDetails } from "../domain/Inquiry";
import type { CustomerRepository } from "./CustomerRepository";
import { CustomerNotFound } from "./UpdateCustomer";
import {
  InquiryConflict,
  InquiryNotFound,
  type InquiryRepository,
} from "./InquiryRepository";
import { InquiryResult } from "./InquiryResult";

export class UpdateInquiry {
  constructor(
    readonly repository: InquiryRepository,
    readonly customers: CustomerRepository,
    readonly now: () => Date,
    readonly transaction: <T>(work: () => T) => T,
  ) {}
  execute(
    input: Partial<InquiryDetails> & { id: string; version: number },
    actor: InquiryActor,
  ) {
    this.transaction(() => {
      const [inquiry] = this.repository.find({ id: input.id });
      if (!inquiry) throw new InquiryNotFound();
      const updated = inquiry.update(input, actor, this.now());
      if (inquiry.version !== input.version) throw new InquiryConflict();
      if (
        input.customerId !== undefined &&
        !this.customers.find({ id: input.customerId }).length
      )
        throw new CustomerNotFound();
      this.repository.save(updated);
    });
    // Transactions flush writes on commit; read the ORM version after commit.
    return new InquiryResult(this.repository.find({ id: input.id })[0]);
  }
}
