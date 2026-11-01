(()=>{
const originalRender=render;
function formatJP(date){return `${date.getMonth()+1}月${date.getDate()}日`}
function renderToday(){
  const now=new Date();now.setHours(12,0,0,0);const key=iso(now);
  const todayTasks=tasks.filter(t=>t.start<=key&&t.end>=key);
  const next=tasks.filter(t=>t.start>key).sort((a,b)=>a.start.localeCompare(b.start)).slice(0,4);
  const date=document.querySelector('#todayDate'),count=document.querySelector('#todayCount'),message=document.querySelector('#todayMessage');
  if(date)date.textContent=formatJP(now);if(count)count.textContent=`${todayTasks.length}件`;
  if(message)message.textContent=todayTasks.length?`${todayTasks.length}工程が進行予定です。まず今日の作業を確認してください。`:'今日に重なる工程はありません。次工程の準備を確認できます。';
  const list=document.querySelector('#todayTasks');if(list)list.innerHTML=todayTasks.length?todayTasks.map(t=>`<button class="today-item" data-open-task="${t.id}"><i class="today-dot"></i><span class="today-copy"><strong>${esc(t.name)}</strong><small>${t.start.slice(5)} → ${t.end.slice(5)}</small></span><span class="today-chip">進行予定</span></button>`).join(''):'<div class="empty-today">今日の工程はありません</div>';
  const nextList=document.querySelector('#nextTasks');if(nextList)nextList.innerHTML=next.length?next.map(t=>`<button class="next-item" data-open-task="${t.id}"><i class="today-dot"></i><span class="today-copy"><strong>${esc(t.name)}</strong><small>${t.start.slice(5)} 開始</small></span><span class="today-chip">${Math.max(1,Math.round((new Date(t.start+'T12:00:00')-now)/DAY))}日後</span></button>`).join(''):'<div class="empty-today">次の工程は未登録です</div>';
  document.querySelectorAll('[data-open-task]').forEach(b=>b.onclick=()=>openInspector(b.dataset.openTask));
}
render=()=>{originalRender();renderToday()};
function switchFieldView(name){
  document.querySelector('#todayView').hidden=name!=='today';document.querySelector('#gantt').hidden=name!=='gantt';document.querySelector('#network').hidden=name!=='network';
  document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(name==='network')drawNetwork();
}
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>switchFieldView(b.dataset.view));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>switchFieldView(b.dataset.go));
renderToday();switchFieldView('today');
})();