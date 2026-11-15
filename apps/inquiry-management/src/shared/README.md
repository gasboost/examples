# Shared の実装契約

[Issue #2](https://github.com/gasboost/examples/issues/2) の共有定義です。Repository、UseCase、Handler、業務画面は後続 Issue で実装します。React / GAS Runtime の実行コードには依存しません。

- `tables.ts`: 既存の認証・認可テーブルと `Customer` / `Inquiry` / `InquiryEvent`。すべて `backend/lib/sheets.ts` の `sheetTables` に明示登録しています。独自 User / Staff テーブルはありません。
- `schemas/records.ts`: 保存レコードとイベント payload。ID は UUID、未割当は `null`、日時は保存・RPC とも UTC ISO 8601 文字列です。状態・受付経路の値は要件定義どおり日本語です。イベントの `type` と `payload.type` は一致を検証します。
- `schemas/contracts.ts`: 入出力契約。入力の未知フィールドは拒否します。編集は編集可能項目の全体を送信します。顧客の任意項目を省略した場合は未設定を表します。ID・日時・登録者・操作者はサーバーで設定します。問い合わせ更新系はすべて現在の `version` が必要です。
- `policy.ts`: Bootstrap 既定の「管理者」と「一般スタッフ」に `AuthorizationPolicy.linkRole` で権限を付与します。両ロールに顧客操作・問い合わせ閲覧／登録／編集／状態変更／メモ追加を付与し、担当変更とスタッフ登録／ロール変更／無効化は管理者のみです。既存の `authorization.resolve()` → セッション `permissions` → Guard の契約を維持します。
- `rls.ts`: 3 業務テーブルの AST。Customer は select / insert / update、Inquiry は select / insert と管理者・現在担当者の update、InquiryEvent は select と対象問い合わせの管理者・現在担当者による insert を許可します。イベントの `actorId` も Principal と照合します。削除とイベント更新の Policy は未定義で deny です。認証・認可内部テーブルには業務用 RLS を設定しません。
- `routes.ts`: Registry の認証・Bootstrap ルートを保持し、`customers` / `inquiries` / `staff` の入口を追加しています。

検索は状態複数選択・担当者全員／自分／指定スタッフ／未割当・受付経路・キーワード・1 始まりのページ・20 件固定・受付日時／更新日時の昇降順を表します。担当条件の省略はサーバーでロール別初期条件（管理者は全員、スタッフは自分）に解決します。`me` は認証主体から解決し、指定スタッフの `userId` は検索対象としてだけ使用します。初期ソートは更新日時降順です。件数・検索・ページングはサーバーの責務です。状態別件数の集計条件は後続 UseCase で定義します。

## Issue #3: SheetDB への必須接続

**現状の本番 `backend/lib/db.ts` は業務 RLS 未接続です。AST の追加だけでは保護されません。** [Issue #3](https://github.com/gasboost/examples/issues/3) で以下を実装し、業務 API 公開前に結合テストを必須とします。

1. SheetDB の `rowLevelSecurity` に本ディレクトリの `rowLevelSecurity` を渡します。Realtime / RTDB は不要です。
2. [Issue #4](https://github.com/gasboost/examples/issues/4) のサーバー側認証済み Context と最新の認可情報から `principalSchema` の `userId` / `role` を作り、DB アクセス前に `setPrincipal()` します。リクエスト本文やフロントの role / userId から本人を決めません。Schema の parse は認証ではありません。
3. 各リクエストの成功・失敗時に Principal をクリアし、次の利用者に前の Principal が残らないようにします。認証失敗・無効化ユーザー・対象外ロールは業務 DB に到達させません。`allow()` は無条件許可なので、未認証アクセスを防ぐ責任はサーバーにあります。
4. 更新前 `using` と更新後 `check`、他担当・未割当の拒否、担当変更直後の旧担当失効／新担当許可、イベントの対象 Inquiry と actor の照合、禁止操作、例外後・連続リクエスト間の Principal クリアを実 SheetDB + InMemoryGateway で検証します。`tests/shared/rls.test.ts` は AST の評価例であり、本番の接続完了を保証しません。
5. 認証・認可 Service と Bootstrap が従来どおり動くことも検証します。業務用 RLS を認証内部テーブルへ流用しません。

ライブラリでは「RLS 定義なし＝無制限」「定義あり・操作 Policy なし＝deny」「`allow()`＝明示的無条件許可」です。

## 後続 Application / Presentation の責務

サーバーで Policy と RLS の両方を検査します。RLS の担当者判定だけでは操作種別の認可は完結しません。登録時の担当指定、担当者変更・解除と `assigneeChanged` イベントは管理者の操作権限が必要です。問い合わせの初期状態・日時・登録者、イベントの actor・変更前後、最新 version、担当者・顧客の存在、完了時の編集制限、状態遷移をサーバーの最新データで検証・生成します。問い合わせ更新とイベント自動追加は同一の原子的処理にします。

受付日時補正、特殊な状態遷移、通常編集の履歴、version 増分対象・イベント単独追加時の競合、登録時の初期イベント、履歴の順序・ページングはこの契約では確定していません。`SheetTable.versionColumn` の接続と更新処理も後続で扱います。共有入力に `version` があることだけで競合検出が実装済みにはなりません。
