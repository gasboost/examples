import type {
  InquiryActor,
  InquiryDetails,
  InquiryStatus,
} from "../domain/Inquiry";
import type { CustomerRepository } from "./CustomerRepository";
import type { InquiryRepository } from "./InquiryRepository";
import { InquiryResult } from "./InquiryResult";

export class ListInquiries {
  constructor(
    readonly repository: InquiryRepository,
    readonly customers: CustomerRepository,
  ) {}
  execute(
    input: {
      keyword: string;
      statuses: InquiryStatus[];
      assignee?:
        | { type: "all" | "me" | "unassigned" }
        | { type: "specified"; userId: string };
      channel?: InquiryDetails["channel"];
      sortBy: "receivedAt" | "updatedAt";
      direction: "asc" | "desc";
      page: number;
    },
    actor: InquiryActor,
  ) {
    const assignee = input.assignee ?? { type: actor.isAdmin ? "all" : "me" };
    const keyword = input.keyword.toLocaleLowerCase();
    const customerIds = new Set(
      keyword
        ? this.customers
            .find({})
            .filter((customer) =>
              customer.name.toLocaleLowerCase().includes(keyword),
            )
            .map((customer) => customer.id)
        : [],
    );
    // Load once on the server so totals, status counts and pages share a snapshot.
    // This reads all visible inquiries; appropriate for the sample's small Sheets dataset.
    const matching = this.repository
      .find({})
      .filter(
        (inquiry) =>
          (!keyword ||
            inquiry.subject.toLocaleLowerCase().includes(keyword) ||
            inquiry.description.toLocaleLowerCase().includes(keyword) ||
            customerIds.has(inquiry.customerId)) &&
          (!input.statuses.length || input.statuses.includes(inquiry.status)) &&
          (!input.channel || input.channel === inquiry.channel) &&
          (assignee.type === "all" ||
            (assignee.type === "me" && inquiry.assigneeId === actor.userId) ||
            (assignee.type === "unassigned" &&
              inquiry.assigneeId === undefined) ||
            (assignee.type === "specified" &&
              inquiry.assigneeId === assignee.userId)),
      );
    matching.sort(
      (a, b) =>
        (a[input.sortBy].getTime() - b[input.sortBy].getTime()) *
          (input.direction === "asc" ? 1 : -1) || a.id.localeCompare(b.id),
    );
    const statusCounts = { 未対応: 0, 対応中: 0, 完了: 0 };
    for (const inquiry of matching) statusCounts[inquiry.status]++;
    return {
      inquiries: matching
        .slice((input.page - 1) * 20, input.page * 20)
        .map((inquiry) => new InquiryResult(inquiry)),
      total: matching.length,
      statusCounts,
      page: input.page,
      pageSize: 20,
      totalPages: Math.ceil(matching.length / 20),
    };
  }
}
