# Building Schedule

公開用の建築工程管理プロトタイプです。`main` をProduction / GitHub PagesのSource of Truthとして扱います。

## Product value
- ガント上で工程を直接作成
- 工程名・開始日・終了日・前工程を編集
- 同じTaskデータからネットワーク工程表を自動生成
- ブラウザ内に工程状態を保存

## Repository policy
- `main`: 公開用の安定版のみ
- デザイン模倣・参考UI・Visual experiment: `mhinata2010-wq/design-deta`
- 新機能はFeature Branch + Pull Requestで検証後にmainへ統合
- Pull Request Descriptionは必ず `Summary / Changes / Testing / Notes` を記載

## Current status
Public Final v1。今後は独自のOperational UI、実データ同期、共同編集を段階的に追加します。
