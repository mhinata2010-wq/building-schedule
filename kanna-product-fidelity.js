/* KANNA-like PRODUCT shell enhancement for Building Schedule.
 * Separate from the brand/marketing study and editing engine.
 * Works with existing page routes and delegates all edits to the original app.
 */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const screenNames = {
    today:'今日の予定',gantt:'工程表',network:'ネットワーク工程表',
    priority:'タスク管理',projects:'現場・プロジェクト',progress:'進捗・要確認',
    reports:'帳票・印刷',settings:'設定'
  };

  // Icon rail must retain understandable labels for keyboard and touch users.
  document.querySelectorAll('.app-sidebar .sidebar-nav button').forEach(button => {
    const text = button.textContent.replace(/\s*›\s*$/, '').trim();
    if (text) {
      button.dataset.navLabel = text;
      button.setAttribute('title', text);
      button.setAttribute('aria-label', text);
    }
  });

  const main = $('#mainContent');
  const parent = main?.parentElement;
  const breadcrumbs = document.createElement('nav');
  breadcrumbs.className = 'bs-breadcrumbs';
  breadcrumbs.setAttribute('aria-label', '現在のページ');
  const root = document.createElement('span');
  root.textContent = '現場';
  const arrow = document.createElement('span');
  arrow.className = 'bs-crumb-sep';
  arrow.textContent = '›';
  arrow.setAttribute('aria-hidden', 'true');
  const current = document.createElement('strong');
  breadcrumbs.append(root, arrow, current);
  if (main && parent) parent.insertBefore(breadcrumbs, main);
  const refreshBreadcrumb = () => {
    const route = document.body.dataset.currentView || 'today';
    current.textContent = screenNames[route] || screenNames.today;
    breadcrumbs.dataset.route = route;
  };
  refreshBreadcrumb();
  new MutationObserver(refreshBreadcrumb).observe(document.body, {
    attributes: true,
    attributeFilter: ['data-current-view']
  });

  // The dashboard in KANNA presents an information-dense report table.
  // Reuse values already rendered by the original app, never fabricate data.
  function renderProjectDataTable() {
    const view = $('#progressView');
    if (!view) return;
    view.querySelector('#bsProgressSummary')?.remove();

    const existingPanel = view.querySelector('.ws-progress-layout');
    if (!existingPanel) return;
    const data = (() => {
      try { return typeof tasks !== 'undefined' && Array.isArray(tasks) ? tasks : []; }
      catch { return []; }
    })();
    const complete = data.filter(t => Number(t.progress) >= 100).length;
    const blocked = data.filter(t => Number(t.progress) < 100 && t.status === 'blocked').length;
    const today = new Date();
    const iso = [today.getFullYear(), String(today.getMonth() + 1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-');
    const overdue = data.filter(t => Number(t.progress) < 100 && t.end < iso).length;
    const plannedRing = view.querySelector('.ws-ring svg[aria-label^="予定進捗"]');
    const actualRing = view.querySelector('.ws-ring svg[aria-label^="実績進捗"]');
    const planned = plannedRing?.getAttribute('aria-label')?.replace('予定進捗','').trim() || '未計算';
    const actual = actualRing?.getAttribute('aria-label')?.replace('実績進捗','').trim() || '未計算';
    const delta = view.querySelector('.ws-gap strong')?.textContent?.trim() || '未計算';

    const section = document.createElement('section');
    section.className = 'bs-progress-data ws-panel';
    section.id = 'bsProgressSummary';
    section.setAttribute('aria-label', '工程のダッシュボード');
    const title = document.createElement('h2');
    title.textContent = '工程ダッシュボード';
    const table = document.createElement('table');
    table.className = 'bs-progress-table';
    const caption = document.createElement('caption');
    caption.textContent = '現在の工程データから計算した進捗情報';
    caption.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
    const body = document.createElement('tbody');
    const rows = [
      ['登録工程数', String(data.length) + '件'],
      ['未完了工程数', String(data.length - complete) + '件'],
      ['要確認工程数', String(blocked) + '件'],
      ['期限超過工程数', String(overdue) + '件'],
      ['全体進捗率（予定）', planned],
      ['全体進捗率（実績）', actual],
      ['進捗差分（実績 − 予定）', delta]
    ];
    rows.forEach(([label, value]) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = label;
      const td = document.createElement('td');
      td.textContent = value;
      if (label.includes('差分') && value.trim().startsWith('-')) {
        td.dataset.status = 'negative';
      }
      tr.append(th, td);
      body.append(tr);
    });
    table.append(caption, body);
    section.append(title, table);
    view.insertBefore(section, existingPanel);
  }

  document.addEventListener('building-schedule:render', () => {
    renderProjectDataTable();
    refreshBreadcrumb();
  });
  renderProjectDataTable();
})();
