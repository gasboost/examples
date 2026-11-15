import { useState } from "react";
import { Link } from "react-router-dom";
import { routes } from "../../../shared/routes";
import { Can } from "../../components/Guard";
import { Button } from "../../components/ui/button";
import { CustomerList } from "./CustomerList";
import { CustomerFormDialog, type Customer } from "./CustomerFormDialog";

export function CustomersPage() {
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <Can requirement={{ customer: ["read", "create", "update"] }}>
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <Link to={routes.home}>ホームへ</Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">顧客管理</h1>
          <Button
            onClick={() => {
              setSaved(false);
              setEditing("new");
            }}
          >
            新規登録
          </Button>
        </div>
        {saved && <p role="status">顧客情報を保存しました。</p>}
        <CustomerList
          actionLabel="編集"
          onChoose={(customer) => {
            setSaved(false);
            setEditing(customer);
          }}
        />
        {editing && (
          <CustomerFormDialog
            customer={editing === "new" ? undefined : editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              setSaved(true);
            }}
          />
        )}
      </main>
    </Can>
  );
}
