# クラウドDB移行計画（Supabase）

## 現状
2026-11-05時点で接続済みSupabaseアカウントには利用できるProjectが存在しません。このブランチのSQLとリポジトリコードは**未デプロイ**です。これをマージしただけでは保存先は変わりません。

## 目的
`building-schedule` の工程表を端末LocalStorageではなく、認証付きPostgres DBに保存する。PC・スマホを横断して同じユーザーの工程表を読み書きできることを第一段階とする。

## 初期MVPの構成
- Supabase Auth：サインイン済みユーザーの識別。公開ブラウザにはpublishable keyのみ使用し、service_roleは埋め込まない。
- `public.user_schedules`：1ユーザー1工程表のJSONBドキュメント（`tasks/project/ranks`）とrevisionを保存。
- RLS：`auth.uid() = user_id`で他人のデータ閲覧・編集を拒否。
- `save_my_schedule()`：revision一致時だけ更新して変更を確定。衝突時は上書きせずエラー。
- `cloud/cloud-schedule-repository.js`：DBロード・初期化・保存・明示的な端末データ移行・DB読み戻し検証。
- JSONエクスポート：障害時のバックアップとして残す。

## 重要：まだ接続していない
DBプロジェクトのURLとpublishable key、Authの設定、デプロイ済みDBテーブル、ブラウザからのRLS実機試験が揃うまでは、既存のLocalStorage操作を切り替えない。接続なしで「保存済み」と表示することは禁止。

## 移行ステップ
1. Supabase Project作成時の費用を確認し、ユーザーの承認を取る。料金が発生する可能性のあるProject作成は無断で実行しない。
2. Supabase Authの許可URLにGitHub Pagesの正確なorigin / redirect URLを設定。
3. `database/schema.sql` をプロジェクトへ適用し、セキュリティアドバイザーとRLSテストを実施。
4. ブラウザ向けSupabase Client SDKをバージョン固定して組み込み、`cloud/cloud-schedule-repository.js` を利用する。
5. 各画面のLocalStorage読み書き（`app.js` / `field-workspace.js` など）をDB保存に接続する。この段階でデータモデルを `tasks/project/ranks` に統一し、状態表示を「DB保存済み/保存中/未保存/競合」に変更。
6. 初回移行時に、端末の既存工程数とクラウドの工程数を表示し、ユーザーの明示的な確認後にアップロード。
7. 保存後にサーバーから再取得して一致検証。元のLocalStorageおよびJSONバックアップは移行完了まで削除しない。
8. 別ユーザーでの取得拒否、ブラウザ2タブ競合、異なる端末での同期、ネットワーク障害・再送、サインアウト時の画面消去をE2E確認。
9. 検証後にFeature Branchを公開に反映。

## なぜ同期を即実装しないか
既存の `persist()` はLocalStorageへの同期書き込みを前提としており、単純に非同期fetchへ差し替えると保存処理が競合する。変更操作・サンプル初期化・JSONインポートなど複数の書き込み経路がある。これらは認証・Revision・衝突解決を含む統合テストが必要。

## スコープ
最初は個人ユーザーの複数端末同期を実現する。現場監督・協力会社・施主の複数ユーザー共同編集は、招待と現場ごとの権限、変更履歴のスキーマを設計した次段階で追加する。認証付きDB保存と共同編集は別機能。

## 受け入れ条件
- 同一ユーザーで端末Aの更新が端末Bから再取得できる
- 他人のJWTでの工程閲覧・更新が拒否される
- Revisionが違うタブからの更新で上書きが発生しない
- 端末データの移行は明示的な許可なく実行されない
- サーバー障害時に「保存済み」と誤表示せず、データを消さない
- 既存の工程作成・移動・削除・依存関係の機能が壊れていない

参考： https://supabase.com/docs/guides/database/postgres/row-level-security 、 https://supabase.com/docs/reference/javascript/auth-signinwithotp
