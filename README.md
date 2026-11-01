# Building Schedule

建築現場で「工程表を見る」だけでなく、**今日の作業・要確認・進捗・次の工程をすぐ判断できる**ことを目指す工程管理プロダクトです。

`main` はProduction / GitHub PagesのSource of Truthです。新機能はFeature Branchで検証し、Release PRを通してmainへ統合します。

## Product value
- 今日の工程を最初に表示するField Command Center
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