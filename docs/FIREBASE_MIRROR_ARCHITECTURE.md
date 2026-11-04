# Firebase / Cloud Firestoreへの複製（設計・実装準備）

## ステータス（2026-11-05）
- **GitHub上にコードとルールを保存済み**
- **Firestoreへの実書き込みは未実施**
- Supabase側も接続済みプロジェクトが存在せず、公開サイトは現在の端末保存のまま
- Firebaseプロジェクト・認証情報・サービス実行環境は未接続
- 自動ミラーのデプロイ、課金許可、本番切り替えは実行していない

## なぜブラウザから2つのDBに直接書かないか
SupabaseとFirestoreへそれぞれ直接writeすると、片方だけ成功した場合に保存状態が矛盾しやすい。**SupabaseをSource of Truth、Firestoreを災害対策用の複製**として扱う。

```text
Building Schedule (login)
        |
        v
Supabase Auth + Postgres (canonical, revision)
        |
        +-- same transaction --> private.schedule_mirror_outbox
                                      |
                                      v
                          trusted server worker (retry)
                                      |
                                      v
                          Firebase Admin SDK
                                      |
                                      v
                   Cloud Firestore /schedule_mirrors/{supabase_user_id}
```

- Firestoreに保存する `revision` はSupabaseの値と同じ。古いイベントが遅れて到着しても既存の新しい版を上書きしない。
- Firebaseの障害時はOutbox行の `mirrored_at` を空のまま保持し、定期実行ジョブで後から再試行する。
- 保存先を「Firebaseも成功」と表示できるのはOutboxが処理済みになり、その版が確認できた後。
- Firebaseはバックアップであり、ブラウザのFirestore SDKから直接参照・編集しない。Firestore Security Rulesは全クライアントの読み書きを拒否する。
- `supabase_user_id` とFirebase AuthenticationのUIDを同一視しない。複製はAdmin SDKのバックエンドだけが扱う。

## 今回の追加ファイル
- `database/firebase-outbox.sql`：DB更新時のイベント記録トリガー、旧データのバックフィル
- `firebase/firestore.rules`：バックアップ用コレクションへのブラウザアクセスを全拒否
- `cloud/firebase-mirror/mirror-core.mjs`：トランザクションとRevisionによる複製ロジック
- `cloud/firebase-mirror/worker.mjs`：Node 20+のサーバー側実行エントリーポイント
- `cloud/firebase-mirror/package.json`：固定したAdmin SDK / PostgreSQLドライバの依存関係
- `cloud/firebase-mirror/test.mjs`：正常保存、古いRevision、障害、空キュー、巨大データのテスト

## 設定とデプロイ手順（実施前のチェック）
1. FirebaseプロジェクトとCloud Firestore（Standard）の有無、地域、請求プランを確認する。**課金され得るプロジェクト作成やBlaze移行は費用承認後に実施**。
2. 権限を限定したバックエンド実行環境を用意する。Google Cloud上ならApplication Default Credentials、他の環境なら安全なサービスアカウント認証を利用。
3. 既存Firestoreを共有している場合、`firebase/firestore.rules` の全拒否ルールをそのままデプロイしない。**他アプリのアクセスまで拒否する可能性がある**。専用プロジェクトでの適用を優先する。
4. Supabase `database/schema.sql` を適用してRLSを検証し、続けて `database/firebase-outbox.sql` を適用。Security Definerトリガーの権限・`private` schemaの非公開設定をレビューする。
5. `DATABASE_URL`、`FIREBASE_PROJECT_ID`、Application Default Credentialsを**サーバー環境**にだけ設定。GitHub Pages、JavaScriptバンドル、ログ、Issueへ秘密を含めない。
6. ワーカー用ディレクトリで依存関係をインストールし、lockfileを生成してコミットしてから本番では`npm ci`を使う。Node 20+で`npm test`実行。
7. ジョブとして `node worker.mjs` を定期実行し、未処理件数・エラー・複製遅延を監視。ワーカーは1回につき最大100イベントを処理する。
8. 通常保存、同時編集、Firebase一時停止、再試行、二重送信、両DB一致、他ユーザーアクセス拒否、サインアウト・アカウント削除をE2E検証。
9. **削除連携・データ保持ポリシーを実装してから本番導入**。現行のOutboxはinsert/update対応で、削除イベントの伝播はまだない。ユーザー削除後のバックアップ残存を許容したまま公開しない。

## スケーラビリティの制約
Firestore Standardのドキュメント最大サイズは1MiB。現行の`document`丸ごと複製は大きな案件に不向きなため、workerには750KiBガードがある。超過時は通知・構造変更が必要であり、黙って破棄しない。工数が増えればタスク単位ドキュメントや別のアーカイブ形式への分割を検討。

## エラー時のルール
- Supabaseの保存が成功したがFirebaseが未同期：ユーザーには「DB保存済み・バックアップ同期中」と表示する。Firebaseも保存されたとは主張しない。
- Firebaseの古いRevisionイベント：新しいRevisionを上書きせず、イベントを処理済みにする。
- Firebaseの応答失敗：Outboxは残し、次回ジョブで再送する。
- 端末LocalStorage→Supabaseの移行：ユーザー確認＋DB読み戻しで検証するまで元データを削除しない。

## 未実装
- Firebaseプロジェクト作成・Firestore実デプロイ・認証設定
- 定期Workerサービスのホスティング・スケジューラー
- Firebase複製の状態を表示するUI
- 削除イベント伝播と復旧手順
- Firestore実プロジェクトでの権限/書き込み/読み戻しテスト
- `app.js` / `field-workspace.js` の本番保存先切り替え

## 参考公式ドキュメント
- https://firebase.google.com/docs/admin/setup
- https://firebase.google.com/docs/firestore/manage-data/transactions
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://firebase.google.com/docs/firestore/quotas
- https://supabase.com/docs/guides/database/postgres/row-level-security
