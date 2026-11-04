# Priority Task Visual Hierarchy（2026-11-05）

## 目的
既存の「優先タスク」画面を、[design-deta/codebase-client-ui](https://github.com/mhinata2010-wq/design-deta/tree/main/codebase-client-ui) の業務UI原則（一覧性、境界線、情報密度）と、[field-ops-motion-template](https://github.com/mhinata2010-wq/design-deta/tree/feature/field-ops-motion-template) の状態表現（意味のあるアクセント色）に合わせて改善する。

## 変更対象
- `field-workspace.js`：`renderPriority()` の行に `data-priority-level` / `data-completed` / `data-attention` を付与し、重要度1・2には明示ラベルを表示する。
- `priority-visual-hierarchy.css`：画面限定の追加CSS。既存カードUIへの変更を避け、最優先112px、高92px、通常・低76pxの行サイズを設計（デスクトップ目安）。
- `index.html`：追加CSSの読み込みと変更済みJSのキャッシュ回避。

## UI判断
1. **最優先でない「一覧の1行目」を巨大化しない**。強調は順位ではなく `task.priority` による。
2. 重要度1は淡い青背景と4px左ボーダー。重要度2は淡い緑背景と3px左ボーダー。
3. 通常・低は白背景と薄い区切り線、進捗バーは既存の青系を利用。
4. 未完了・要確認・期限超過のKPIは基本は白いフラットなカード。**要確認と期限超過が0件のときは警告色を出さない**。
5. 要確認・期限超過がある通常/低タスクだけ、意味のある状態色（橙/赤）を補助表示。
6. 完了済み工程は重要度にかかわらず通常サイズ。大きな枠で強調し続けない。
7. 重たい影、立体的な装飾、王冠、全面グラデーションは使わない。
8. 既存の工程名編集への導線・重要度変更・上下移動・進捗+25%の操作を維持。進捗バーにARIA値を付与。
9. 1040px以下では右側アクションを行の下段へ移動。700px以下ではタップ領域を40px確保。

## 参照したデザイン
- [Codebase client UI](https://github.com/mhinata2010-wq/design-deta/tree/main/codebase-client-ui)：白い面、細い境界線、青いCTA、コンパクトな業務リスト。
- [FieldOps motion template](https://github.com/mhinata2010-wq/design-deta/tree/feature/field-ops-motion-template)：意味のある色分け、タッチUIへの配慮。
- [既存のBuilding Schedule](https://mhinata2010-wq.github.io/building-schedule/)：既存のサイドバー、タスク管理、KPI、工程表を維持。
- 公開製品のUX原則：Linearの密度と視覚ノイズ削減、Fieldwireの工程・担当・状態による一覧性。製品の画面・コードを複製していない。

## 検証結果（実施済み）
- [x] JavaScriptの全体構文チェック
- [x] CSSとJSの読み込みリンク、順序とキャッシュバージョン
- [x] CSSは `#priorityView` 内に限定
- [x] 5種類の模擬タスクからタスク行5件のHTMLを生成
- [x] 最優先が2行目でも重要度1と判断する
- [x] 要確認・期限超過の区別
- [x] 完了済みの重要度1は拡大しない
- [x] 既存の優先度変更・上下移動・進捗更新ボタンが残る
- [x] 進捗ARIA属性の存在

## 未実施・リスク
- [ ] GitHub PagesでのブラウザE2E
- [ ] スマホ実機（Safari / Chrome）での崩れ確認
- [ ] タスク名の長文、実データ100件、幅1024px付近の実表示確認
- [ ] アクセシビリティ監査（キーボード操作、スクリーンリーダー、色コントラスト）
- [ ] ドラッグ・保存・フィルター操作の回帰テスト

## 受け入れ条件
- 通常タスクが1行目であっても大きく強調されない。
- 重要度を最優先へ変更すると112pxの行と重要度ラベルが反映される。
- 優先度順・手動順位のいずれでも、視覚強調はその工程の重要度を追従する。
- 完了した工程は「完了も表示」で再表示しても強調されない。
- 要確認・期限超過の表示は数値と一致する。
- ガント・ネットワーク工程表、ほかのメニューには新CSSの影響がない。
