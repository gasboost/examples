export type InquiryStatus = "未対応" | "対応中" | "完了";
export type InquiryDetails = {
  subject: string;
  description: string;
  customerId: string;
  channel: "電話" | "メール" | "来店" | "その他";
};
export type InquiryActor = { userId: string; isAdmin: boolean };
export class InquiryForbidden extends Error {}
export class InquiryCompleted extends Error {}

export class Inquiry {
  readonly id: string;
  readonly subject: string;
  readonly description: string;
  readonly customerId: string;
  readonly channel: InquiryDetails["channel"];
  readonly assigneeId: string | undefined;
  readonly status: InquiryStatus;
  readonly createdBy: string;
  readonly receivedAt: Date;
  readonly updatedAt: Date;
  readonly version: number;

  constructor(
    attributes: InquiryDetails & {
      id: string;
      assigneeId?: string;
      status: InquiryStatus;
      createdBy: string;
      receivedAt: Date;
      updatedAt: Date;
      version: number;
    },
  ) {
    this.id = attributes.id;
    this.subject = attributes.subject;
    this.description = attributes.description;
    this.customerId = attributes.customerId;
    this.channel = attributes.channel;
    this.assigneeId = attributes.assigneeId;
    this.status = attributes.status;
    this.createdBy = attributes.createdBy;
    this.receivedAt = attributes.receivedAt;
    this.updatedAt = attributes.updatedAt;
    this.version = attributes.version;
  }

  update(details: Partial<InquiryDetails>, actor: InquiryActor, now: Date) {
    if (!actor.isAdmin && this.assigneeId !== actor.userId)
      throw new InquiryForbidden();
    if (this.status === "完了") throw new InquiryCompleted();
    return new Inquiry({
      id: this.id,
      subject: details.subject ?? this.subject,
      description: details.description ?? this.description,
      customerId: details.customerId ?? this.customerId,
      channel: details.channel ?? this.channel,
      assigneeId: this.assigneeId,
      status: this.status,
      createdBy: this.createdBy,
      receivedAt: this.receivedAt,
      updatedAt: now,
      // SheetORM owns the persisted version increment.
      version: this.version,
    });
  }
}
