/* Building Schedule: sidebar navigation + field-first dashboard enhancement.
   Kept separate from app.js/field-runtime.js to preserve existing editing behavior. */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const navButtons = [...document.querySelectorAll('.app-sidebar .mode[data-view]')];
  const sidebar = $('#appSidebar');
  const backdrop = $('#sidebarBackdrop');
  const menu = $('#mobileMenu');

  function closeMenu() {
    sidebar?.classList.remove('open');
    backdrop?.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
  }
  function navigate(view) {
    const button = navButtons.find((node) => node.dataset.view === view);
    if (button) button.click();
  }
  function markActive(view) {
    document.body.dataset.currentView = view;
    navButtons.forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    closeMenu();
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (view === 'gantt') {
      requestAnimationFrame(() => {
        if (typeof updateMiniWindow === 'function') updateMiniWindow();
      });
    }
  }
  navButtons.forEach((button) => {
    button.addEventListener('click', () => markActive(button.dataset.view));
  });
  menu?.addEventListener('click', () => {
    const isOpen = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', isOpen);
    backdrop?.classList.toggle('open', isOpen);
    menu.setAttribute('aria-expanded', String(isOpen));
  });
  backdrop?.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
  document.querySelectorAll('[data-target-view]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.targetView));
  });
  document.querySelectorAll('[data-dashboard-go]').forEach((button) => {
    button.addEventListener('click', () => {
      navigate(button.dataset.dashboardGo);
      $('#fit')?.click();
    });
  });
  document.querySelectorAll('[data-dashboard-zoom]').forEach((button) => {
    button.addEventListener('click', () => {
      const zoomButton = $(`.canvas-tools .zoom[data-zoom="${button.dataset.dashboardZoom}"]`);
      zoomButton?.click();
      navigate('gantt');
    });
  });

  const help = $('#helpDialog');
  $('#closeHelp')?.addEventListener('click', () => help?.close());
  help?.addEventListener('click', (event) => {
    if (event.target === help) help.close();
  });
  const actions = {
    quick() {
      closeMenu();
      $('#quickUpdateFab')?.click();
    },
    attention() {
      navigate('today');
      $('#attentionBoard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    print() {
      closeMenu();
      window.print();
    },
    settings() {
      closeMenu();
      if (window.confirm('サンプルに戻すと、この端末の工程データが初期状態に置き換わります。続けますか？')) {
        $('#reset')?.click();
        navigate('today');
      }
    },
    help() {
      closeMenu();
      help?.showModal();
    }
  };
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => actions[button.dataset.action]?.());
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
      $('#openScheduleEmpty')?.addEventListener('click', () => navigate('gantt'));
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
  markActive('today');
})();
