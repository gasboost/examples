import { AppsScriptRpcError } from "@gasboost/client";

export function customerErrorMessage(error: unknown): string {
  if (error instanceof AppsScriptRpcError) {
    switch (error.code) {
      case "UNAUTHORIZED":
        return "ログインし直してください。";
      case "FORBIDDEN":
        return "顧客を操作する権限がありません。";
      case "INVALID_INPUT":
        return "入力内容を確認してください。";
      case "NOT_FOUND":
        return "顧客が見つかりません。一覧を更新してください。";
    }
  }
  return "顧客情報を取得・保存できませんでした。再試行してください。";
}
