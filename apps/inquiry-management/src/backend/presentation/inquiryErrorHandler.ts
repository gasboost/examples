import { AppsScriptError, type AppsScriptMiddleware } from "@gasboost/app";
import { InquiryForbidden, InquiryCompleted } from "../domain/Inquiry";
import {
  InquiryNotFound,
  InquiryConflict,
} from "../application/InquiryRepository";
import { CustomerNotFound } from "../application/UpdateCustomer";

export const inquiryErrorHandler: AppsScriptMiddleware = async (
  _context,
  next,
) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof InquiryForbidden)
      throw new AppsScriptError({
        code: "FORBIDDEN",
        message: "問い合わせを操作する権限がありません。",
      });
    if (error instanceof InquiryCompleted)
      throw new AppsScriptError({
        code: "INQUIRY_COMPLETED",
        message: "完了した問い合わせは再開するまで編集できません。",
      });
    if (error instanceof InquiryNotFound || error instanceof CustomerNotFound)
      throw new AppsScriptError({
        code: "NOT_FOUND",
        message: "問い合わせまたは顧客が見つかりません。",
      });
    if (error instanceof InquiryConflict)
      throw new AppsScriptError({
        code: "CONFLICT",
        message: "問い合わせが更新されています。再取得してください。",
      });
    throw error;
  }
};
