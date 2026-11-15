import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { client } from "../../lib/appsscript";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import type { Customer } from "./CustomerFormDialog";
import { customerErrorMessage } from "./customerErrorMessage";

export function CustomerList({
  onChoose,
  actionLabel,
}: {
  onChoose: (customer: Customer) => void;
  actionLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const customers = useQuery({
    queryKey: ["customers", keyword, page],
    queryFn: () => client.listCustomers({ keyword, page, pageSize: 20 }),
    retry: false,
  });
  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setKeyword(search.trim());
          setPage(1);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="customer-search">氏名で検索</Label>
          <Input
            id="customer-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button type="submit">検索</Button>
      </form>
      {customers.isPending && <p role="status">顧客を読み込み中...</p>}
      {customers.isError && (
        <div role="alert">
          <p>{customerErrorMessage(customers.error)}</p>
          <Button type="button" onClick={() => void customers.refetch()}>
            再試行
          </Button>
        </div>
      )}
      {customers.data && (
        <>
          <p>{customers.data.total}件</p>
          {customers.data.customers.length === 0 ? (
            <p>該当する顧客はいません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="p-2">氏名</th>
                    <th className="p-2">メール</th>
                    <th className="p-2">電話</th>
                    <th className="p-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.data.customers.map((customer) => (
                    <tr key={customer.id} className="border-t">
                      <td className="p-2">{customer.name}</td>
                      <td className="p-2">{customer.email}</td>
                      <td className="p-2">{customer.phone}</td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="outline"
                          aria-label={`${customer.name}を${actionLabel}`}
                          onClick={() => onChoose(customer)}
                        >
                          {actionLabel}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <nav
            aria-label="顧客一覧のページ"
            className="flex items-center gap-3"
          >
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              前へ
            </Button>
            <span>
              {page} / {Math.max(1, customers.data.totalPages)}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={page >= customers.data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              次へ
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}
