import type { Inquiry } from "../domain/Inquiry";

// An application result, independent of the persistence record and Domain entity.
export class InquiryResult {
  readonly id;
  readonly subject;
  readonly description;
  readonly customerId;
  readonly channel;
  readonly assigneeId;
  readonly status;
  readonly createdBy;
  readonly receivedAt;
  readonly updatedAt;
  readonly version;
  constructor(inquiry: Inquiry) {
    this.id = inquiry.id;
    this.subject = inquiry.subject;
    this.description = inquiry.description;
    this.customerId = inquiry.customerId;
    this.channel = inquiry.channel;
    this.assigneeId = inquiry.assigneeId;
    this.status = inquiry.status;
    this.createdBy = inquiry.createdBy;
    this.receivedAt = inquiry.receivedAt.toISOString();
    this.updatedAt = inquiry.updatedAt.toISOString();
    this.version = inquiry.version;
  }
}
