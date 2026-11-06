# Building Schedule

建築現場で「工程表を見る」だけでなく、**今日の作業・要確認・進捗・次の工程をすぐ判断できる**ことを目指す工程管理プロダクトです。

`main` はProduction / GitHub PagesのSource of Truthです。新機能はFeature Branchで検証し、Release PRを通してmainへ統合します。

## Product value
- プロジェクト一覧から現場を選び、Field Command Centerで今日の工程を確認
- ガント上で工程を直接作成・移動・伸縮・並べ替え
- 工程名・開始日・終了日・前工程を編集
- 同じTaskデータからネットワーク工程表を自動生成
- 工程ごとの担当・状態・進捗率を管理
- 遅延や要確認をAttention Queueへ集約
- 14日Lookaheadで直近の段取りを確認
- スマホからワンタップで進捗更新
- オフライン時も端末保存状態を明示

## UX principle
`TODAY -> ATTENTION -> PROGRESS -> LOOKAHEAD -> SCHEDULE`

現場では、最初から巨大な工程表を読ませません。まず今日必要な判断を出し、必要なときだけガントやネットワーク工程へ深掘りします。

## Repository policy
- `main`: 公開用の安定版のみ
- デザイン模倣・参考UI・Visual experiment: `mhinata2010-wq/design-deta`
- GitHub共通規定: `mhinata2010-wq/rules-github`
- 新機能はFeature Branch + Pull Requestで検証後にmainへ統合
- Branch名は機能が名前だけで分かるようにする
- Pull Request Descriptionは `Summary / Changes / Testing / Notes` を必須とする

## Field-first v2 branches
- `feature/today-field-command-center`
- `feature/attention-progress-status`
- `feature/two-week-lookahead`
- `feature/mobile-quick-progress-update`
- `feature/offline-field-state-indicator`
- `release/field-first-v2`

## Next
次フェーズは、LocalStorage中心のPrototypeから、認証・Realtime DB・複数人共同編集・写真/日報を持つ実運用基盤へ移行します。

## プロジェクト一覧と下部ナビ

- 起動時にプロジェクト一覧を表示。新規作成、現場情報の編集、現場ごとの工程や進捗の切り替えが可能。
- 主要画面への横タブは画面下部に固定。スマートフォンでは横にスワイプして残りのタブを表示。
- 既存の端末データは最初のプロジェクトに引き継ぎ、新規プロジェクトは空の工程表から開始。
- 今日の工程、進行中、次工程を動的に表示。
- 工程表、前後関係、進捗更新、要確認、印刷に既存データからアクセス。
- 新機能の設計と検証範囲: [docs/SIDEBAR_DASHBOARD.md](docs/SIDEBAR_DASHBOARD.md)

## Field workspace (2026-11-04)
- **今日の予定**: 優先順の当日作業と次の工程
- **工程を考える**: 空白をドラッグしてバーを描く、日程/期間/並びを直接編集
- **ネットワーク工程表**: 依存関係の自動図解、ノードから前工程を編集
- **タスク管理**: 優先度順・手動順位、進捗更新
- **進捗・要確認**: 実績と予定の図解、工程別比較、対応事項
- **プロジェクト**: 一覧、新規作成、現場情報と工程のプロジェクト別ローカル保存
- **帳票・印刷**: 全工程/本日/14日、印刷、CSV
- **設定**: JSONエクスポート・インポート
- 詳細・検証項目: [docs/FIELD_WORKSPACE_V1.md](docs/FIELD_WORKSPACE_V1.md)

**データ保管**: 現在はブラウザのLocalStorage。正式な共同編集・クラウドバックアップは未実装です。
