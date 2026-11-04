# Sidebar dashboard redesign (2026-11-04)

## Goal
横並びの画面タブを、左側で常に位置を把握できるサイドバーナビゲーションに変更する。現場の担当者は「今日」を先に確認し、必要なときだけ工程編集・ネットワークへ移る。

## UI references and decisions
- User-provided Building Schedule sidebar mockup: dark-forest sidebar, structured hero, three KPI cards, Today/Next split, and clear empty states. Applied as the principal design direction, without relying on a screenshot as runtime markup.
- [Linear interface redesign](https://linear.app/now/how-we-redesigned-the-linear-ui): low-noise persistent navigation, clearer hierarchy and consistent header; selected to reduce repeated navigation overhead.
- [Fieldwire dashboard](https://help.fieldwire.com/hc/en-us/articles/39803227568273-The-Dashboard-Module): visibility of work and action-driven project views; applied to Today and upcoming tasks, not copied.

## Implementation
- `index.html`: sidebar shell, field-first dashboard cards, responsive menu, embedded SVG symbol set and help dialog.
- `sidebar-dashboard.css`: standalone overrides for the existing styles, desktop/mobile layouts, empty states, print and reduced-motion support.
- `sidebar-dashboard.js`: existing view switch integration, live task counters, quick progress sheet, attention board navigation, print, confirmation when restoring sample data.

## Compatibility and limitations
- Existing `app.js` and `field-runtime.js` stay unchanged. Gantt manipulation, task inspector, network generation, task progress updates, LocalStorage keys and task data are preserved.
- All secondary menu actions map to an existing working screen/action. No fake cloud sharing, auth or multi-site settings are added.
- `進行中の工程` counts tasks with status `in-progress` or partial progress (excluding blocked/done). `次に始まる工程` counts future tasks.
- Project name is fixed in this prototype. Browser-local persistence is not cloud sync.
- Desktop hero construction drawing is a lightweight embedded vector, not an external network image.
- Date-specific analysis is currently for the local *today* date; the day/week/month shortcuts open the Gantt at that zoom level.

## Validation checklist
- [x] JavaScript syntax parse / `node --check`
- [x] Existing DOM ids required by `app.js` present
- [x] Referenced CSS/JS files exist on feature branch
- [x] `hidden` state explicitly supported for view switch
- [ ] Browser E2E interactions on deployed Pages (manual regression required)
- [ ] Mobile real-device usability check
