(()=>{
const statusLabels={planned:'予定','in-progress':'進行中',blocked:'要確認',done:'完了'};
const baseRender=render;
const baseSyncInspector=syncInspector;

function normalizeTaskMeta(){
  let changed=false;
  tasks=tasks.map((t,i)=>{
    const next={...t};
    if(next.progress==null){next.progress=0;changed=true}
    if(!next.status){next.status=next.progress>=100?'done':next.progress>0?'in-progress':'planned';changed=true}
    if(!next.assignee){next.assignee='';changed=true}
    return next;
  });
  if(changed)localStorage.setItem(projectStorageKey(STORE),JSON.stringify(tasks));
}

function ensureInspectorFields(){
  if(document.querySelector('#taskStatus'))return;
  const hint=document.querySelector('#inspector .hint');
  if(!hint)return;
  const wrap=document.createElement('div');
  wrap.className='status-progress';
  wrap.innerHTML='<label>状態<select id="taskStatus"><option value="planned">予定</option><option value="in-progress">進行中</option><option value="blocked">要確認</option><option value="done">完了</option></select></label><label>担当<input id="taskAssignee" placeholder="例：山田建装"></label><label class="progress-input">進捗 <strong id="taskProgressLabel">0%</strong><input id="taskProgress" type="range" min="0" max="100" step="5"></label>';
  hint.before(wrap);
  document.querySelector('#taskProgress').addEventListener('input',e=>document.querySelector('#taskProgressLabel').textContent=e.target.value+'%');
  ['taskStatus','taskAssignee','taskProgress'].forEach(id=>document.querySelector('#'+id).addEventListener('change',()=>{
    const t=tasks.find(x=>x.id===selected);if(!t)return;
    t.status=document.querySelector('#taskStatus').value;
    t.assignee=document.querySelector('#taskAssignee').value.trim();
    t.progress=Number(document.querySelector('#taskProgress').value);
    if(t.progress>=100)t.status='done';
    persist();
  }));
}

syncInspector=()=>{
  baseSyncInspector();
  ensureInspectorFields();
  const t=tasks.find(x=>x.id===selected);if(!t)return;
  document.querySelector('#taskStatus').value=t.status||'planned';
  document.querySelector('#taskAssignee').value=t.assignee||'';
  document.querySelector('#taskProgress').value=t.progress||0;
  document.querySelector('#taskProgressLabel').textContent=(t.progress||0)+'%';
};

function renderToday(){
  const now=new Date();now.setHours(12,0,0,0);const key=iso(now);
  const todayTasks=tasks.filter(t=>t.start<=key&&t.end>=key);
  const next=tasks.filter(t=>t.start>key).sort((a,b)=>a.start.localeCompare(b.start)).slice(0,4);
  const date=document.querySelector('#todayDate'),count=document.querySelector('#todayCount'),message=document.querySelector('#todayMessage');
  if(date)date.textContent=`${now.getMonth()+1}月${now.getDate()}日`;
  if(count)count.textContent=`${todayTasks.length}件`;
  if(message)message.textContent=todayTasks.length?`${todayTasks.length}工程が進行予定です。今日の作業から確認してください。`:'今日に重なる工程はありません。次工程の準備を確認できます。';
  const list=document.querySelector('#todayTasks');
  if(list)list.innerHTML=todayTasks.length?todayTasks.map(t=>`<button class="today-item" data-open-task="${t.id}"><i class="today-dot"></i><span class="today-copy"><strong>${esc(t.name)}</strong><small>${esc(t.assignee||'担当未設定')} ・ ${t.start.slice(5)} → ${t.end.slice(5)}</small></span><span class="today-chip">${t.progress||0}%</span></button>`).join(''):'<div class="empty-today">今日の工程はありません</div>';
  const nextList=document.querySelector('#nextTasks');
  if(nextList)nextList.innerHTML=next.length?next.map(t=>`<button class="next-item" data-open-task="${t.id}"><i class="today-dot"></i><span class="today-copy"><strong>${esc(t.name)}</strong><small>${t.start.slice(5)} 開始</small></span><span class="today-chip">${Math.max(1,Math.round((new Date(t.start+'T12:00:00')-now)/DAY))}日後</span></button>`).join(''):'<div class="empty-today">次の工程は未登録です</div>';
}

function renderAttention(){
  let board=document.querySelector('#attentionBoard');
  if(!board){board=document.createElement('section');board.id='attentionBoard';board.className='attention-board';document.querySelector('#todayView .today-grid')?.after(board)}
  if(!board)return;
  const today=iso(new Date());
  const attention=tasks.filter(t=>t.status==='blocked'||(t.end<today&&(t.progress||0)<100));
  board.innerHTML='<div class="section-title"><div><span>ATTENTION</span><strong>先に確認すること</strong></div><span class="today-chip">'+attention.length+'件</span></div><div class="attention-list">'+(attention.length?attention.map(t=>`<button class="attention-item" data-open-task="${t.id}"><i class="attention-mark"></i><span class="attention-copy"><strong>${esc(t.name)}</strong><small>${esc(t.assignee||'担当未設定')} ・ 進捗 ${t.progress||0}% ・ 終了 ${t.end.slice(5)}</small></span><span class="attention-action">確認する</span></button>`).join(''):'<div class="empty-today">現在、要確認の工程はありません</div>')+'</div>';
}

function renderLookahead(){
  let board=document.querySelector('#lookaheadBoard');
  if(!board){board=document.createElement('section');board.id='lookaheadBoard';board.className='lookahead-board';document.querySelector('#attentionBoard')?.after(board)}
  if(!board)return;
  const now=new Date();now.setHours(12,0,0,0);const start=iso(now),end=iso(add(now,13));
  const items=tasks.filter(t=>t.end>=start&&t.start<=end).sort((a,b)=>a.start.localeCompare(b.start));
  board.innerHTML='<div class="section-title"><div><span>LOOKAHEAD</span><strong>この先14日</strong></div><span class="today-chip">'+items.length+'工程</span></div><div class="lookahead-days">'+(items.length?items.map(t=>`<button class="lookahead-item" data-open-task="${t.id}"><span class="lookahead-date">${t.start.slice(5)}</span><span class="lookahead-copy"><strong>${esc(t.name)}</strong><small>${esc(t.assignee||'担当未設定')} ・ ${statusLabels[t.status]||'予定'} ・ ${t.end.slice(5)}まで</small></span><span class="lookahead-progress"><span>${t.progress||0}%</span><i class="lookahead-track"><i style="width:${t.progress||0}%"></i></i></span></button>`).join(''):'<div class="empty-today">14日以内の工程はありません</div>')+'</div>';
}

function bindPanelActions(){document.querySelectorAll('[data-open-task]').forEach(b=>b.onclick=()=>openInspector(b.dataset.openTask))}
function renderFieldPanels(){renderToday();renderAttention();renderLookahead();bindPanelActions()}
render=()=>{baseRender();renderFieldPanels()};

function ensureQuickUI(){
  if(document.querySelector('#quickUpdateFab'))return;
  const fab=document.createElement('button');fab.id='quickUpdateFab';fab.className='quick-update-fab';fab.textContent='進捗を更新';document.body.append(fab);
  const sheet=document.createElement('section');sheet.id='quickSheet';sheet.className='quick-sheet';sheet.innerHTML='<div class="quick-sheet-head"><strong>現場から進捗を更新</strong><button id="closeQuickSheet" aria-label="閉じる">×</button></div><div id="quickTaskList" class="quick-task-list"></div>';document.body.append(sheet);
  fab.onclick=()=>{renderQuick();sheet.classList.add('open')};document.querySelector('#closeQuickSheet').onclick=()=>sheet.classList.remove('open');
}
function renderQuick(){
  const list=document.querySelector('#quickTaskList');if(!list)return;
  const today=iso(new Date());const active=tasks.filter(t=>t.start<=today&&t.end>=today&&t.status!=='done');const source=active.length?active:tasks.filter(t=>t.status!=='done').slice(0,5);
  list.innerHTML=source.map(t=>`<div class="quick-task"><div><span class="quick-task-copy"><strong>${esc(t.name)}</strong><small>${esc(t.assignee||'担当未設定')} ・ 現在 ${t.progress||0}%</small></span><div class="quick-values">${[0,25,50,75,100].map(v=>`<button class="quick-value ${(t.progress||0)===v?'active':''}" data-quick-id="${t.id}" data-quick-progress="${v}">${v}%</button>`).join('')}</div></div><button class="quick-blocked" data-quick-blocked="${t.id}">要確認</button></div>`).join('')||'<div class="empty-today">更新する工程はありません</div>';
  document.querySelectorAll('[data-quick-progress]').forEach(b=>b.onclick=()=>{const t=tasks.find(x=>x.id===b.dataset.quickId);if(!t)return;t.progress=Number(b.dataset.quickProgress);t.status=t.progress>=100?'done':t.progress>0?'in-progress':'planned';persist();renderQuick()});
  document.querySelectorAll('[data-quick-blocked]').forEach(b=>b.onclick=()=>{const t=tasks.find(x=>x.id===b.dataset.quickBlocked);if(!t)return;t.status='blocked';persist();renderQuick()});
}

function ensureConnectionState(){
  let el=document.querySelector('#fieldConnectionState');
  if(!el){el=document.createElement('span');el.id='fieldConnectionState';el.className='field-connection-state';document.querySelector('.top-actions')?.prepend(el)}
  const update=()=>{const online=navigator.onLine;el.textContent=online?'オンライン・端末保存':'オフライン・端末保存';el.classList.toggle('offline',!online)};
  window.addEventListener('online',update);window.addEventListener('offline',update);update();
}

normalizeTaskMeta();ensureInspectorFields();ensureQuickUI();ensureConnectionState();renderFieldPanels();
})();
