# 問い合わせ管理

`@gasboost/create@0.2.0` の CLI で生成した公式サンプルのアプリ基盤です。合意済み仕様は [REQUIREMENTS.md](REQUIREMENTS.md) を参照してください。顧客の検索・登録・編集に対応しています。問い合わせ・スタッフ管理は後続 Issue で追加します。

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

顧客機能には実 Repository / UseCase / API の結合テスト、専用 RLS テスト、React Testing Library による画面操作テストがあります。Customerは業務上の属性を持つDomainモデルとして残し、Repositoryが保存・復元します。Customerには独自の業務検証を作り足さず、形式検証目的のDomainテストは設けていません。入力の形式・必須検証はPresentation、Recordの検証・保存・復元はRepository / SheetORMのテストで確認します。`tests/mocks/runtime.ts` は既存 GAS Fake を登録し、`tests/mocks/db.ts` は `sheets.ts` の Gateway のみを InMemoryGateway に差し替えます。各テストは DB・Principal・セッションをリセットし、この基盤を利用します。

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

ログイン後のホームから「顧客管理」を開きます。氏名の部分一致検索と20件単位のページ切り替え、新規登録、編集を行えます。氏名は必須、メールは入力時に形式を検証し、電話・備考は任意の文字列です。UUIDはSheetTableの `autoNumbering: "uuid"` によりSheetORMが採番し、作成・更新日時（UTCのISO形式）はRepositoryが設定します。

`listCustomers` / `createCustomer` / `updateCustomer` はそれぞれ既存の認証・操作別認可Middlewareを通り、DIで接続した操作ごとのUseCaseとSheetORM Repositoryを利用します。入力の形式・必須項目はPresentationで検証し、保存Recordのスキーマ・日時変換はInfrastructureに閉じています。RLSは認証済みユーザーの最新の有効権限から設定したPrincipalを参照し、顧客の取得・登録・更新を制御します。Principalは成功・失敗ともにリクエスト終了時にクリアします。削除APIはありません。

新規環境ではBootstrapがCustomerテーブルも準備します。初期設定済みの既存Sheetsへ導入する場合は、先に `Customer` シートを追加し、1行目に `name`, `email`, `phone`, `note`, `id`, `createdAt`, `updatedAt` の列をこの順で用意してください。既存の認証テーブルや初期化状態は削除しません。

問い合わせフォームへは `src/frontend/features/customers/CustomerPicker.tsx` を組み込みます。`value` に選択中の顧客または `null`、`onChange` に顧客を受け取るコールバックを渡してください。既存顧客の検索・選択と新規登録ダイアログを備え、登録成功時は返却された顧客（IDを含む）を自動選択します。AuthProvider・QueryClientProvider・Router配下で使用します。問い合わせ登録画面自体は含みません。
