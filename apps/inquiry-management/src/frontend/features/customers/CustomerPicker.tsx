import { useState } from "react";
import { Can } from "../../components/Guard";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { CustomerList } from "./CustomerList";
import { CustomerFormDialog, type Customer } from "./CustomerFormDialog";

// Controlled selection for an inquiry form. The selected record includes its ID.
export function CustomerPicker({
  value,
  onChange,
}: {
  value: Customer | null;
  onChange: (customer: Customer) => void;
}) {
  const [mode, setMode] = useState<"search" | "create" | null>(null);
  return (
    <Can requirement={{ customer: ["read", "create"] }}>
      <div className="space-y-2">
        <p aria-live="polite">
          {value ? `選択中の顧客：${value.name}` : "顧客が選択されていません。"}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode("search")}
          >
            顧客を検索・選択
          </Button>
          <Button type="button" onClick={() => setMode("create")}>
            顧客を新規登録
          </Button>
        </div>
        {mode === "search" && (
          <Dialog
            open
            onOpenChange={(open) => {
              if (!open) setMode(null);
            }}
          >
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>顧客を検索・選択</DialogTitle>
              </DialogHeader>
              <CustomerList
                actionLabel="選択"
                onChoose={(customer) => {
                  onChange(customer);
                  setMode(null);
                }}
              />
              <Button type="button" onClick={() => setMode("create")}>
                顧客を新規登録
              </Button>
            </DialogContent>
          </Dialog>
        )}
        {mode === "create" && (
          <CustomerFormDialog
            onClose={() => setMode(null)}
            onSaved={(customer) => {
              onChange(customer);
              setMode(null);
            }}
          />
        )}
      </div>
    </Can>
  );
}
