# Field workspace / 画面・操作の再設計 (2026-11-04)

## Goal
現場で使う建築工程管理の画面を「目的」で分け、各メニューから実操作できるようにする。閲覧と編集を混在させない。

## メニュー / 完成の定義

| メニュー | 目的 | 操作 |
|---|---|---|
| 今日の予定 | 今日の作業と次の工程を確認 | 今日の工程を優先順に閲覧、工程詳細を編集 |
| 工程を考える | 紙の工程表を触るように計画する | 横に引いて新規工程、バー移動、端を伸縮、順番変更、日/週/月、詳細編集 |
| ネットワーク工程表 | 工程間の依存関係を把握 | 同一工程データから生成、最長依存チェーンの可視化、ノードクリックで前工程を編集、循環入力を防止 |
| タスク管理 | 次にやる作業を順位順に管理 | 重要度4段階、期限・要確認を考慮した並べ替え、手動順位、進捗+25% |
| 現場・プロジェクト | 現場の基本情報を保存 | 名称、所在地、責任者、メモの編集と工程サマリー |
| 進捗・要確認 | 予定との差を図で判断 | 実績/予定のドーナツ、工程状態の積み上げ、工程ごとの横棒比較、要確認リスト |
| 帳票・印刷 | 必要な範囲の工程を共有 | 全工程/今日/14日、印刷・ブラウザPDF保存、CSV |
| 設定 | データを保全 | JSONバックアップ・インポート、サンプルリセット、ヘルプ |

## 主要な設計判断
- 1ページにすべて詰め込まない。今日見る画面と工程を考える画面を分ける
- 工程作成は「＋を押してフォーム入力」より、ガントの空白部分をマウス/指で横になぞって作る
- タスク管理のデフォルト並び: 未完了 → 要確認 → 優先度（最優先・高・通常・低） → 期限超過 → 終了予定日の早い順。手動順位も保存できる
- 進捗の「予定」は各工程の開始〜終了日を線形補間した参考値。「実績」はユーザーが入力した進捗率の単純平均。工数加重・予算加重ではない
- ネットワークの青枠は依存チェーンの作業日数合計が最長の経路。正式なCPM（クリティカルパス法）ではない
- 1現場のブラウザ保存型Prototype。サーバー、認証、共同編集、クラウド同期は未対応

## Reference UI
- [Linear / Display options](https://linear.app/docs/display-options): priority, custom sorting, grouping. Priority-based list adopts the ordering concept rather than the same interface
- [TeamGantt / Gantt View](https://support.teamgantt.com/article/143-gantt-view/): drag-to-plan, dependencies and schedule overview
- [TeamGantt / Task creation](https://support.teamgantt.com/article/98-my-preferences-dependencies/): manually drawing task bars as a planning interaction

## Implemented files
- `field-workspace.js`: navigation and pages, summary charts, task ordering, print/CSV, JSON backup, project settings
- `sketch-network.js`: pencil-style sketch tracks, interactive dependency graph with cycle prevention
- `field-workspace.css`: responsive layouts, progress diagrams, print styles
- `index.html`: new assets loaded after existing runtime to retain old Gantt controls

## Validation
- [x] JavaScript syntax parse: new Function(content)
- [x] New screens are wired into the existing main content
- [x] Navigation reuses the existing today/gantt/network handlers while converting former shortcut buttons into independent pages
- [x] Existing localStorage task schema remains compatible (extra priority field optional)
- [ ] Browser-based E2E click/drag/print testing on deployed GitHub Pages
- [ ] Mobile touch and drag verification on a real device

## Acceptance checklist for manual verification
1. 今日の予定で工程をクリックし詳細編集できる
2. 空白をドラッグして工程を作成し、バーを左右に移動、両端を伸縮できる
3. 進捗の25%更新が今日・タスク・進捗ページに反映される
4. タスク管理で優先度を変えると順位が再計算され、↑↓で手動順位を保存できる
5. ネットワークでノードをクリックすると前工程選択が表示され、循環を拒否する
6. 現場名を変更するとヘッダーと帳票に反映される
7. PDF印刷とCSV、JSONのバックアップ・読み込みが動作する
8. モバイル画面でサイドバーを開閉でき、横スクロールで長い工程を見られる
