# 問い合わせ管理

`@gasboost/app` / `@gasboost/client` / `@gasboost/vite` を利用した、公式サンプルの独立したアプリ基盤です。現在は型付き RPC による接続確認画面のみを実装しています。認証・問い合わせ・顧客・スタッフの機能は後続 Issue で実装します。機能要件は [REQUIREMENTS.md](REQUIREMENTS.md) を参照してください。

## 開発

Node.js 24 以上、pnpm 10.18.0 が必要です。最初にリポジトリルートで `pnpm install` を実行してください。その後はこのディレクトリをカレントディレクトリとして実行できます。

```sh
pnpm dev
pnpm typecheck
pnpm format
pnpm lint
pnpm test
pnpm build
```

`pnpm dev` が表示するローカル URL を開くと、接続確認 RPC が実際のバックエンド Handler を呼び出します。`@gasboost/vite` が開発時だけ `google.script.run` を Local RPC (`POST /__gasboost/getApplicationStatus`) へ差し替えるため、GAS への接続や秘密設定は不要です。現在の RPC は外部サービスを利用しません。Sheets や認証を追加するときに GAS 境界の Fake を拡張します。

ビルドは client → server の順に実行し、`dist/` に次の GAS 配信用ファイルをまとめます。

- `index.html` — JavaScript / CSS を内包した単一 HTML
- `main.js` — `doGet` と `getApplicationStatus` を公開する GAS コード
- `appsscript.json` — V8 / Asia/Tokyo / 自分のみアクセス可能な Web アプリ設定

`build:client` は `dist/` を初期化し、`build:server` は同じ場所に追記します。配布物を作る場合は必ず `pnpm build` を使ってください。

## テスト

Vitest で実際の AppsScript dispatch と型付き client の接続を確認します。React Testing Library のテストでは実際の QueryClient と画面を使い、GAS ブラウザ API 境界のみを Fake に置き換えます。GAS サービスの Fake は `tests/mocks/runtime.ts` に置き、`setupFiles` から読み込みます。

CI では format / lint / typecheck / build / Vitest を実行します。テストゼロ件を許容するオプションは設けず、機能追加と同時にテストを追加します。Playwright と実 GAS の検証はこの基盤 Issue の対象外です。

## 構成・依存方向

```text
src/shared/                  純粋な共有定義（React / GAS に依存しない）
src/backend/main.ts          AppsScript の組み立てと型契約
src/backend/domain/          業務ルール（機能追加時に実装）
src/backend/application/     UseCase / Repository 契約（同上）
src/backend/infrastructure/  Repository の具象実装（同上）
src/backend/presentation/    RPC / Handler
src/frontend/                React UI / 型付き client / queryOptions
tests/mocks/                 実行環境の境界 Fake
```

Domain / Application から Infrastructure へ依存せず、必要になった時点で `backend/main.ts` から DI で接続します。Frontend が参照する Backend は `AppType` の `import type` のみで、バックエンドの実行処理は client bundle に入りません。

### UI の追加

`components.json` は `gasboost/ui` と同じ shadcn のエイリアス・Tailwind CSS v4 の構成です。`@gasboost/ui` は npm の UI 部品集ではなく [shadcn GitHub registry](https://github.com/gasboost/ui) として利用します。認証画面・Guard・エラー画面を実装する際には、既存の registry 項目を導入し、同等機能を自作しません。

```sh
pnpm dlx shadcn@latest add gasboost/ui/auth-client gasboost/ui/guard
```

これは後続機能での導入例です。registry が生成する認証 API・共有 policy とバックエンドを合わせて実装してください。画面レイアウトは shadcn/ui Blocks を基盤にします。現在の接続確認ページは認証 UI や独自コンポーネントシステムを含みません。

## 自分の GAS への配置

この基盤では Sheets の作成や初期管理者の登録はまだ必要ありません。実 GAS へのデプロイは CI に含めません。

手動確認する場合は、GAS 設定で Apps Script API を有効にし、次をこのディレクトリで実行します。

```sh
pnpm build
pnpm dlx @google/clasp login
pnpm dlx @google/clasp create --type webapp --title inquiry-management --rootDir dist
pnpm dlx @google/clasp push
pnpm dlx @google/clasp open-script
```

GAS エディタから「デプロイ → 新しいデプロイ → ウェブアプリ」を選び、実行ユーザーを自分、アクセスできるユーザーを自分のみにしてデプロイします。発行された `/exec` URL で接続済み表示を確認します。`clasp create` 後に manifest が変更された場合は、再度 `pnpm build` してから push してください。`.clasp.json` と認証情報はコミットしません。

この PR ではローカル RPC とビルドを確認し、実 GAS への配置は実施していません。
