import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import type { AppType } from "../../../backend/main";
import { customerFields } from "../../../shared/schemas/customer";
import { client } from "../../lib/appsscript";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { customerErrorMessage } from "./customerErrorMessage";

export type Customer = AppType["createCustomer"]["result"];

export function CustomerFormDialog({
  customer,
  onSaved,
  onClose,
}: {
  customer?: Customer;
  onSaved: (customer: Customer) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof customerFields>>({
    resolver: zodResolver(customerFields),
    defaultValues: {
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      note: customer?.note ?? "",
    },
  });
  const save = useMutation({
    mutationFn: (fields: z.infer<typeof customerFields>) =>
      customer
        ? client.updateCustomer({ ...fields, id: customer.id })
        : client.createCustomer(fields),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      onSaved(saved);
    },
    retry: false,
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent showCloseButton={!save.isPending}>
        <DialogHeader>
          <DialogTitle>
            {customer ? "顧客を編集" : "顧客を新規登録"}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((fields) => {
            if (!save.isPending) save.mutate(fields);
          })}
        >
          <fieldset disabled={save.isPending} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">氏名（必須）</Label>
              <Input
                id="customer-name"
                required
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p role="alert">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">メールアドレス</Label>
              <Input
                id="customer-email"
                type="email"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p role="alert">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">電話番号</Label>
              <Input id="customer-phone" type="tel" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-note">備考</Label>
              <Textarea id="customer-note" {...register("note")} />
            </div>
          </fieldset>
          {save.isError && (
            <p role="alert">{customerErrorMessage(save.error)}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={onClose}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
