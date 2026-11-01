(()=>{
function renderLookahead(){
  let board=document.querySelector('#lookaheadBoard');
  if(!board){board=document.createElement('section');board.id='lookaheadBoard';board.className='lookahead-board';document.querySelector('#attentionBoard')?.after(board)}
  const now=new Date();now.setHours(12,0,0,0);const start=iso(now),end=iso(add(now,13));
  const items=tasks.filter(t=>t.end>=start&&t.start<=end).sort((a,b)=>a.start.localeCompare(b.start));
  board.innerHTML='<div class="section-title"><div><span>LOOKAHEAD</span><strong>この先14日</strong></div><span class="today-chip">'+items.length+'工程</span></div><div class="lookahead-days">'+(items.length?items.map(t=>`<button class="lookahead-item" data-lookahead="${t.id}"><span class="lookahead-date">${t.start.slice(5)}</span><span class="lookahead-copy"><strong>${esc(t.name)}</strong><small>${esc(t.assignee||'担当未設定')} ・ ${statusLabels?.[t.status]||'予定'} ・ ${t.end.slice(5)}まで</small></span><span class="lookahead-progress"><span>${t.progress||0}%</span><i class="lookahead-track"><i style="width:${t.progress||0}%"></i></i></span></button>`).join(''):'<div class="empty-today">14日以内の工程はありません</div>')+'</div>';
  document.querySelectorAll('[data-lookahead]').forEach(b=>b.onclick=()=>openInspector(b.dataset.lookahead));
}
const previousRender=render;render=()=>{previousRender();renderLookahead()};render();
})();