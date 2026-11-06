const DAY=86400000, STORE='building-schedule-v2';
const PROJECT_IDS='building-schedule-project-ids-v1', ACTIVE_PROJECT='building-schedule-active-project-v1';
const LEGACY_PROJECT='default';
function storedJSON(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function projectIds(){
  const ids=storedJSON(PROJECT_IDS,[]);
  return [LEGACY_PROJECT,...(Array.isArray(ids)?ids.filter(id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id)):[])];
}
let activeProjectId=localStorage.getItem(ACTIVE_PROJECT);
if(!projectIds().includes(activeProjectId))activeProjectId=LEGACY_PROJECT;
function projectStorageKey(key,id=activeProjectId){
  return id===LEGACY_PROJECT?key:key+':'+id;
}
let TOTAL_DAYS=120;
const base=new Date();base.setHours(12,0,0,0);base.setDate(base.getDate()-14);
const iso=d=>d.toISOString().slice(0,10),add=(d,n)=>new Date(d.getTime()+n*DAY),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let tasks=[],selected=null,zoom='day',draggedRow=null;
const sample=()=>[{name:'仮設・準備工事',s:14,e:18},{name:'基礎工事',s:19,e:30},{name:'建方',s:31,e:37},{name:'屋根・外装',s:35,e:48},{name:'設備配管・配線',s:43,e:58},{name:'内装工事',s:52,e:72},{name:'検査・引渡し',s:75,e:80}].map((x,i,a)=>({id:crypto.randomUUID(),name:x.name,start:iso(add(base,x.s)),end:iso(add(base,x.e)),pred:i?a[i-1]?.id||'':''}));
function seed(){tasks=sample();for(let i=1;i<tasks.length;i++)tasks[i].pred=tasks[i-1].id;persist()}
function load(){
  const saved=storedJSON(projectStorageKey(STORE),null);
  tasks=Array.isArray(saved)?saved:[];
  if(!Array.isArray(saved)&&activeProjectId===LEGACY_PROJECT)seed();
  else render();
}
function persist(){localStorage.setItem(projectStorageKey(STORE),JSON.stringify(tasks));render();flashSaved()}
function flashSaved(){const el=document.querySelector('#saveState');if(!el)return;el.lastChild.textContent='保存済み'}
function idx(s){return Math.round((new Date(s+'T12:00:00')-base)/DAY)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function dayWidth(){return zoom==='day'?64:zoom==='week'?28:12}
function render(){TOTAL_DAYS=Math.max(120,...tasks.map(t=>Math.max(0,idx(t.end))+15));document.documentElement.style.setProperty('--day',dayWidth()+'px');renderDates();renderRows();renderMini();drawNetwork();if(selected)syncInspector()}
function renderDates(){const today=iso(new Date());document.querySelector('#dates').innerHTML=Array.from({length:TOTAL_DAYS},(_,i)=>{const d=add(base,i),key=iso(d),label=zoom==='month'?(d.getDate()===1?`${d.getMonth()+1}月`:''):zoom==='week'?(d.getDay()===1?`${d.getMonth()+1}/${d.getDate()}`:''): `${d.getMonth()+1}/${d.getDate()}`;return `<div class="date-cell ${key===today?'today':''}">${label}</div>`}).join('');document.querySelector('#rangeLabel').textContent=`${iso(base).slice(5)} 〜 ${iso(add(base,TOTAL_DAYS-1)).slice(5)}`}
function renderRows(){const width=TOTAL_DAYS*dayWidth();const html=tasks.map((t,i)=>{const s=clamp(idx(t.start),0,TOTAL_DAYS-1),e=clamp(idx(t.end),s,TOTAL_DAYS-1),p=tasks.find(x=>x.id===t.pred);return `<div class="row" data-row-id="${t.id}"><div class="task-label"><button class="drag-grip" draggable="true" data-grip="${t.id}" title="順番を変更">⠿</button><span class="task-number">${String(i+1).padStart(2,'0')}</span><div class="task-copy"><input class="task-name" data-name="${t.id}" value="${esc(t.name)}" aria-label="工程名"><small class="task-meta">${p?'← '+esc(p.name):'前工程なし'} ・ ${t.start.slice(5)} → ${t.end.slice(5)}</small></div><button class="detail-button" data-detail="${t.id}" title="詳細" aria-label="${esc(t.name)}の詳細">⋯</button><button class="task-trash" type="button" data-delete-task="${t.id}" title="${esc(t.name)}を削除" aria-label="${esc(t.name)}を削除"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></svg></button></div><div class="track" data-track="${t.id}" style="width:${width}px"><div class="bar" data-id="${t.id}" style="left:${s*dayWidth()}px;width:${Math.max(12,(e-s+1)*dayWidth())}px"><span class="resize left" data-resize="start"></span><span class="bar-title">${esc(t.name)}</span><span class="resize right" data-resize="end"></span></div></div></div>`}).join('');const empty=`<div class="row empty-row"><div class="task-label"><span class="task-number">＋</span><div class="task-copy"><span class="task-name">新しい工程</span><small class="task-meta">右側をドラッグして追加</small></div></div><div class="track" id="drawTrack" style="width:${width}px"></div></div>`;document.querySelector('#rows').innerHTML=html+empty;bindCanvas()}
function pointerIndex(e,track){const r=track.getBoundingClientRect();return clamp(Math.floor((e.clientX-r.left)/dayWidth()),0,TOTAL_DAYS-1)}
function bindCanvas(){document.querySelectorAll('.task-name[data-name]').forEach(input=>{input.onchange=()=>{const t=tasks.find(x=>x.id===input.dataset.name);const v=input.value.trim();if(t&&v){t.name=v;persist()}else render()};input.onkeydown=e=>{if(e.key==='Enter')input.blur()}});document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>openInspector(b.dataset.detail));document.querySelectorAll('[data-delete-task]').forEach(b=>b.onclick=()=>requestTaskDelete(b.dataset.deleteTask));
 document.querySelectorAll('.bar').forEach(bar=>{const track=bar.parentElement;let state=null,moved=false;bar.onpointerdown=e=>{e.preventDefault();e.stopPropagation();const t=tasks.find(x=>x.id===bar.dataset.id);if(!t)return;const mode=e.target.dataset.resize==='start'?'start':e.target.dataset.resize==='end'?'end':'move';state={t,mode,p:pointerIndex(e,track),s:idx(t.start),e:idx(t.end),oldStart:t.start,oldEnd:t.end};moved=false;bar.setPointerCapture(e.pointerId);bar.classList.add('dragging')};bar.onpointermove=e=>{if(!state)return;const delta=pointerIndex(e,track)-state.p;if(delta)moved=true;let s=state.s,en=state.e;if(state.mode==='move'){const dur=en-s;s=clamp(s+delta,0,TOTAL_DAYS-1-dur);en=s+dur}else if(state.mode==='start')s=clamp(s+delta,0,en);else en=clamp(en+delta,s,TOTAL_DAYS-1);state.t.start=iso(add(base,s));state.t.end=iso(add(base,en));bar.style.left=s*dayWidth()+'px';bar.style.width=Math.max(12,(en-s+1)*dayWidth())+'px'};bar.onpointerup=e=>{if(!state)return;bar.releasePointerCapture(e.pointerId);bar.classList.remove('dragging');const id=state.t.id,before={start:state.oldStart,end:state.oldEnd};state=null;if(moved)commitScheduleChange(id,before);else openInspector(id)};bar.onpointercancel=()=>{if(state){state.t.start=state.oldStart;state.t.end=state.oldEnd;state=null;}render()}});
 const draw=document.querySelector('#drawTrack');let start=null;draw.onpointerdown=e=>{start=pointerIndex(e,draw);draw.setPointerCapture(e.pointerId)};draw.onpointerup=e=>{if(start===null)return;const end=pointerIndex(e,draw),a=Math.min(start,end),b=Math.max(start,end);tasks.push({id:crypto.randomUUID(),name:'新しい工程',start:iso(add(base,a)),end:iso(add(base,b)),pred:''});start=null;persist();setTimeout(()=>{const inputs=document.querySelectorAll('input.task-name');const input=inputs[inputs.length-1];input?.focus();input?.select()},0)};
 document.querySelectorAll('[data-grip]').forEach(g=>{g.ondragstart=e=>{draggedRow=g.dataset.grip;e.dataTransfer.effectAllowed='move'};g.ondragend=()=>{draggedRow=null;document.querySelectorAll('.row').forEach(r=>r.classList.remove('drag-over'))}});document.querySelectorAll('.row[data-row-id]').forEach(row=>{row.ondragover=e=>{if(!draggedRow||draggedRow===row.dataset.rowId)return;e.preventDefault();row.classList.add('drag-over')};row.ondragleave=()=>row.classList.remove('drag-over');row.ondrop=e=>{e.preventDefault();row.classList.remove('drag-over');const from=tasks.findIndex(t=>t.id===draggedRow),to=tasks.findIndex(t=>t.id===row.dataset.rowId);if(from<0||to<0)return;const [item]=tasks.splice(from,1);tasks.splice(to,0,item);persist()}})}
function openInspector(id){selected=id;document.querySelector('#inspector').classList.add('open');document.querySelector('#inspector').setAttribute('aria-hidden','false');syncInspector()}
function closeInspector(){selected=null;document.querySelector('#inspector').classList.remove('open');document.querySelector('#inspector').setAttribute('aria-hidden','true')}
function syncInspector(){const t=tasks.find(x=>x.id===selected);if(!t)return closeInspector();document.querySelector('#inspectorTitle').textContent=t.name;document.querySelector('#taskName').value=t.name;document.querySelector('#taskStart').value=t.start;document.querySelector('#taskEnd').value=t.end;document.querySelector('#taskPred').innerHTML='<option value="">なし</option>'+tasks.filter(x=>x.id!==t.id).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');document.querySelector('#taskPred').value=t.pred||''}
document.querySelector('#taskName').addEventListener('change',e=>{const t=tasks.find(x=>x.id===selected);if(!t)return;const name=e.target.value.trim();if(!name){syncInspector();return}t.name=name;persist()});
document.querySelector('#taskPred').addEventListener('change',e=>{const t=tasks.find(x=>x.id===selected);if(!t)return;t.pred=e.target.value;persist()});
document.querySelector('#saveTaskDates').addEventListener('click',()=>{
const t=tasks.find(x=>x.id===selected);if(!t)return;
const start=document.querySelector('#taskStart').value,end=document.querySelector('#taskEnd').value;
if(!start||!end||end<start){window.alert('正しい開始日と終了日を入力してください。');return;}
const before={start:t.start,end:t.end};t.start=start;t.end=end;
commitScheduleChange(t.id,before);
});
document.querySelector('#closeInspector').onclick=closeInspector;document.querySelector('#deleteTask').onclick=()=>{if(selected)requestTaskDelete(selected)};
function renderMini(){const mini=document.querySelector('#miniTasks');mini.innerHTML=tasks.map((t,i)=>{const s=clamp(idx(t.start),0,TOTAL_DAYS-1),e=clamp(idx(t.end),s,TOTAL_DAYS-1);return `<i class="mini-task" style="left:${s/TOTAL_DAYS*100}%;width:${(e-s+1)/TOTAL_DAYS*100}%;top:${4+(i%7)*4}px"></i>`}).join('');updateMiniWindow()}
function miniMapGeometry(){
  const viewport=document.querySelector('#scheduleViewport');
  const map=document.querySelector('#miniMap');
  const timeline=TOTAL_DAYS*dayWidth();
  const label=document.querySelector('.corner');
  const labelWidth=label?parseFloat(getComputedStyle(label).width)||260:260;
  const visible=Math.min(timeline,Math.max(0,viewport.clientWidth-labelWidth));
  const maxScroll=Math.max(0,viewport.scrollWidth-viewport.clientWidth);
  return {viewport,map,timeline,visible,maxScroll};
}
function updateMiniWindow(){
  const windowEl=document.querySelector('#miniWindow');
  const {viewport,map,timeline,visible,maxScroll}=miniMapGeometry();
  if(!windowEl||!map)return;
  // scrollLeft is the timeline's first visible pixel because the task labels are sticky.
  const left=maxScroll?Math.min(1,Math.max(0,viewport.scrollLeft/timeline)):0;
  const width=maxScroll?Math.min(1,visible/timeline):1;
  windowEl.style.left=(left*100)+'%';
  windowEl.style.width=(width*100)+'%';
  const percent=maxScroll?Math.round(100*Math.max(0,Math.min(maxScroll,viewport.scrollLeft))/maxScroll):0;
  map.setAttribute('aria-valuenow',String(percent));
  map.setAttribute('aria-valuetext',maxScroll?'表示位置 '+percent+'%':'全期間を表示中');
}
document.querySelector('#scheduleViewport').addEventListener('scroll',updateMiniWindow);
const miniMap=document.querySelector('#miniMap');
let miniDrag=null;
function panMiniTo(clientX){
  if(!miniDrag)return;
  const {viewport,map,timeline,maxScroll}=miniMapGeometry();
  const box=map.getBoundingClientRect();
  if(box.width<=0)return;
  const windowLeft=(clientX-box.left-miniDrag.grabOffset)/box.width;
  viewport.scrollLeft=clamp(windowLeft*timeline,0,maxScroll);
  updateMiniWindow();
}
miniMap.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  const {viewport,map,timeline,visible,maxScroll}=miniMapGeometry();
  if(!maxScroll)return;
  const box=map.getBoundingClientRect();
  if(!box.width)return;
  const point=event.clientX-box.left;
  const left=viewport.scrollLeft/timeline*box.width;
  const windowWidth=Math.min(1,visible/timeline)*box.width;
  const inside=point>=left&&point<=left+windowWidth;
  miniDrag={
    pointerId:event.pointerId,
    // Grab where pressed inside the blue window; click elsewhere centers the window.
    grabOffset:inside?point-left:windowWidth/2
  };
  miniMap.setPointerCapture(event.pointerId);
  miniMap.classList.add('dragging');
  panMiniTo(event.clientX);
  event.preventDefault();
});
miniMap.addEventListener('pointermove',event=>{
  if(miniDrag&&miniDrag.pointerId===event.pointerId)panMiniTo(event.clientX);
});
function finishMiniDrag(event){
  if(!miniDrag||miniDrag.pointerId!==event.pointerId)return;
  miniDrag=null;
  miniMap.classList.remove('dragging');
  if(miniMap.hasPointerCapture(event.pointerId))miniMap.releasePointerCapture(event.pointerId);
}
miniMap.addEventListener('pointerup',finishMiniDrag);
miniMap.addEventListener('pointercancel',finishMiniDrag);
miniMap.addEventListener('lostpointercapture',event=>{
  if(miniDrag&&miniDrag.pointerId===event.pointerId){miniDrag=null;miniMap.classList.remove('dragging');}
});
miniMap.addEventListener('keydown',event=>{
  const {viewport,maxScroll}=miniMapGeometry();
  const step=dayWidth()*(event.shiftKey?14:3);
  const next={
    ArrowRight:viewport.scrollLeft+step,
    ArrowLeft:viewport.scrollLeft-step,
    PageDown:viewport.scrollLeft+viewport.clientWidth,
    PageUp:viewport.scrollLeft-viewport.clientWidth,
    Home:0,
    End:maxScroll
  }[event.key];
  if(next===undefined)return;
  event.preventDefault();
  viewport.scrollLeft=clamp(next,0,maxScroll);
  updateMiniWindow();
});
window.addEventListener('resize',updateMiniWindow);
document.querySelectorAll('.zoom').forEach(b=>b.onclick=()=>{zoom=b.dataset.zoom;document.querySelectorAll('.zoom').forEach(x=>x.classList.toggle('active',x===b));render()});document.querySelector('#today').onclick=()=>{document.querySelector('#scheduleViewport').scrollLeft=Math.max(0,14*dayWidth()-300)};document.querySelector('#fit').onclick=()=>{zoom='month';document.querySelectorAll('.zoom').forEach(x=>x.classList.toggle('active',x.dataset.zoom==='month'));render();document.querySelector('#scheduleViewport').scrollLeft=0};document.querySelector('#addRow').onclick=()=>{tasks.push({id:crypto.randomUUID(),name:'新しい工程',start:iso(add(base,14)),end:iso(add(base,16)),pred:''});persist();setTimeout(()=>{const a=document.querySelectorAll('input.task-name');a[a.length-1]?.focus();a[a.length-1]?.select()},0)};document.querySelector('#reset').onclick=seed;
function drawNetwork(){const svg=document.querySelector('#networkSvg');if(!svg)return;const depth=new Map();function dep(t,seen=new Set()){if(depth.has(t.id))return depth.get(t.id);if(!t.pred||seen.has(t.id)){depth.set(t.id,0);return 0}const p=tasks.find(x=>x.id===t.pred),v=p?dep(p,new Set([...seen,t.id]))+1:0;depth.set(t.id,v);return v}tasks.forEach(t=>dep(t));const levels={};tasks.forEach(t=>(levels[depth.get(t.id)]??=[]).push(t));const pos=new Map();Object.entries(levels).forEach(([lv,list])=>list.forEach((t,i)=>pos.set(t.id,{x:60+Number(lv)*220,y:60+i*100})));let edges='';tasks.forEach(t=>{const a=pos.get(t.pred),b=pos.get(t.id);if(a&&b)edges+=`<path class="edge" d="M${a.x+155},${a.y+32} C${a.x+180},${a.y+32} ${b.x-25},${b.y+32} ${b.x},${b.y+32}"/>`});const nodes=tasks.map((t,i)=>{const p=pos.get(t.id);return `<g class="node" transform="translate(${p.x},${p.y})"><rect width="155" height="64"/><text class="code" x="12" y="18">TASK ${String(i+1).padStart(2,'0')}</text><text x="12" y="39">${esc(t.name).slice(0,15)}</text><text x="12" y="54" style="font-size:8px;fill:#8a929a">${t.start.slice(5)} → ${t.end.slice(5)}</text></g>`}).join('');svg.innerHTML='<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#a8afb6"/></marker></defs>'+edges+nodes}
load();
