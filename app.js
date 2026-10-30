const DAY=86400000;
const base=new Date();base.setHours(12,0,0,0);
const iso=d=>d.toISOString().slice(0,10),add=(d,n)=>new Date(d.getTime()+n*DAY);
const today=()=>iso(new Date());
let tasks=[],editing=null,draftRange=null;

const sample=()=>[
  {id:crypto.randomUUID(),name:'仮設・準備工事',start:iso(base),end:iso(add(base,2)),pred:''},
  {id:crypto.randomUUID(),name:'基礎工事',start:iso(add(base,3)),end:iso(add(base,7)),pred:null},
  {id:crypto.randomUUID(),name:'建方',start:iso(add(base,8)),end:iso(add(base,11)),pred:null},
  {id:crypto.randomUUID(),name:'屋根・外装',start:iso(add(base,12)),end:iso(add(base,16)),pred:null}
];

function seed(){tasks=sample();tasks[1].pred=tasks[0].id;tasks[2].pred=tasks[1].id;tasks[3].pred=tasks[2].id;save()}
function load(){try{tasks=JSON.parse(localStorage.getItem('building-schedule-v1'))||[]}catch{}if(!tasks.length)seed();render()}
function save(){localStorage.setItem('building-schedule-v1',JSON.stringify(tasks));render()}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function dayIndex(s){return Math.round((new Date(s+'T12:00:00')-base)/DAY)}
function taskCode(i){return String(i+1).padStart(2,'0')}
function taskState(t){const now=today();if(t.end<now)return '遅延';if(t.start<=now&&t.end>=now)return '今日';if(t.start>now)return '予定内';return '予定内'}
function predecessor(t){return tasks.find(x=>x.id===t.pred)}
function dependents(id){return tasks.filter(x=>x.pred===id)}

function render(){
  renderOperational();
  renderSchedule();
  drawNetwork();
}

function renderOperational(){
  const now=today(),normal=tasks.filter(t=>taskState(t)==='予定内'),current=tasks.filter(t=>taskState(t)==='今日'),delayed=tasks.filter(t=>taskState(t)==='遅延');
  document.querySelector('#metricNormal').textContent=normal.length;
  document.querySelector('#metricToday').textContent=current.length;
  document.querySelector('#metricDelayed').textContent=delayed.length;
  const signal=document.querySelector('#siteSignal'),title=document.querySelector('#siteStatusTitle'),description=document.querySelector('#siteStatusDescription');
  signal.className='signal'+(delayed.length?' danger':current.length?' warning':'');
  title.textContent=delayed.length?`遅延している工程が${delayed.length}件あります`:current.length?`今日は${current.length}工程を確認します`:'現在、緊急の確認項目はありません';
  description.textContent=delayed.length?'遅れている工程と、その後続工程への影響を先に確認してください。':current.length?'今日の工程を確認し、必要な変更だけ工程表へ反映します。':'次の工程まで余裕があります。工程表は必要なときだけ開けます。';

  const attention=[...delayed,...current.filter(t=>dependents(t.id).length)].slice(0,6);
  document.querySelector('#attentionCount').textContent=`${attention.length}件`;
  document.querySelector('#attentionList').innerHTML=attention.length?attention.map(t=>{
    const state=taskState(t),next=dependents(t.id),pred=predecessor(t);
    return `<article class="attention-item"><div><div class="attention-meta"><span class="priority ${state==='遅延'?'':'warn'}">${state==='遅延'?'優先':'今日'}</span><span>${esc(t.start)} → ${esc(t.end)}</span>${pred?`<span>前工程 ${esc(pred.name)}</span>`:''}</div><h3>${esc(t.name)}</h3><p class="section-description">${next.length?`後続 ${next.map(x=>esc(x.name)).join('、')} に影響する可能性があります。`:'後続工程はありません。'}</p></div><button class="attention-action" type="button" data-edit="${t.id}">工程を確認</button></article>`
  }).join(''):'<p class="empty">現在、先に対応すべき工程はありません。</p>';

  const todayItems=current;
  document.querySelector('#todayCount').textContent=`${todayItems.length}工程`;
  document.querySelector('#todayDate').textContent=new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date(now+'T12:00:00'));
  const rows=todayItems.length?todayItems.map(todayRow).join(''):'<p class="empty">今日に重なる工程はありません。</p>';
  document.querySelector('#todayList').innerHTML=rows;
  document.querySelector('#todaySummaryList').innerHTML=todayItems.length?todayItems.slice(0,4).map(todayRow).join(''):'<p class="empty">今日の作業はありません。</p>';
}

function todayRow(t){
  const i=tasks.findIndex(x=>x.id===t.id),state=taskState(t),next=dependents(t.id);
  return `<article class="today-row" data-edit="${t.id}"><span class="task-code">${taskCode(i)}</span><div><strong>${esc(t.name)}</strong><small>${esc(t.start)} → ${esc(t.end)}${next.length?` ・ 後続 ${next.length}工程`:''}</small></div><span class="task-state ${state==='遅延'?'danger':state==='今日'?'warning':''}">${state}</span></article>`
}

function renderSchedule(){
  document.querySelector('#dates').innerHTML=Array.from({length:21},(_,i)=>`<span>${add(base,i).getMonth()+1}/${add(base,i).getDate()}</span>`).join('');
  document.querySelector('#rows').innerHTML=tasks.map((t,i)=>{
    const s=Math.max(0,dayIndex(t.start)),e=Math.min(20,dayIndex(t.end)),left=s/21*100,width=Math.max(1,(e-s+1)/21*100),p=predecessor(t);
    return `<div class="row"><div class="label"><b>${i+1}. ${esc(t.name)}</b><small>${p?'← '+esc(p.name):'前工程なし'}</small></div><div class="track" data-row="${i}"><button class="bar" data-id="${t.id}" style="left:${left}%;width:${width}%">${esc(t.name)}</button></div></div>`
  }).join('')+`<div class="row"><div class="label"><b>＋ 新しい工程</b><small>横にドラッグ</small></div><div class="track empty-track" id="drawTrack"></div></div>`;
  bindSchedule();
}

function bindSchedule(){
  document.querySelectorAll('.bar').forEach(b=>b.onclick=()=>openEditor(b.dataset.id));
  const track=document.querySelector('#drawTrack');if(!track)return;let start=null;
  track.onpointerdown=e=>{start=e.offsetX;track.setPointerCapture(e.pointerId)};
  track.onpointerup=e=>{if(start===null)return;const a=Math.max(0,Math.min(20,Math.floor(Math.min(start,e.offsetX)/track.clientWidth*21))),b=Math.max(a,Math.min(20,Math.floor(Math.max(start,e.offsetX)/track.clientWidth*21)));draftRange=[iso(add(base,a)),iso(add(base,b))];start=null;openEditor(null)};
}

function openEditor(id){
  editing=id;const t=tasks.find(x=>x.id===id);
  document.querySelector('#editorTitle').textContent=t?'工程を編集':'工程を追加';
  document.querySelector('#name').value=t?.name||'';
  document.querySelector('#start').value=t?.start||draftRange?.[0]||iso(base);
  document.querySelector('#end').value=t?.end||draftRange?.[1]||iso(base);
  document.querySelector('#predecessor').innerHTML='<option value="">なし</option>'+tasks.filter(x=>x.id!==id).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
  document.querySelector('#predecessor').value=t?.pred||'';
  document.querySelector('#editor').showModal();
}
function closeEditor(){document.querySelector('#editor').close();editing=null;draftRange=null}

document.querySelector('#editorForm').addEventListener('submit',e=>{
  e.preventDefault();const name=document.querySelector('#name').value.trim(),start=document.querySelector('#start').value,end=document.querySelector('#end').value,pred=document.querySelector('#predecessor').value;
  if(!name||!start||!end||end<start)return;
  if(editing){Object.assign(tasks.find(x=>x.id===editing),{name,start,end,pred})}else tasks.push({id:crypto.randomUUID(),name,start,end,pred});
  closeEditor();save();
});

document.querySelector('#cancel').onclick=closeEditor;
document.querySelector('#dialogClose').onclick=closeEditor;
document.querySelector('#editor').addEventListener('cancel',e=>{e.preventDefault();closeEditor()});
document.querySelector('#add').onclick=()=>openEditor(null);
document.querySelector('#reset').onclick=()=>{localStorage.removeItem('building-schedule-v1');tasks=[];seed()};

document.querySelectorAll('[data-main-tab]').forEach(btn=>btn.onclick=()=>showMain(btn.dataset.mainTab));
document.querySelectorAll('[data-jump]').forEach(btn=>btn.onclick=()=>showMain(btn.dataset.jump));
document.addEventListener('click',e=>{const target=e.target.closest('[data-edit]');if(target)openEditor(target.dataset.edit)});

document.querySelectorAll('[data-schedule-tab]').forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll('[data-schedule-tab]').forEach(x=>x.classList.toggle('active',x===btn));
  document.querySelector('#gantt').hidden=btn.dataset.scheduleTab!=='gantt';
  document.querySelector('#network').hidden=btn.dataset.scheduleTab!=='network';
  if(btn.dataset.scheduleTab==='network')drawNetwork();
});

function showMain(name){
  document.querySelectorAll('[data-main-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.mainTab===name));
  document.querySelector('#statusView').hidden=name!=='status';
  document.querySelector('#todayView').hidden=name!=='today';
  document.querySelector('#scheduleView').hidden=name!=='schedule';
  if(name==='schedule')drawNetwork();
  window.scrollTo({top:0,behavior:'smooth'});
}

function drawNetwork(){
  const svg=document.querySelector('#networkSvg');if(!svg)return;
  const defs='<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#93a099"/></marker></defs>';
  const depth=new Map();
  function d(t,seen=new Set()){if(depth.has(t.id))return depth.get(t.id);if(!t.pred||seen.has(t.id)){depth.set(t.id,0);return 0}const p=tasks.find(x=>x.id===t.pred);const v=p?d(p,new Set([...seen,t.id]))+1:0;depth.set(t.id,v);return v}
  tasks.forEach(t=>d(t));
  const levels={};tasks.forEach(t=>(levels[depth.get(t.id)]??=[]).push(t));
  const pos=new Map();Object.entries(levels).forEach(([lv,list])=>list.forEach((t,i)=>pos.set(t.id,{x:70+Number(lv)*220,y:70+i*115})));
  let edges='';tasks.forEach(t=>{const a=pos.get(t.pred),b=pos.get(t.id);if(a&&b)edges+=`<path class="edge" d="M${a.x+150},${a.y+35} C${a.x+180},${a.y+35} ${b.x-30},${b.y+35} ${b.x},${b.y+35}"/>`});
  const nodes=tasks.map((t,i)=>{const p=pos.get(t.id);return `<g class="node" transform="translate(${p.x},${p.y})"><rect width="150" height="70"/><text class="code" x="12" y="20">TASK ${taskCode(i)}</text><text x="12" y="43">${esc(t.name).slice(0,14)}</text><text x="12" y="59" style="font-size:9px;fill:#7b8581">${t.start.slice(5)} → ${t.end.slice(5)}</text></g>`}).join('');
  svg.innerHTML=defs+edges+nodes;
}

load();