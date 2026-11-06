/* Building Schedule: dashboard summary, help dialog and reset confirmation. */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const help = $('#helpDialog');
  $('#closeHelp')?.addEventListener('click', () => help?.close());
  help?.addEventListener('click', (event) => {
    if (event.target === help) help.close();
  });
  // Existing header reset control can also erase local edits; require confirmation.
  $('#reset')?.addEventListener('click', (event) => {
    if (event.isTrusted && !window.confirm('保存中の工程をサンプルに戻しますか？この端末の編集内容は失われます。')) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  const emptyArt = (symbol) => `<svg class="empty-icon ui-icon" aria-hidden="true"><use href="#${symbol}"/></svg>`;
  function renderSummary() {
    if (typeof tasks === 'undefined') return;
    const currentDate = new Date();
    const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const today = tasks.filter((task) => task.start <= key && task.end >= key);
    const inProgress = tasks.filter((task) => task.status === 'in-progress' || (task.progress > 0 && task.progress < 100 && task.status !== 'blocked' && task.status !== 'done'));
    const upcoming = tasks.filter((task) => task.start > key);
    if ($('#todayCount')) $('#todayCount').textContent = `${today.length} 件`;
    if ($('#activeCount')) $('#activeCount').textContent = `${inProgress.length} 件`;
    if ($('#upcomingCount')) $('#upcomingCount').textContent = `${upcoming.length} 件`;
    if ($('#todayDate')) $('#todayDate').textContent = new Intl.DateTimeFormat('ja-JP', {year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(currentDate);
    if (today.length === 0 && $('#todayTasks')) {
      $('#todayTasks').innerHTML = `<div class="empty-state">${emptyArt('i-check')}<strong>今日の工程はありません</strong><p>工程表で日付や作業内容を登録すると、該当する工程が表示されます。</p><button class="empty-action" id="openScheduleEmpty">↗ 工程表を開く</button></div>`;
      $('#openScheduleEmpty')?.setAttribute('data-go', 'gantt');
    }
    if (upcoming.length === 0 && $('#nextTasks')) {
      $('#nextTasks').innerHTML = `<div class="empty-state">${emptyArt('i-flag')}<strong>次に始まる工程はありません</strong><p>今後の工程を登録すると、開始予定の作業がここに表示されます。</p></div>`;
    }
  }
  const previousRender = render;
  render = () => {
    previousRender();
    renderSummary();
  };
  renderSummary();
})();
