# 問い合わせ管理システム 要件定義書

- バージョン: 1.0（要件整理版）
- 作成日: 2026-11-14
- 対象: `gasboost/examples/apps/inquiry-management`（予定）
- 目的: gasboost公式サンプル、Zenn連載第4回の実例
- 状態: 合意済み事項を確定事項として記載。未決定事項は第11章に分離。

## 1. 目的

Google Apps Script（GAS）とGoogle Sheetsを使いながら、gasboostのエコシステムで本格的なモダンWebアプリケーションを構築できることを、実際に動作する問い合わせ管理システムで示す。

小規模企業の社内スタッフが、電話・メール・来店等で受け付けた顧客問い合わせ、担当者、進捗、対応履歴を管理する。読者は公開ソースとREADMEから自分のGAS環境にデプロイできる。

### 設計方針

- リアルタイム同期は不要。RTDBを導入しない。
- GASの制約回避そのものではなく、モダンWebアプリを構築するためのフレームワーク、ORM、認証・認可、開発・テスト環境の実例とする。
- 過度な機能追加や独自フレームワークの構築を避け、既存gasboostライブラリを優先的に利用する。
- サンプルとして自己完結する。別のサンプルアプリへの実行時依存を持たせない。

## 2. 対象範囲

### 対象

- スタッフの認証、管理者／一般スタッフの認可、初期セットアップ
- 社内スタッフによる問い合わせの登録、閲覧、編集、検索
- 顧客管理、問い合わせ登録中の顧客新規登録
- 担当者割り当て／変更／解除
- ステータス管理、対応メモ、変更イベントを統合したタイムライン
- スタッフの登録、ロール変更、無効化
- versionによる楽観的ロックと競合後の再編集
- GASへのデプロイ、ローカルFake環境での開発・テスト

### MVP対象外

- 顧客向け公開問い合わせフォーム
- メール自動取り込み、外部CRM連携、業務通知
- RTDB等のリアルタイム同期
- 添付ファイル、分析ダッシュボード、高度なSLA管理
- 公開デモ環境、CIからの実GAS E2E
- 問い合わせ／履歴の物理削除
- 競合時の自動マージ・自動上書き

## 3. 利用者・認可

ロールは **管理者** と **一般スタッフ** の2種類。

| 操作 | 管理者 | 一般スタッフ |
|---|---|---|
| 問い合わせ一覧・詳細 | 全件 | 全件 |
| 問い合わせ登録 | 可 | 可 |
| 問い合わせ編集 | 全件 | 自分の担当分 |
| ステータス変更・再開 | 全件 | 自分の担当分 |
| 対応メモ追加 | 全件 | 自分の担当分 |
| 担当者割り当て・変更・解除 | 可 | 不可 |
| 顧客閲覧・登録・編集 | 可 | 可 |
| スタッフ登録・ロール変更・無効化 | 可 | 不可 |

- 未割り当て問い合わせは一般スタッフも閲覧・新規登録できるが、その後の編集・対応はできない。
- 担当者変更後、旧担当者の編集権限は失われ、新担当者に移る。
- 権限・担当者・状態は更新時に**サーバー側の最新データ**で検証する。フロント側ガードは操作性のために使い、セキュリティ境界としない。
- 無効化ユーザーはログイン・新規操作不可。過去の対応履歴には参照を残す。

## 4. 機能要件

### FR-01 認証・初期化

- email/passwordによるログイン／ログアウト、パスワード設定・再設定。
- **`@gasboost/bootstrap` をそのまま利用**し、独自の初期化機構を再実装しない。
- 初期セットアップはGASの **effective user** に基づく既存の権限制御を利用する。誰でも初期管理者になれる公開登録方式にはしない。
- 必要なテーブル・認証・認可・初期管理者の準備は既存ライブラリの責務に合わせる。

### FR-02 問い合わせ登録

- 管理者・一般スタッフが手動登録できる。
- 必須：件名（最大200文字）、問い合わせ内容、顧客、受付経路。
- 受付経路：**電話／メール／来店／その他**。
- 担当者は任意（割り当て権限は管理者のみ）。未割り当てを許可する。
- 自動設定：UUID、ステータス「未対応」、受付日時、登録者、更新日時、初期version。
- 既存顧客の検索・選択に加え、問い合わせ登録画面内のダイアログから顧客を新規登録できる。登録後は自動選択する。
- 登録成功後、問い合わせ詳細画面へ遷移する。

### FR-03 一覧・検索

- 管理者の初期表示：全問い合わせ。一般スタッフの初期表示：自身の担当分。
- 両ロールとも条件を変更すれば全件閲覧可能。初期並び順は更新日時降順。
- キーワード部分一致：件名、問い合わせ内容、顧客名。
- 絞り込み：ステータス（複数選択）、担当者（全員／自分／指定スタッフ／未割当）、受付経路（単一選択）。
- 並び替え：受付日時・更新日時の昇順／降順。
- **20件単位**でページング。検索・フィルタ・件数算出・並び替えは原則サーバー側。
- 未対応／対応中／完了の件数を表示する。

### FR-04 問い合わせ詳細・編集

- 件名、本文、顧客、受付経路、担当者、ステータス、登録者、受付日時、更新日時、タイムラインを表示。
- 未対応・対応中：権限のあるユーザーが件名・本文・顧客・受付経路を編集可能。
- 完了：原則読み取り専用。管理者または担当スタッフによって「対応中」に再開した後、編集・メモ追加を許可。
- 担当者変更は管理者のみ。問い合わせは物理削除しない。

### FR-05 ステータス遷移

- 通常フローは **未対応 → 対応中 → 完了**。
- **完了 → 対応中** の再開を許可する。
- 対応開始には担当者が設定されていること。
- 変更は管理者または担当スタッフのみ。変更前後の状態、操作者、日時をイベントとして自動記録する。

### FR-06 対応タイムライン

統合するイベント種別：

| 種別 | 記録内容 |
|---|---|
| 対応メモ | 本文、投稿者、日時 |
| ステータス変更 | 旧状態／新状態、操作者、日時 |
| 担当者変更 | 旧担当者／新担当者、操作者、日時 |

- 追記専用。履歴の編集・削除不可。
- 担当者の初回設定と解除も担当者変更イベントとして扱う。
- 問い合わせ更新と自動イベント追加は**同一の原子的な処理**として実施する。
- 詳細画面では時系列で閲覧可能。

### FR-07 顧客管理

- UUID、顧客名（必須）、メールアドレス／電話番号／備考（任意）、作成・更新日時。
- 両ロールで閲覧・登録・編集可能。
- 問い合わせ登録中に検索でき、新規登録ダイアログを経由して自動選択できる。

### FR-08 スタッフ管理

- UUID、氏名、メールアドレス、ロール、アカウント状態、作成日時。
- 管理者が氏名・メールアドレス・ロールを登録。**本人がパスワードを設定**する。
- 既存のgasboost認証・パスワード再設定機構を活用し、管理者が他人のパスワードを知る運用にしない。
- 管理者のみロール変更・アカウント無効化可能。履歴の参照整合性を維持する。
- 初期パスワード設定フローの具体的なAPI／メール配信は実装前に既存APIとの適合を確認する。

### FR-09 楽観的ロック・エラー

- 問い合わせに`version`を保持。更新時にクライアント保持値と最新値を比較する。
- 不一致時は競合として拒否。入力内容を保持したまま最新情報を再取得し、ユーザーが再編集・再保存できる。**自動マージしない**。
- 認可、状態検証、version照合、更新、イベント追加は適切な排他制御のもとで処理する。
- 再保存時も現在の認可とステータスを検証する。
- 入力不正、未認証、権限不足、対象なし、競合、サーバー障害を区別して表示する。
- エラーフィードバックは **`@gasboost/ui` の既存実装／レジストリを優先**し、重複した仕組みを自作しない。

## 5. 論理データモデル

| エンティティ | 主な属性 | 関連 |
|---|---|---|
| Customer | id, name, email?, phone?, note?, createdAt, updatedAt | 1対多 Inquiry |
| User | id, name, email, authorization, active, createdAt | 担当・履歴作成者 |
| Inquiry | id, subject, description, customerId, assigneeId?, channel, status, createdBy, receivedAt, updatedAt, version | 顧客・担当者を参照 |
| InquiryEvent（仮） | id, inquiryId, type, actorId, createdAt, payload | 1対多 Inquiry |

- イベント種別は`comment`、`statusChanged`、`assigneeChanged`を想定。
- Userと認証・認可テーブルは既存gasboostの定義を再利用し、二重のUser実体を作らない。
- 物理スキーマ、イベントpayloadの型、インデックスに相当する最適化などは設計工程で決める。

## 6. 非機能要件

### セキュリティ・整合性

- サーバー側認証・認可を必須とする。フロントガードのみに依存しない。
- 更新時に最新の権限、担当者、ステータス、versionを確認する。
- SheetORMのLockService・トランザクション機構を再利用する。
- 状態更新とイベント保存の整合性を守る。
- エラーUIで内部スタックトレースや秘密情報を開示しない。
- 公開データは架空の顧客・問い合わせ情報のみ。

### 実行環境

- GAS Webアプリ＋Google Sheets。PCブラウザを主対象とする。
- RTDBは使わず、必要に応じた再取得で最新状態を反映。
- 性能・最大データ件数・対応ブラウザの具体的数値は検証結果に応じてREADMEへ明記する。

### 開発環境

- TypeScript、React、Vite、Tailwind CSS v4、shadcn/uiとgasboost/ui。
- Vitest、React Testing Library、Playwright、GitHub Actions。
- ローカルGAS Fakeで開発とテストを実行可能。

## 7. アーキテクチャ要求

### 依存分離

1. **`gasboost/ui` の `src/shared`／`src/backend`／`src/frontend` を主要参照実装**とする。
2. sharedはZodスキーマ、テーブル定義、API契約、認可ポリシー、ルート定数など双方に必要な**純粋な定義**を配置。ReactコンポーネントやGAS固有処理を持たない。
3. backend内はDomain、Application、Infrastructure、Presentationに分ける。Domain／ApplicationはInfrastructureの具象実装に依存しない。
4. Repository契約はApplication側、SheetORMを使うRepository実装はInfrastructure側。実UseCase／実RepositoryをDIで組み立てる。
5. frontendはfeature単位で整理。AuthContext、RPC client、queryOptions、Guardなどの共通部分は適切に分離する。TanStack Queryを薄く包んだだけの独自hookを乱立させない。
6. gasboostのBootstrap、認証・認可、RPC、ORM、UIレジストリの既存機能を優先する。
7. 過度な抽象化・共通化を避け、各サンプルアプリは単独で読めるようにする。

### モノレポ内の配置案

```text
apps/
  inquiry-management/
    src/
      shared/
        tables.ts
        authorization.ts
        routes.ts
        schemas/
      backend/
        main.ts
        lib/               # db/auth/bootstrap/DI
        domain/
        application/
        infrastructure/
        presentation/
      frontend/
        main.tsx
        App.tsx
        lib/
        contexts/
        features/
          inquiries/
          customers/
          staff/
        components/
    tests/
      mocks/
      unit/
      integration/
      frontend/
      e2e/
    package.json
    README.md
    vite.config.ts
    vitest.config.ts
pnpm-workspace.yaml
```

名前や細分化は設計時に調整可。**責務と依存方向が優先**。モノレポ内にサンプル横断のアプリ固有共通パッケージを安易に導入しない。

### 主なgasboost利用箇所

| ライブラリ | 用途 |
|---|---|
| `@gasboost/app` | GAS API・Handler・Middleware |
| `@gasboost/client` | 型付きRPC |
| `@gasboost/sheetorm` | Sheets永続化、Query、ロック、トランザクション |
| gasboostの認証・認可 | ログイン、Policy、サーバー側認可 |
| `@gasboost/bootstrap` | effective userに基づく初期セットアップ |
| `@gasboost/ui` | 認証関連UI・Guard・エラー表示等 |
| `@gasboost/vite` | GAS／Reactビルド、ローカル開発 |
| `@gasboost/fake-core`、`@gasboost/fake-node`、sheetorm Fake | GAS組み込みサービスのIn-Memory代替 |

## 8. テスト要件

**中心はIn-Memory結合テスト**。ApplicationやRepositoryを都合よくモックしない。

| 層 | テスト方法 |
|---|---|
| Domain／純粋ロジック | 外部依存のない関数・業務ルール・状態遷移判定を単体テスト |
| Repository | **実Repository**＋InMemoryGateway／InMemoryDataStoreで結合テスト |
| Application | **実UseCase／Query＋DIされた実Repository**で結合テスト |
| Presentation | **実Handler／Middleware／バリデーション／Application**を通して結合テスト |
| Frontend | React Testing Library＋Vitest、実コンポーネント／Hooks／TanStack Queryで単体・結合テスト。通信境界は必要に応じて代替 |
| E2E | Playwright＋ローカルFake環境。最小限の代表シナリオのみ |

- `trip-management-system/tests/mocks` を参考に `runtime.ts`、`db.ts`、`auth.ts` 等をモジュール化し、Vitestの`setupFiles`に指定する。
- モック対象は原則としてGASの組み込みサービス／実外部環境との境界のみ。認証・認可やSheetDB自体は実装を使う。
- テストごとにデータ・セッションをリセットして独立させる。
- 重点ケース：CRUD、検索・ページング、担当者制御、状態遷移、無効ユーザー、履歴の原子性、競合拒否、401／403／404／409、フロントの入力保持。
- E2Eはログイン→顧客登録→問い合わせ登録→担当割当→対応メモ／状態変更→完了の主要フローを少数シナリオで検証。
- 実GAS動作は公開前に手動確認。CIの実GAS E2Eは不要。

## 9. 公開成果物

- 公開GitHubソースコード（架空データのみ）。
- アプリごとのREADME：前提、GAS／Sheets準備、初期セットアップ、ローカル起動、ビルド、デプロイ、テスト実行。
- 完成画面スクリーンショットと構成図。
- [Zenn第4回 Issue #6](https://github.com/tiger-oshima/zenn/issues/6) に対応する記事。完成形、データの流れ、gasboostの利用箇所、実機検証範囲・制約を説明。
- 第5回（ローカル開発）・第6回（SheetORM）からも同じアプリを参照可能にする。

## 10. 受入基準

1. 管理者／一般スタッフが正しく認証され、ロールと担当者に応じて操作制限される。
2. 顧客登録、問い合わせ登録、対応、完了、再開が動作する。
3. ステータス／担当者変更がタイムラインへ正しく自動記録される。
4. 完了時の編集制限と担当者認可をサーバー側で保証する。
5. version不一致時は更新拒否し、入力内容を保持して再編集できる。
6. Repository／Application／PresentationのIn-Memory結合テストが整備される。
7. React Testing Libraryで主要画面・フォーム・エラー処理を確認する。
8. ローカルPlaywrightで最小限のE2Eを通す。
9. 公開前に実GASへデプロイして主要フローを確認する。
10. READMEに従い第三者が自環境へデプロイできる。

## 11. 未決定事項（未承認の仕様を断定しない）

- 受付日時を手動で補正できるか。
- 未対応→完了等の直接遷移を許すか。
- 件名・本文など通常編集の変更履歴を残すか。
- 新規問い合わせ作成時の担当者選択UIの細部。
- versionの増分対象と、イベント単独追加に対する競合ポリシー。
- 初期パスワード設定・案内メールの具体APIと配信方法。
- `@gasboost/ui` の採用する具体的registry項目。
- 履歴の表示順・ページネーション、定量的性能目標、対応ブラウザ。

## 12. 参考実装

- [gasboost/ui](https://github.com/gasboost/ui) — shared/backend/frontend分離、Policy、Bootstrap、AuthContext、Guard、RPC
- [trip-management-system/tests/mocks](https://github.com/tiger-oshima/trip-management-system/tree/main/tests/mocks) — GAS FakeとVitest setupFiles
- [Zenn第4回 Issue #6](https://github.com/tiger-oshima/zenn/issues/6) — 記事要件
