# gasboost examples

各サンプルは `apps/<app>` に閉じた pnpm workspace アプリです。Node.js 24 以上と pnpm 10.18.0 を使用します。

```sh
pnpm install
pnpm --dir apps/inquiry-management dev
```

- [問い合わせ管理](apps/inquiry-management/README.md) — create CLI + frontend-auth Registry による Sheets / 認証 / React のアプリ基盤

## 品質チェック

```sh
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

各アプリでは `dev` / `build` / `typecheck` / `format` / `lint` / `test` を用意してください。新しいアプリは `apps/*/package.json` から自動検出されます。アプリ間の依存やサンプル専用の共有パッケージは作りません。

## PR CI

`.github/workflows/ci.yml` は PR の base / head 間の変更を調べ、該当するアプリだけを動的 Matrix で並列検証します。`fail-fast: false` により他アプリの結果も確認できます。

- `apps/<app>/` の変更はそのアプリを検証します。ファイル移動は移動元・移動先の両方を対象にします。
- lockfile、workspace 設定、ツール設定、CI、未知のルートファイルなどの変更は全アプリを検証します。
- ルート Markdown と `docs/` だけの変更ならアプリ検証はゼロ件です。共通ツールのチェックは常に実行します。
- 必須チェックには **`CI required`** を指定してください。対象ゼロ件でも成功し、検出失敗・品質チェック失敗・キャンセルは失敗扱いです。ブランチ保護の設定自体はリポジトリ管理者が行います。

対象判定は次のコマンドで再現できます。引数を省略すると全アプリを返します。

```sh
node scripts/changed-apps.mjs origin/main HEAD
node --test scripts/*.test.mjs
```

CI は GAS デプロイや E2E を実行しません。Playwright の CI 統合は Issue #11 で追加します。
