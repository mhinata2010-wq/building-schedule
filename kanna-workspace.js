/* KANNA-inspired visual layer for Building Schedule.
 * Does not change schedule editing, navigation routing, persistence, or data model.
 * Main state remains the existing project/task data and LocalStorage until
 * the independently reviewed cloud-persistence project is deployed.
 */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);

  const todayView = $('#todayView');
  if (!todayView) return;

  // Create once; updates only write text and aria state, never mutate task data.
  const summary = document.createElement('section');
  summary.className = 'bs-project-overview';
  summary.setAttribute('aria-labelledby', 'bsOverviewTitle');
  const copy = document.createElement('div');
  copy.className = 'bs-project-overview-copy';
  const label = document.createElement('span');
  label.className = 'bs-project-overview-label';
  label.textContent = 'FIELD / PROJECT OVERVIEW';
  const title = document.createElement('h1');
  title.id = 'bsOverviewTitle';
  title.textContent = '総合工程表';
  const description = document.createElement('p');
  description.id = 'bsOverviewSummary';
  description.textContent = '工程の状態を確認しています。';
  copy.append(label, title, description);

  const actions = document.createElement('div');
  actions.className = 'bs-project-overview-actions';
  const openGantt = document.createElement('button');
  openGantt.type = 'button';
  openGantt.className = 'bs-project-overview-action';
  openGantt.textContent = '工程表を開く ↗';
  openGantt.dataset.bsTarget = 'gantt';
  const openProgress = document.createElement('button');
  openProgress.type = 'button';
  openProgress.className = 'bs-project-overview-action secondary';
  openProgress.textContent = '進捗を確認 ↗';
  openProgress.dataset.bsTarget = 'progress';
  actions.append(openGantt, openProgress);
  summary.append(copy, actions);
  todayView.prepend(summary);

  function currentProjectName() {
    try {
      const stored = JSON.parse(localStorage.getItem('building-schedule-project-v1') || '{}');
      if (typeof stored?.name === 'string' && stored.name.trim()) return stored.name.trim();
    } catch {
      // An invalid legacy record is not a reason to stop rendering this visual.
    }
    return '総合工程表';
  }
  function readTasks() {
    // The original app exposes tasks as a lexical global used by field-workspace.
    try { return typeof tasks !== 'undefined' && Array.isArray(tasks) ? tasks : []; }
    catch { return []; }
  }
  function refreshOverview() {
    const list = readTasks();
    const remaining = list.filter(task => Number(task.progress || 0) < 100);
    const blocked = remaining.filter(task => task.status === 'blocked').length;
    const progress = list.length
      ? Math.round(list.reduce((n, task) => n + Math.max(0, Math.min(100, Number(task.progress) || 0)), 0) / list.length)
      : 0;
    title.textContent = currentProjectName();
    // A concise source-of-truth overview; do not claim cloud synchronization.
    description.textContent = list.length
      ? '登録 ' + list.length + '工程  /  未完了 ' + remaining.length +
        '工程  /  実績進捗 ' + progress + '%' +
        (blocked ? '  /  要確認 ' + blocked + '件' : '')
      : '工程を追加すると、今日の作業と進捗をここで確認できます。';
    const status = $('#bsOverviewStatus');
    if (status) status.textContent = 'この端末のデータ';
  }

  const dataNote = document.createElement('p');
  dataNote.className = 'bs-overview-note';
  dataNote.id = 'bsOverviewStatus';
  dataNote.textContent = 'この端末のデータ';
  summary.after(dataNote);

  function ensurePendingNotice() {
    const settings = $('#settingsView');
    if (!settings || settings.querySelector('#bsCloudStatus')) return;
    const notice = document.createElement('aside');
    notice.id = 'bsCloudStatus';
    notice.className = 'bs-feature-status';
    notice.setAttribute('aria-label', '開発中の共有機能');
    const content = document.createElement('div');
    const heading = document.createElement('strong');
    heading.textContent = '複数端末への同期・Firebaseバックアップ・QR共有';
    const body = document.createElement('p');
    body.textContent = 'クラウドDBとQRによる共有は準備中です。公開版の工程データは現在、このブラウザに保存されます。別の端末へURLだけを送っても工程は共有されません。';
    content.append(heading, body);
    const flag = document.createElement('em');
    flag.textContent = '未接続';
    notice.append(content, flag);
    settings.append(notice);
  }

  document.addEventListener('click', event => {
    const action = event.target.closest('[data-bs-target]');
    if (!action) return;
    const target = action.dataset.bsTarget;
    if (target === 'gantt' || target === 'today' || target === 'network') {
      $('.sidebar-nav .mode[data-view="' + target + '"]')?.click();
    } else {
      $('.sidebar-nav .sidebar-link[data-screen="' + target + '"]')?.click();
    }
  });

  // field-workspace.js dispatches this after renderPages(). Existing data editing
  // remains owned by the original app. No polls / timers / local writes.
  document.addEventListener('building-schedule:render', () => {
    refreshOverview();
    ensurePendingNotice();
  });
  refreshOverview();
  ensurePendingNotice();
})();
