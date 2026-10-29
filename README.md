# building-schedule

建設現場向けの工程表プロトタイプです。

## Client requirements

クライアントからの要望を、次の操作フローとして実装します。

1. 工程表上で空いている日付を横にドラッグし、手書き感覚でバーを作成
2. バーに工程名・開始日・終了日・前工程を入力
3. 同じ工程データからネットワーク工程表を自動生成
4. 工程バーを再編集するとネットワーク側にも反映

## Current prototype

- Direct Gantt bar creation
- Task editing
- Predecessor relationships
- Automatic network schedule generation
- Browser localStorage persistence
- Responsive UI
- GitHub Pages deployment workflow

## Architecture

`tasks` をSingle Source of Truthとして扱い、ガント工程表とネットワーク工程表が別々の工程データを持たない構成です。

## Next

現段階はクライアント要件を検証する操作プロトタイプです。本番運用では共同編集、権限管理、履歴、Supabase同期などを段階的に接続します。
