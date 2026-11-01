# Interaction runtime fix

## Problem
Field-first v2 added multiple scripts that each wrapped shared global functions such as `render()` and `syncInspector()`. The public page therefore depended on script load order and could lose interaction handlers after rerender.

## Fix
- Keep the existing `app.js` Gantt engine.
- Replace chained feature scripts with one `field-runtime.js` integration layer.
- Centralize Today, Attention, Lookahead, status/progress, quick update, view switching and offline state.
- Keep the existing LocalStorage key and Task data compatible.

## Acceptance criteria
- Today / 工程を考える / 前後関係を見る switch correctly.
- Gantt bars can move and resize.
- Empty timeline drag creates a task.
- Rows can be reordered.
- Inspector edits persist.
- Progress/status/assignee edits persist.
- Quick progress updates persist.
- Network view redraws from the same Task data.
