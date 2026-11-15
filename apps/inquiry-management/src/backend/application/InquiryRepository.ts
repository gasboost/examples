import type { Inquiry } from "../domain/Inquiry";
export interface InquiryRepository {
  find(parameter: { id?: string }): Inquiry[];
  save(inquiry: Inquiry): void;
}
export class InquiryNotFound extends Error {}
export class InquiryConflict extends Error {}
