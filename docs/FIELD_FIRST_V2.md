# Field-first v2

## Goal
工程表そのものを主役にせず、現場監督・職長が「今日何を確認し、何を更新し、次に何が始まるか」を短時間で判断できるUIへ進化させる。

## Research signals
- Fieldwire: Task / Calendar / Gantt を日々の実行に接続し、Lookahead運用を支援
- ANDPAD: 工程・写真・報告・資料を現場情報として一元化
- Planflow: 現場からScheduleを更新し、RoadblockをTaskに接続
- 現場向けモバイル製品全般: Today、Attention、Progress、Offlineを優先

参考URL:
- https://help.fieldwire.com/hc/en-us/articles/360020745252-How-to-use-Fieldwire-for-Scheduling
- https://andpad.jp/products/construction_management
- https://planflow.io/

## Core UX
1. Today: 今日の工程と次工程を最初に表示
2. Attention: 遅延・要確認を自動で集約
3. Progress: 工程単位で担当・状態・進捗率を保持
4. Lookahead: 14日以内の工程だけを抜き出して段取り確認
5. Schedule: 必要な場合にGantt / Networkへ深掘り

## Branch map
### feature/today-field-command-center
- TodayをTop-level viewへ追加
- 今日の工程 / 次工程をSchedule dataから派生

### feature/attention-progress-status
- Taskにprogress / status / assigneeを追加
- Attention Queueを追加

### feature/two-week-lookahead
- 14日Lookaheadを追加

### feature/mobile-quick-progress-update
- スマホ向けワンタップ進捗更新
- 0 / 25 / 50 / 75 / 100%
- 要確認への即時変更

### feature/offline-field-state-indicator
- navigator.onLineを用いた接続状態表示
- LocalStorageへの端末保存を明示

### release/field-first-v2
- 上記Featureを統合
- README / VERSION / Product directionを更新

## Non-goals
- 自動で正式工程を確定しない
- AIに工程判断を丸投げしない
- Reference UIの模倣をProductionへ持ち込まない
- Backend未接続の状態で「クラウド同期済み」と表示しない

## Next phase
- Auth
- Realtime DB
- Organization / Site / Member権限
- 写真・日報・コメントをTaskへ紐付け
- 遅延の後続影響計算
- 現場監督5人以上でContextual Inquiry / usability test
