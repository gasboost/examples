# 問い合わせ管理

`@gasboost/create@0.2.0` の CLI で生成した公式サンプルのアプリ基盤です。合意済み仕様は [REQUIREMENTS.md](REQUIREMENTS.md) を参照してください。顧客の検索・登録・編集に対応しています。問い合わせの登録・検索・詳細・通常編集APIにも対応しています。問い合わせ画面・状態遷移・スタッフ管理は後続 Issue で追加します。

## 生成元と調整範囲

旧アプリを削除し、リポジトリルートから次を実行しました。`REQUIREMENTS.md` のみ退避して生成後に復元しています。

```sh
pnpm dlx @gasboost/create apps/inquiry-management
```

| Capability               | 選択 |
| ------------------------ | ---- |
| Database (Sheets)        | Yes  |
| Authentication           | Yes  |
| Frontend (React)         | Yes  |
| Realtime (Firebase RTDB) | No   |

Frontend は create が shadcn CLI 経由で導入する `gasboost/ui/frontend-auth` 由来です。`App.tsx` / `main.tsx`、Bootstrap、AuthContext、Guard、認可・認証テーブル、`sheets.ts` → `db.ts`、Runtime / DB Fake、`BUILD_TARGET` によるビルド分岐を利用しています。

生成後の調整は workspace のパッケージ名、format / lint、README、および合意済み email/password 認証に必要な設定と導線です。Google アカウントでの通常ログインと公開サインアップは無効にしています。初期管理者の作成は既存 Bootstrap が effective user を確認して行います。

メール認証画面も手作りせず、アプリディレクトリで既存 Registry を追加しました。

```sh
pnpm dlx shadcn@latest add gasboost/ui/sign-in-page gasboost/ui/forgot-password-page gasboost/ui/reset-password-page --yes
```

`AuthApp` の認証ルートだけを、ログイン・パスワード設定／再設定に接続しています。接続確認専用 RPC、ダミー業務テーブル、空の業務レイヤーはありません。

## ローカル開発

Node.js 24 以上と pnpm 10.18.0 を使用します。最初にリポジトリルートでインストールします。

```sh
pnpm install
pnpm --dir apps/inquiry-management dev
```

ターミナルに表示される **`Local bootstrap:` の URL** を開き、「初期設定を開始」を押します。既存 Bootstrap がインメモリ DB の準備と初期管理者登録を行います。ローカルのユーザーは `developer@localhost.invalid` です。必要なら `GASBOOST_LOCAL_USER_EMAIL` 環境変数で変更できます。

初期化後、ターミナルに **`Local password email (not sent):`** として表示される URL からパスワードを設定してください。その後、メールアドレスと設定したパスワードでログインできます。ログイン画面のリンクからパスワード設定・再設定画面にも移動できます。

ローカルの DB・セッション・初期化状態・認証用 pepper はインメモリです。開発サーバー再起動時にリセットされるため、再度 Bootstrap から操作してください。ローカルでは実メール送信や実 Sheets への接続を行いません。

## 品質チェックとビルド

このディレクトリから実行できます。

```sh
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm console
```

顧客機能にはDomainの状態変更テスト、実 Repository / UseCase / API の結合テスト、専用 RLS テスト、React Testing Library による画面操作テストがあります。Customer自身が変更項目の反映・未指定属性の保持・更新日時の整合を担い、Repositoryが保存・復元します。形式検証目的のDomainテストは設けていません。入力の形式・必須検証はPresentation、Recordの検証・保存・復元はRepository / SheetORMのテストで確認します。`tests/mocks/runtime.ts` は既存 GAS Fake を登録し、`tests/mocks/db.ts` は `sheets.ts` の Gateway のみを InMemoryGateway に差し替えます。各テストは DB・Principal・セッションをリセットし、この基盤を利用します。

Prettier は生成物も含めて整形します。Biome は TypeScript / JSON / CSS を検証し、Tailwind CSS v4 の構文を有効にしています。GAS の HTML テンプレート構文は Prettier で検証します。shadcn の汎用 Label / InputGroup が props で制御するラベル・キーボード操作に対してのみ、Biome の静的判定を限定調整しています。

ビルドは create の `clean` → `build:client` → `build:server` → `build:manifest` を使用します。client / server は `BUILD_TARGET` で切り替え、`dist/` に単一 `index.html`、`main.js`、`appsscript.json` を出力します。ビルド時の解析には専用の Fake Properties を渡しますが、本番の設定値は GAS 実行時に読み込みます。

ルートの動的 Matrix CI は変更したアプリだけを検証します。共通設定変更は全アプリを対象にし、変更アプリがゼロ件でも `CI required` が成功します。

## 自分の GAS 環境で利用する場合

実環境へのデプロイは CI に含めません。create 生成の `gasboost.config.ts` と `appsscript.json` を利用し、`pnpm console` から自分の GAS プロジェクトを設定してください。

- Google Sheets を用意し、Script Properties の `GASBOOST_SPREADSHEET_ID` に ID を設定します。
- 十分にランダムな `AUTH_PEPPER` を Script Properties に設定します。ローカル用・ビルド用の値は実環境で使用しません。
- manifest に含まれる Sheets API と、プロジェクト側で必要な API を有効にします。
- Web アプリの実行ユーザー・公開範囲を社内運用に合わせて設定し、初期化はデプロイ実行者本人が行います。
- パスワード設定メールのリンクには `ScriptApp.getService().getUrl()` を使用します。必要なら Script Properties の `APP_URL` に `/exec` URL を明示できます。実環境では MailApp がメールを送信します。

認証・Bootstrap 自体は既存ライブラリを使います。管理者・一般スタッフには顧客の閲覧・登録・編集権限を付与しています。スタッフ追加・無効化などは後続 Issue の対象です。実 GAS へのデプロイは行っていません。

## 顧客管理

ログイン後のホームから「顧客管理」を開きます。氏名の部分一致検索と20件単位のページ切り替え、新規登録、編集を行えます。氏名は必須、メールは入力時に形式を検証し、電話・備考は任意の文字列です。CustomerのIDは保存前に既存の `Utilities.getUuid()` で確定します。`save(customer): void` の戻り値に依存せず同じIDを保持するため、CustomerテーブルのDB自動再採番は使いません。生成時の日時はUseCaseから渡し、更新日時の反映はCustomer自身が行い、RepositoryはUTCのISO形式との変換のみを担います。

`listCustomers` / `createCustomer` / `updateCustomer` はそれぞれ既存の認証・操作別認可Middlewareを通り、DIで接続した操作ごとのUseCaseとSheetORM Repositoryを利用します。入力の形式・必須項目はPresentationで検証し、保存Recordのスキーマ・日時変換はInfrastructureに閉じています。 Repositoryの公開操作は `find(parameter): Customer[]` と `save(customer): void` のみです。UpdateCustomerは既存SheetORMのトランザクション内で取得→Customerの状態変更→保存を行います。RLSは認証済みユーザーの最新の有効権限から設定したPrincipalを参照し、顧客の取得・登録・更新を制御します。Principalは成功・失敗ともにリクエスト終了時にクリアします。削除APIはありません。

新規環境ではBootstrapがCustomerテーブルも準備します。初期設定済みの既存Sheetsへ導入する場合は、先に `Customer` シートを追加し、1行目に `name`, `email`, `phone`, `note`, `id`, `createdAt`, `updatedAt` の列をこの順で用意してください。既存の認証テーブルや初期化状態は削除しません。

問い合わせフォームへは `src/frontend/features/customers/CustomerPicker.tsx` を組み込みます。`value` に選択中の顧客または `null`、`onChange` に顧客を受け取るコールバックを渡してください。既存顧客の検索・選択と新規登録ダイアログを備え、登録成功時は返却された顧客（IDを含む）を自動選択します。AuthProvider・QueryClientProvider・Router配下で使用します。問い合わせ登録画面自体は含みません。

一覧は `find({ keyword })` で一致するCustomerを一度取得し、UseCaseで総件数と20件単位のページを組み立てます。総件数と表示内容を同じ取得結果に基づかせるため、対象ページ以外の一致データもサーバーメモリへ読み込みます。Repositoryの検索条件はID・キーワード・offset / limitに対応します。

## 問い合わせAPI

`createInquiry` / `listInquiries` / `listInquiryDetail` / `updateInquiry` はログイン済みの管理者・一般スタッフ向けのBackend RPCです。入出力型は `src/backend/main.ts` の `AppType` から推論します。

- 登録入力は `subject`（必須・200字以内）、`description`（必須）、既存の `customerId`、`channel`（電話／メール／来店／その他）。`assigneeId` は管理者のみ指定できます。IDは保存前に `Utilities.getUuid()` で確定し、登録者・受付日時・更新日時・未対応ステータス・初期version（1）はサーバーで設定します。
- 一覧は `keyword`（件名・内容・顧客名の部分一致）、`statuses`（複数）、`channel`、`assignee`、`sortBy`、`direction`、`page` を受け取ります。`assignee` は `{ type: "all" | "me" | "unassigned" }` または `{ type: "specified", userId }`。省略時は管理者が全件、一般スタッフが自分の担当分です。初期順は `updatedAt` の `desc`、`receivedAt` と `asc` も指定できます。同日時はID昇順で固定します。
- 一覧の `inquiries` は20件単位。`total`・`totalPages`・`statusCounts` はすべての検索条件（選択ステータスを含む）適用後の件数です。ページ範囲外は空配列です。小規模Sheets向けにRepositoryから閲覧可能な全問い合わせを一度取得し、サーバーのUseCaseで検索・ソート・集計・ページングを行います。キーワード指定時は顧客も読み込みます。データ件数増加時は取得量の見直しが必要です。
- 詳細入力は `{ id }`。全スタッフが全件閲覧でき、顧客情報と登録者・担当者のID／氏名を返します。参照先がない場合の関連情報は `null` です。認証アカウントやパスワード情報は返しません。
- 通常編集入力は `{ id, version, subject?, description?, customerId?, channel? }`。最新の担当者本人または管理者のみ可能で、未割当を一般スタッフは編集できません。完了時は管理者も編集できません。状態変更・担当変更は別Issueの対象です。未指定属性の保持と更新日時はDomainが担います。

操作権限のMiddlewareに加え、Inquiry専用RLSをSheetORMへ適用します。認証済みセッションから最新の権限と管理者ロールを取得してPrincipalを構成し、終了時にクリアします。通常編集は既存トランザクション内で取得・Domainの編集制限・期待version・顧客参照を検証して保存します。SheetORMの `versionColumn` が保存時にversionを加算し、コミット後に再読込して返します。状態遷移／履歴を含む競合制御の完成とフロントの再編集導線はIssue #8で対応します。

入力不正は `INVALID_INPUT`、未認証は `UNAUTHORIZED`、権限不足は `FORBIDDEN`、問い合わせ／顧客不在は `NOT_FOUND`、完了時の編集は `INQUIRY_COMPLETED`、期待version不一致は `CONFLICT` です。

新規環境ではBootstrapがInquiryシートも準備します。初期設定済みSheetsでは `Inquiry` シートを追加し、1行目に `subject`, `description`, `customerId`, `channel`, `id`, `assigneeId`, `status`, `createdBy`, `receivedAt`, `updatedAt`, `version` の列をこの順で用意してください。受付日時・更新日時はUTCのISO形式で保存します。Domain、実Repository、4 UseCase、4 RPC、専用RLSのテストは既存のIn-Memory環境で実行します。
