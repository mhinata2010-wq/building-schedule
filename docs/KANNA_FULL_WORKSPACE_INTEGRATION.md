# KANNA公開UIの設計原則をBuilding Schedule全画面へ統合

日付：2026-11-05

## 目的
デザイン参考（[design-deta / FIELDGRID](https://github.com/mhinata2010-wq/design-deta/tree/feature/kanna-inspired-marketing-template/kanna-inspired-marketing-template)）で整理した、施工管理SaaSに向いた情報設計、余白、配色、ナビゲーションを現行のBuilding Scheduleへ統合する。

**重要:** 他社のページをピクセル単位で複製したり、KANNAのロゴ・写真・コピー・第三者商用コードを転用することはしない。「自社のUIに適用できるパターン」を抽出した独立デザインである。

## 実装アーキテクチャ
- **既存基盤**: \`app.js\`, \`field-runtime.js\`, \`schedule-dependencies.js\`, \`sketch-network.js\`, \`field-workspace.js\`, \`sidebar-dashboard.js\` と各CSSを維持
- **優先タスク**: PR #29の優先度別カード強調・進捗ARIAラベル・確認ステータスを取り込んだブランチから作業
- **追加CSS**: \`kanna-workspace.css\` を最後に読み込む。セマンティックなトークン・白いナビ・緑の階層表現・オレンジの「工程を追加」・コンパクトな案件サマリー・モバイルをまとめる
- **追加JS**: \`kanna-workspace.js\` は**読み取り専用の表示層**。既存の\`tasks\`やプロジェクト名から情報を計算する。新しいDB操作や工程更新を実装しない
- **最小の既存JS変更**: \`renderPages()\` の末尾で \`building-schedule:render\` イベントを通知し、表示層だけ更新する
- **既存HTML変更**: 追加CSS / JSの読み込みとテーマカラーだけ。既存DOMの主要IDを削除しない
- **テスト**: \`tests/kanna-full-workspace.test.mjs\` + GitHub Actions

## 変更したデザインパターン

| KANNA公開LPを参考にした抽象原則 | Building Schedule内の独自実装 | 却下したもの |
| --- | --- | --- |
| ブランドグリーンと強いCTAの分離 | 緑を基調に、工程追加だけを暖色のアクションボタンに | LPのオレンジボタンを全操作に適用 |
| ナビ・ページの位置情報 | 白いサイドバー、緑の選択状態、コンパクトなPROJECTヘッダー | 長いLPナビと業務ナビの混同 |
| サービス概要の視認性 | TODAY上部に案件名、全工程、未完了、実績進捗、要確認を集約 | 巨大なマーケティング用ヒーロー |
| 機能ごとのカード整理 | 既存の工程表・ネットワーク・タスク管理・帳票を維持し、共通カードトークンを追加 | 新しい架空機能カード |
| モーションの抑制 | Hover/Pressを短く、Reduced Motionへの対応 | 過剰な画面移動・複雑なグラデーション |
| ブランドへの信頼性 | 機能が実装されていない共有は「準備中」と明記 | 未接続のFirebase/QRを「同期済み」と表示 |

## 保持する既存機能（回帰防止）

- 今日：今日の工程 / 次に始まる工程 / 要確認 / Lookahead
- 工程を考える：工程の追加・ドラッグ作成・並び順変更・バー移動・伸縮・削除・日程保存
- 後続工程：依存関係による再計算提案 / 変更確認 / キャンセル時の復元
- ネットワーク工程表：前後関係のグラフ表示 / 拡大縮小
- タスク管理：優先度順・手動順位・進捗+25%・優先度変更・完了表示
- 進捗：実績vs予定・DELTA・工程ごとの比較・注意事項
- 現場情報：名称・所在地・責任者・メモ
- 帳票：全工程 / 今日 / 今後14日 / 印刷(PDF) / CSV書き出し
- 設定：JSONエクスポート/インポート・サンプル復元・ヘルプ
- オフライン：端末に保存したデータを既存の仕組みで保持

## 未実装（デザインでは解決しない）
- Supabase実DBへの接続、Auth/RLS、複数端末の同期
- Firebase Cloud Firestoreへの実データ複製
- 閲覧専用QR共有URL、期限、共有停止、既読確認
- 協力会社・施主のロール別アクセス権限
- Excel XLSXの取り込み、A3印刷に合わせた完全なページ分割
- Safari / Chrome実ブラウザ、実機、スクリーンリーダーでのE2E検証

これらはPR #30など別の設計・インフラ作業で進める。**QRコードを単に公開サイトURLへ向けても端末内の工程データは共有できない**ので、現時点で実装済みとは表示しない。

## レビュー / リリース判定
1. CIで既存ID・JSモジュール・画面切替・タスク更新属性・CSSリンクが残ることを検査
2. デスクトップ（1366px・1024px）・モバイル（390px・360px）でスクリーンショット比較
3. 主要操作：ドラッグ作成、依存関係の確認とキャンセル、工程削除、日程変更、ネットワーク拡大、進捗更新、印刷、JSONインポートをE2E検証
4. プロジェクト名と進捗を更新し、TODAY上部のサマリーが追従することを確認
5. 他画面やスマホの固定UIが崩れないことを確認
6. 実機検証前には本番mainへ自動マージしない

## 参照サイト / 詳細
- [KANNAの公開マーケティングLP](https://lp.kanna4u.com/)
- [アルダグラム公式](https://aldagram.com/service/)
- [design-deta / KANNA-inspired LPの実装・比較](https://github.com/mhinata2010-wq/design-deta/blob/feature/kanna-inspired-marketing-template/kanna-inspired-marketing-template/DESIGN_AUDIT.md)
- [Building Schedule PR #29 / 優先タスク](https://github.com/mhinata2010-wq/building-schedule/pull/29)
- [Building Schedule PR #30 / クラウドDB + Firebase（Draft）](https://github.com/mhinata2010-wq/building-schedule/pull/30)
