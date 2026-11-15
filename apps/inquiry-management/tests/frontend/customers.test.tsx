// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { AppsScriptRpcError } from "@gasboost/client";
import { CustomersPage } from "../../src/frontend/features/customers/CustomersPage";
import { CustomerPicker } from "../../src/frontend/features/customers/CustomerPicker";
import type { Customer } from "../../src/frontend/features/customers/CustomerFormDialog";
import { client } from "../../src/frontend/lib/appsscript";

const session = vi.hoisted(() => ({
  permissions: ["customer:read", "customer:create", "customer:update"],
}));
vi.mock("../../src/frontend/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { data: { permissions: session.permissions } },
    isLoading: false,
    isSessionRestoreFailed: false,
  }),
}));
vi.mock("../../src/frontend/lib/appsscript", () => ({
  client: {
    listCustomers: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
  },
}));
const row: Customer = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "山田 花子",
  email: "hanako@example.com",
  phone: "03-1234",
  note: "備考",
  createdAt: "2026-11-15T00:00:00.000Z",
  updatedAt: "2026-11-15T00:00:00.000Z",
};
let queryClient: QueryClient;
beforeEach(() => {
  vi.resetAllMocks();
  session.permissions = ["customer:read", "customer:create", "customer:update"];
  vi.mocked(client.listCustomers).mockResolvedValue({
    customers: [row],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});
afterEach(() => {
  cleanup();
  queryClient.clear();
});

function show(children: ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={children} />
          <Route path="/forbidden" element={<p>権限がありません</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function Picker() {
  const [selected, setSelected] = useState<Customer | null>(null);
  return <CustomerPicker value={selected} onChange={setSelected} />;
}

test("list searches by submitted name, pages on server and resets page for new search", async () => {
  const user = userEvent.setup();
  vi.mocked(client.listCustomers).mockResolvedValue({
    customers: [row],
    total: 21,
    page: 1,
    pageSize: 20,
    totalPages: 2,
  });
  show(<CustomersPage />);
  expect(await screen.findByText(row.email ?? "")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "次へ" }));
  await waitFor(() =>
    expect(client.listCustomers).toHaveBeenLastCalledWith({
      keyword: "",
      page: 2,
      pageSize: 20,
    }),
  );
  await user.type(screen.getByLabelText("氏名で検索"), "佐藤");
  vi.mocked(client.listCustomers).mockResolvedValue({
    customers: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  await user.click(screen.getByRole("button", { name: "検索" }));
  expect(await screen.findByText("該当する顧客はいません。")).toBeTruthy();
  expect(client.listCustomers).toHaveBeenLastCalledWith({
    keyword: "佐藤",
    page: 1,
    pageSize: 20,
  });
  expect(
    (screen.getByRole("button", { name: "次へ" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});

test("loading and sanitized errors offer a retry", async () => {
  const user = userEvent.setup();
  vi.mocked(client.listCustomers).mockRejectedValueOnce(
    new Error("private server details"),
  );
  show(<CustomersPage />);
  expect(screen.getByRole("status").textContent).toContain("読み込み中");
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("private server details")).toBeNull();
  await user.click(screen.getByRole("button", { name: "再試行" }));
  expect(await screen.findByText(row.email ?? "")).toBeTruthy();
});

test("create validates name and optional email; failed submission retains input for retry", async () => {
  const user = userEvent.setup();
  show(<CustomersPage />);
  await user.click(screen.getByRole("button", { name: "新規登録" }));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "保存" }));
  expect(await screen.findByText("氏名を入力してください。")).toBeTruthy();
  expect(client.createCustomer).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("氏名（必須）"), "佐藤");
  await user.type(screen.getByLabelText("メールアドレス"), "invalid");
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(
    await screen.findByText("メールアドレスの形式が正しくありません。"),
  ).toBeTruthy();
  await user.clear(screen.getByLabelText("メールアドレス"));
  await user.type(screen.getByLabelText("電話番号"), "090-1234");
  await user.type(screen.getByLabelText("備考"), "入力を保持");
  vi.mocked(client.createCustomer)
    .mockRejectedValueOnce(
      new AppsScriptRpcError({ code: "INVALID_INPUT", message: "hidden" }),
    )
    .mockResolvedValue({
      ...row,
      name: "佐藤",
      email: "",
      phone: "090-1234",
      note: "入力を保持",
    });
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByText("入力内容を確認してください。")).toBeTruthy();
  expect((screen.getByLabelText("備考") as HTMLTextAreaElement).value).toBe(
    "入力を保持",
  );
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(client.createCustomer).toHaveBeenLastCalledWith({
    name: "佐藤",
    email: "",
    phone: "090-1234",
    note: "入力を保持",
  });
  expect(screen.getByText("顧客情報を保存しました。")).toBeTruthy();
  await waitFor(() => expect(client.listCustomers).toHaveBeenCalledTimes(2));
});

test("edit loads all fields, blocks duplicate submissions and keeps input on not-found errors", async () => {
  const user = userEvent.setup();
  show(<CustomersPage />);
  await user.click(
    await screen.findByRole("button", { name: `${row.name}を編集` }),
  );
  expect(
    (screen.getByLabelText("メールアドレス") as HTMLInputElement).value,
  ).toBe(row.email);
  expect((screen.getByLabelText("電話番号") as HTMLInputElement).value).toBe(
    row.phone,
  );
  expect((screen.getByLabelText("備考") as HTMLTextAreaElement).value).toBe(
    row.note,
  );
  await user.clear(screen.getByLabelText("氏名（必須）"));
  await user.type(screen.getByLabelText("氏名（必須）"), "変更後");
  let rejectSave!: (error: Error) => void;
  vi.mocked(client.updateCustomer).mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        rejectSave = reject;
      }),
  );
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(
    (screen.getByRole("button", { name: "保存中..." }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    (screen.getByRole("button", { name: "キャンセル" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(client.updateCustomer).toHaveBeenCalledOnce();
  rejectSave(new AppsScriptRpcError({ code: "NOT_FOUND", message: "hidden" }));
  expect(
    await screen.findByText("顧客が見つかりません。一覧を更新してください。"),
  ).toBeTruthy();
  expect(
    (screen.getByLabelText("氏名（必須）") as HTMLInputElement).value,
  ).toBe("変更後");
  vi.mocked(client.updateCustomer).mockResolvedValue({
    ...row,
    name: "変更後",
  });
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(client.updateCustomer).toHaveBeenLastCalledWith({
    id: row.id,
    name: "変更後",
    email: row.email,
    phone: row.phone,
    note: row.note,
  });
});

test("picker selects an existing customer", async () => {
  const user = userEvent.setup();
  show(<Picker />);
  await user.click(screen.getByRole("button", { name: "顧客を検索・選択" }));
  await user.click(
    await screen.findByRole("button", { name: `${row.name}を選択` }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByText(`選択中の顧客：${row.name}`)).toBeTruthy();
});

test("picker can create from search dialog and automatically selects the returned customer", async () => {
  const user = userEvent.setup();
  vi.mocked(client.createCustomer).mockResolvedValue({
    ...row,
    name: "新しい顧客",
  });
  show(<Picker />);
  await user.click(screen.getByRole("button", { name: "顧客を検索・選択" }));
  const dialog = await screen.findByRole("dialog");
  await user.click(
    within(dialog).getByRole("button", { name: "顧客を新規登録" }),
  );
  await user.type(await screen.findByLabelText("氏名（必須）"), "新しい顧客");
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByText("選択中の顧客：新しい顧客")).toBeTruthy();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("picker cancel preserves the current selection", async () => {
  const user = userEvent.setup();
  show(<CustomerPicker value={row} onChange={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "顧客を新規登録" }));
  await user.click(await screen.findByRole("button", { name: "キャンセル" }));
  expect(screen.getByText(`選択中の顧客：${row.name}`)).toBeTruthy();
  expect(client.createCustomer).not.toHaveBeenCalled();
});

test("permission guard hides customer operations and rejects access", async () => {
  session.permissions = [];
  show(<CustomersPage />);
  expect(await screen.findByText("権限がありません")).toBeTruthy();
  expect(client.listCustomers).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "新規登録" })).toBeNull();
});
