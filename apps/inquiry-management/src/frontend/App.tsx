import { useQuery } from "@tanstack/react-query";
import { applicationName } from "../shared/application";
import { applicationStatusOptions } from "./lib/applicationStatus";

export function App() {
  const status = useQuery(applicationStatusOptions);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">{applicationName}</h1>
      <p className="mt-4 text-slate-600">gasboost 公式サンプルの開発基盤</p>
      <p role="status" className="mt-8 rounded-lg border border-slate-200 p-4">
        {status.isPending && "サーバーに接続しています…"}
        {status.isError && "サーバーに接続できませんでした。"}
        {status.isSuccess && `${status.data.name}：接続済み`}
      </p>
    </main>
  );
}
