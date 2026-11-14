# AGENTS.md

## Project Overview

gasboostの公式サンプルとして開発する問い合わせ管理Webアプリケーション。

- Frontend: TypeScript / React / Vite / Tailwind CSS v4 / shadcn/ui
- Backend: Google Apps Script / @gasboost/app
- Database: Google Sheets / @gasboost/sheetorm
- Testing: Vitest / React Testing Library / Playwright
- Package Manager: pnpm

機能・非機能要件の正本は `REQUIREMENTS.md` とする。本ファイルでは開発・実装・検証の方法を規定する。

## Directory Structure

| ディレクトリ | 責務 |
|---|---|
| `src/shared/` | スキーマ、型、認可ポリシーなどの共有定義 |
| `src/backend/domain/` | エンティティと業務ルール |
| `src/backend/application/` | ユースケース、クエリ、Repositoryインターフェース |
| `src/backend/infrastructure/` | Repositoryなどの具体的な実装 |
| `src/backend/presentation/` | API、Handler、Middleware |
| `src/frontend/` | UI、ルーティング、状態管理 |
| `tests/` | 単体・結合・E2Eテスト |

アーキテクチャと依存関係の分離は `gasboost/ui` を参考にする。

## Commands

アプリケーションルートで実行する。実際のスクリプト名は `package.json` を正とする。

- Install: `pnpm install`
- Development: `pnpm dev`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Test: `pnpm test`
- Build: `pnpm build`

存在しないコマンドを推測して実行しない。必要なスクリプトは担当Issueの範囲で整備する。

## Implementation Guidelines

- 実装前に関連する既存コードと利用パッケージのAPIを確認する。
- gasboostの既存機能を優先し、同等機能を独自実装しない。
- Domain・ApplicationをInfrastructureの具象実装に依存させず、DIで接続する。
- フロントエンドはshadcn/ui Blocksをレイアウトの基盤とし、TanStack Queryの公式推奨パターンに従う。
- 不要な抽象化、薄いラッパー、ヘルパーの乱立を避ける。既存コードの規約に合わせる。

## Testing

- 単体テストは外部依存のない純粋なロジックを対象とする。
- バックエンド結合テストでは、Repository・Application・Presentationの実装を使用する。
- GASの組み込みサービスなど、実行環境との境界だけをIn-Memory Fakeに置き換える。
- Fakeは `tests/mocks/` にモジュール化し、Vitestの `setupFiles` で読み込む。
- フロントエンドはVitestとReact Testing Libraryで単体・結合テストを行う。
- Playwright E2Eはローカル環境で最小限の主要シナリオのみ実行する。
- テストは機能実装と同時に追加する。

## Boundaries

- 担当Issueの範囲外を変更しない。無関係なリファクタリングを行わない。
- `.env` などの機密設定や認証情報をコミットしない。
- 実GASへのデプロイや本番データの変更を、明示的な指示なしに実行しない。
- テストを通すために本来の実装をモックへ置き換えたり、検証を無効化したりしない。
- 別のサンプルアプリへの依存を追加しない。

## Workflow

1. 担当Issueと `REQUIREMENTS.md` を確認し、変更範囲を特定する。
2. 関連コード・既存API・テストを確認する。
3. 必要な実装とテストを行う。
4. フォーマット、Lint、型チェック、テスト、ビルドを実行する。
5. 失敗があれば修正し、再検証する。
6. 変更内容と検証結果を確認してからPRを作成する。

Gitの変更は担当Issue単位とし、Conventional Commits形式を使用する。無関係な変更や不要な追加コミットを避ける。
