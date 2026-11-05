/* Field workspace: complete navigation, prioritised tasks, progress, reports and project settings. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const projectKey = 'building-schedule-project-v1';
  const rankKey = 'building-schedule-ranks-v1';
  const priorityName = {1:'最優先',2:'高',3:'通常',4:'低'};
  const statusName = {planned:'予定', 'in-progress':'進行中',blocked:'要確認',done:'完了'};
  const screens = [
    ['priority','タスク管理','やるべき作業を順位順に'],
    ['projects','現場・プロジェクト','現場と工程の基本情報'],
    ['progress','進捗・要確認','予定と実績を図解で確認'],
    ['reports','帳票・印刷','現場で共有する工程の一覧'],
    ['settings','設定','データの保存と読み込み']
  ];
  let currentScreen = 'today', orderMode = localStorage.getItem('building-schedule-order-mode')==='manual'?'manual':'auto', includeDone = false, reportType = 'all';
  let project = loadProject();
  let ranks = loadRanks();
  function loadProject(){
    try { return Object.assign({name:'総合工程表',site:'',owner:'',memo:''},JSON.parse(localStorage.getItem(projectKey)||'{}')); }
    catch { return {name:'総合工程表',site:'',owner:'',memo:''}; }
  }
  function loadRanks(){ try { const v=JSON.parse(localStorage.getItem(rankKey)||'[]');return Array.isArray(v)?v:[]; } catch {return [];} }
  function todayKey(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function nProgress(t){return Math.min(100,Math.max(0,Number(t.progress)||0));}
  function status(t){return nProgress(t)>=100?'done':(t.status||'planned');}
  function priority(t){return [1,2,3,4].includes(Number(t.priority))?Number(t.priority):3;}
  function pending(t){return status(t)!=='done';}
  function planValue(t,key){
    if(key<t.start)return 0;
    if(key>t.end)return 100;
    const s=new Date(t.start+'T12:00:00').getTime(), e=new Date(t.end+'T12:00:00').getTime()+86400000;
    return Math.max(0,Math.min(100,Math.round((new Date(key+'T12:00:00').getTime()-s+86400000)/(e-s)*100)));
  }
  function ordered(){
    const key=todayKey();
    const a=tasks.slice().sort((x,y)=>{
      if(pending(x)!==pending(y))return pending(x)?-1:1;
      if(orderMode==='manual'){
        const ai=ranks.indexOf(x.id),bi=ranks.indexOf(y.id);
        if(ai!==bi)return (ai<0?9999:ai)-(bi<0?9999:bi);
      }
      if(status(x)==='blocked'!== (status(y)==='blocked'))return status(x)==='blocked'?-1:1;
      const pd=priority(x)-priority(y);if(pd)return pd;
      const xd=x.end<key&&pending(x),yd=y.end<key&&pending(y);
      if(xd!==yd)return xd?-1:1;
      return x.end.localeCompare(y.end)||x.start.localeCompare(y.start);
    });
    return includeDone?a:a.filter(pending);
  }
  function addPage(id){const s=document.createElement('section');s.id=id+'View';s.className='view-section workspace-page';s.hidden=true;$('#mainContent').append(s);}
  screens.forEach(s=>addPage(s[0]));
  function initialiseNavigation(){
    const nav=$('.sidebar-nav');
    const duplicate=nav.querySelector('.sidebar-link[data-target-view="gantt"]');
    if(duplicate)duplicate.remove();
    const modeNames={today:'今日の予定',gantt:'工程を考える',network:'ネットワーク工程表'};
    document.querySelectorAll('.sidebar-nav .mode').forEach(b=>{const s=b.querySelector('span');if(s)s.textContent=modeNames[b.dataset.view]||s.textContent;});
    const mappings={quick:'priority',attention:'progress',print:'reports',settings:'settings'};
    document.querySelectorAll('.sidebar-nav .sidebar-link').forEach(b=>{
      const dest=b.dataset.targetView==='today'?'projects':mappings[b.dataset.action];
      if(!dest)return;
      const entry=screens.find(s=>s[0]===dest);
      const clone=b.cloneNode(true);
      clone.removeAttribute('data-action');
      clone.removeAttribute('data-target-view');
      clone.dataset.screen=dest;
      const label=clone.querySelector('span');if(label)label.textContent=entry[1];
      b.replaceWith(clone);
      clone.addEventListener('click',()=>go(dest));
    });
    document.querySelectorAll('.sidebar-nav .mode').forEach(b=>b.addEventListener('click',()=>{
      currentScreen=b.dataset.view;
      screens.forEach(s=>$('#'+s[0]+'View').hidden=true);
      document.querySelectorAll('[data-screen]').forEach(x=>x.classList.remove('active'));
      if($('#todayView'))$('#todayView').hidden=b.dataset.view!=='today';
      document.body.dataset.currentView=b.dataset.view;
    }));
    document.querySelectorAll('[data-go],[data-dashboard-go]').forEach(b=>{
      b.addEventListener('click',()=>setTimeout(()=>{if(b.dataset.go||b.dataset.dashboardGo){const dest=b.dataset.go||b.dataset.dashboardGo;$('.sidebar-nav .mode[data-view="'+dest+'"]')?.click();}},0));
    });
    const navStart=document.createElement('div');navStart.className='workspace-nav-title';navStart.textContent='工程を操作';nav.insertBefore(navStart,nav.firstChild);
    const divider=nav.querySelector('.sidebar-divider');if(divider){const navMore=document.createElement('div');navMore.className='workspace-nav-title';navMore.textContent='現場の管理';divider.after(navMore);}
    document.querySelectorAll('.sidebar-nav .sidebar-link[data-screen]').forEach(b=>b.setAttribute('aria-label',b.textContent.trim()));
  }
  function go(view){
    if(['today','gantt','network'].includes(view)){ $('.sidebar-nav .mode[data-view="'+view+'"]')?.click();return; }
    const base=$('.sidebar-nav .mode[data-view="today"]');base?.click();
    currentScreen=view;
    ['todayView','gantt','network'].forEach(id=>{$('#'+id).hidden=true;});
    screens.forEach(s=>$('#'+s[0]+'View').hidden=s[0]!==view);
    document.querySelectorAll('.sidebar-nav .mode').forEach(b=>{b.classList.remove('active');b.removeAttribute('aria-current');});
    document.querySelectorAll('[data-screen]').forEach(b=>{const active=b.dataset.screen===view;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    document.body.dataset.currentView=view;
    $('#sidebarBackdrop')?.click();
    window.scrollTo(0,0);
    renderPages();
  }
  function header(kicker,title,description,actions){
    return '<div class="workspace-heading"><div><p class="workspace-kicker">'+kicker+'</p><h1>'+title+'</h1><p>'+description+'</p></div><div class="workspace-header-actions">'+(actions||'')+'</div></div>';
  }
  function btn(label,action,extra){return '<button class="ws-button '+(extra||'')+'" data-ws-action="'+action+'">'+label+'</button>';}
  function pill(text,kind){return '<span class="ws-pill '+(kind||'')+'">'+text+'</span>';}
  function taskNote(t){
    const key=todayKey();
    if(status(t)==='done')return '完了';
    if(status(t)==='blocked')return '要確認・対応が必要';
    if(t.end<key)return '期限超過';
    if(t.start<=key&&t.end>=key)return '本日の工程';
    return t.start.slice(5)+' 開始';
  }
  function renderTodayPriority(){
    const list=$('#todayTasks');if(!list)return;
    const key=todayKey();const items=ordered().filter(t=>t.start<=key&&t.end>=key);
    list.innerHTML=items.length?items.map((t,i)=>
      '<button class="today-item" data-ws-open="'+esc(t.id)+'"><span class="ws-today-rank">'+(i+1)+'</span><span class="today-copy"><strong>'+esc(t.name)+'</strong><small>'+esc(t.assignee||'担当未設定')+' ・ '+taskNote(t)+'</small></span><span class="today-chip">'+nProgress(t)+'%</span></button>'
    ).join(''):'<div class="empty-today">本日着手する未完了の工程はありません。次に始まる工程を確認できます。</div>';
    const title=$('.today-hero h1');if(title)title.textContent='今日の予定';
    if($('#todayCount'))$('#todayCount').textContent=items.length+' 件';
    const section=$('.today-primary .card-heading strong');if(section)section.textContent='今日やること（優先順）';
    const action=$('.today-primary .text-button');if(action){action.removeAttribute('data-go');action.dataset.wsAction='priority';action.textContent='優先順位で見る ↗';}
    const intro=$('.field-principle');if(intro){const st=intro.querySelector('strong');if(st)st.textContent='「今日の予定」から、必要な作業だけ確認';}
  }
  function renderPriority(){
    const list=ordered();
    const outstanding=tasks.filter(pending),blocked=outstanding.filter(t=>status(t)==='blocked');
    const overdue=outstanding.filter(t=>t.end<todayKey());
    const top=header('PRIORITY / TASKS','優先タスク','未完了の工程を順位で整理。現場で次に着手する作業が分かります。',
      btn('＋ 工程を描く','gantt','ws-button-main'));
    // A zero count is informational, not an alert: keep the surface neutral.
    const metric=(kind,label,value)=>'<div class="ws-metric" data-kind="'+kind+'" data-has-issues="'+(value>0)+'"><span>'+label+'</span><strong>'+value+'</strong><small>工程</small></div>';
    const stats='<div class="ws-metrics">'+metric('incomplete','未完了',outstanding.length)+metric('blocked','要確認',blocked.length)+metric('overdue','期限超過',overdue.length)+'</div>';
    const controls='<div class="ws-controls"><div class="ws-segment"><button data-order-mode="auto" class="'+(orderMode==='auto'?'selected':'')+'">優先度順</button><button data-order-mode="manual" class="'+(orderMode==='manual'?'selected':'')+'">手動順位</button></div><label class="ws-checkbox"><input type="checkbox" id="showDone" '+(includeDone?'checked':'')+'>完了も表示</label></div>';
    const rows=list.length?list.map((t,i)=>{
      const done=status(t)==='done';
      const level=priority(t);
      const attention=!done?(status(t)==='blocked'?'blocked':t.end<todayKey()?'overdue':'none'):'none';
      const hint=attention==='overdue'?'期限超過':taskNote(t);
      const opts=[1,2,3,4].map(n=>'<option value="'+n+'" '+(n===level?'selected':'')+'>'+priorityName[n]+'</option>').join('');
      // Emphasis follows task.priority, never the 01/02 display position.
      const importanceTag=!done&&level<=2?'<span class="ws-importance-tag" data-level="'+level+'">'+priorityName[level]+'</span>':'';
      const progress=nProgress(t);
      return '<article class="ws-task-row" data-priority-level="'+level+'" data-completed="'+done+'" data-attention="'+attention+'"><div class="ws-rank">'+String(i+1).padStart(2,'0')+'</div><div class="ws-task-body"><div class="ws-task-head"><button class="ws-task-title" data-ws-open="'+esc(t.id)+'">'+esc(t.name)+'</button>'+importanceTag+pill(hint,attention==='blocked'?'alert':attention==='overdue'?'warning':'')+'</div><div class="ws-task-sub">'+esc(t.assignee||'担当未設定')+' ・ '+t.start.slice(5)+' 〜 '+t.end.slice(5)+' ・ '+statusName[status(t)]+'</div><div class="ws-task-progress" role="progressbar" aria-label="'+esc(t.name)+'の進捗" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress+'"><span style="width:'+progress+'%"></span></div></div><div class="ws-task-actions"><label>重要度<select data-priority="'+esc(t.id)+'">'+opts+'</select></label><button title="1段上に移動" data-move-up="'+esc(t.id)+'">↑</button><button title="1段下に移動" data-move-down="'+esc(t.id)+'">↓</button><button data-progress-step="'+esc(t.id)+'" title="進捗を25%進める">＋25%</button></div></article>';
    }).join(''):'<div class="ws-empty">表示する工程はありません。「工程を考える」で工程を追加してください。</div>';
    $('#priorityView').innerHTML=top+stats+'<div class="ws-panel"><div class="ws-panel-head"><h2>やるべき順番</h2><span>↑↓で順番を手動変更できます</span></div>'+controls+'<div class="ws-task-table">'+rows+'</div></div>';
  }
  function circle(p,color,label){
    const r=50,c=2*Math.PI*r;
    return '<div class="ws-ring"><svg viewBox="0 0 136 136" role="img" aria-label="'+label+' '+p+'%"><circle cx="68" cy="68" r="'+r+'" fill="none" stroke="#edf2ef" stroke-width="13"/><circle cx="68" cy="68" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="13" stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+(c*(1-p/100))+'" transform="rotate(-90 68 68)"/></svg><div><strong>'+p+'%</strong><span>'+label+'</span></div></div>';
  }
  function renderProgress(){
    const key=todayKey(),count=tasks.length||1;
    const actual=Math.round(tasks.reduce((a,t)=>a+nProgress(t),0)/count);
    const expected=Math.round(tasks.reduce((a,t)=>a+planValue(t,key),0)/count);
    const delta=actual-expected;
    const counts={planned:0,'in-progress':0,blocked:0,done:0};
    tasks.forEach(t=>counts[status(t)]++);
    const alert=tasks.filter(t=>pending(t)&&(status(t)==='blocked'||t.end<key));
    const tasksByGap=tasks.filter(pending).map(t=>({t,expected:planValue(t,key),actual:nProgress(t)})).sort((a,b)=>(b.expected-b.actual)-(a.expected-a.actual));
    const rings='<div class="ws-ring-pair">'+circle(actual,'#2563eb','実績進捗')+circle(expected,'#218769','予定進捗')+'</div>';
    const summary='<div class="ws-gap"><span>進捗差分（実績 - 予定）</span><strong class="'+(delta<0?'negative':'')+'">'+(delta>0?'+':'')+delta+'pt</strong><small>各工程の進捗率を単純平均。予定値は開始日・終了日から日割りで算出しています。</small></div>';
    const stack=tasks.length?Object.keys(counts).map(s=>'<div style="width:'+(counts[s]/tasks.length*100)+'%" class="ws-stack-'+s+'" title="'+statusName[s]+' '+counts[s]+'件"></div>').join(''):'';
    const legend=Object.keys(counts).map(s=>'<span><i class="ws-dot ws-stack-'+s+'"></i>'+statusName[s]+' '+counts[s]+'件</span>').join('');
    const graph=tasksByGap.length?tasksByGap.map(({t,expected,actual})=>'<button class="ws-variance-row" data-ws-open="'+esc(t.id)+'"><div><strong>'+esc(t.name)+'</strong><small>'+taskNote(t)+' ・ '+t.end.slice(5)+'終了予定</small></div><div class="ws-comparison"><div class="ws-comparison-track"><i class="ws-baseline" style="width:'+expected+'%"></i><i class="ws-real" style="width:'+actual+'%"></i></div><span>'+actual+' / '+expected+'%</span></div></button>').join(''):'<div class="ws-empty">進行中の工程はありません。</div>';
    const issues=alert.length?alert.map(t=>'<button class="ws-issue" data-ws-open="'+esc(t.id)+'"><strong>'+esc(t.name)+'</strong><span>'+taskNote(t)+' ・ '+nProgress(t)+'%</span></button>').join(''):'<div class="ws-empty">現在、要確認・期限超過の工程はありません。</div>';
    $('#progressView').innerHTML=header('PROGRESS / VISUAL STATUS','進捗・要確認','工程データから予定と実績の差を可視化。進捗の遅れを早めに発見します。',btn('進捗を更新','quick','ws-button-main'))+
      '<div class="ws-progress-layout"><section class="ws-panel"><div class="ws-panel-head"><h2>全体進捗</h2><span>'+tasks.length+'工程</span></div>'+rings+summary+'</section><section class="ws-panel"><div class="ws-panel-head"><h2>作業の状態</h2><span>工程数ベース</span></div><div class="ws-stack">'+stack+'</div><div class="ws-legend">'+legend+'</div><div class="ws-progress-counters"><div><strong>'+alert.length+'</strong><span>要確認・期限超過</span></div><div><strong>'+counts.done+'</strong><span>完了した工程</span></div></div></section></div>'+
      '<div class="ws-progress-layout"><section class="ws-panel"><div class="ws-panel-head"><h2>工程ごとの予定と実績</h2><span><i class="ws-key-real"></i>実績　<i class="ws-key-plan"></i>予定</span></div><div class="ws-variance">'+graph+'</div></section><section class="ws-panel"><div class="ws-panel-head"><h2>先に確認すること</h2><span>'+alert.length+'件</span></div><div class="ws-issues">'+issues+'</div></section></div>';
  }
  function renderProjects(){
    const active=tasks.filter(pending).length,completed=tasks.length-active;
    $('#projectsView').innerHTML=header('PROJECT / FIELD','現場・プロジェクト','この試作版は1現場です。現場名を変更すると全ページに反映されます。',btn('工程を考える','gantt','ws-button-main'))+
      '<div class="ws-progress-layout"><section class="ws-panel ws-project-detail"><div class="ws-panel-head"><h2>現場の基本情報</h2><span>この端末に保存</span></div><label>プロジェクト名<input data-project-field="name" value="'+esc(project.name)+'" maxlength="80"></label><label>現場所在地<input data-project-field="site" value="'+esc(project.site)+'" placeholder="例：徳島県神山町" maxlength="150"></label><label>担当責任者<input data-project-field="owner" value="'+esc(project.owner)+'" placeholder="例：現場責任者" maxlength="100"></label><label>補足メモ<textarea data-project-field="memo" maxlength="2000" rows="4" placeholder="協力会社や現場の注意事項">'+esc(project.memo)+'</textarea></label><p class="ws-muted">編集後、入力欄を離すと保存されます。共同編集には対応していません。</p></section>'+
      '<section class="ws-panel"><div class="ws-panel-head"><h2>工程の概要</h2><span>現在のプロジェクト</span></div><div class="ws-project-stats"><div><strong>'+tasks.length+'</strong><span>登録工程</span></div><div><strong>'+active+'</strong><span>未完了</span></div><div><strong>'+completed+'</strong><span>完了</span></div></div></section></div>';
  }
  function reportTasks(){
    if(reportType==='today')return tasks.filter(t=>t.start<=todayKey()&&t.end>=todayKey());
    if(reportType==='next'){const now=todayKey(),d=new Date(now+'T12:00:00');d.setDate(d.getDate()+13);const end=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return tasks.filter(t=>t.end>=now&&t.start<=end);}
    return tasks;
  }
  function renderReports(){
    const switches=[['all','全工程'],['today','今日'],['next','今後14日']].map(([s,l])=>'<button data-report-type="'+s+'" class="'+(reportType===s?'selected':'')+'">'+l+'</button>').join('');
    const rows=reportTasks().map((t,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(t.name)+'</td><td>'+t.start+'</td><td>'+t.end+'</td><td>'+priorityName[priority(t)]+'</td><td>'+nProgress(t)+'%</td><td>'+statusName[status(t)]+'</td></tr>').join('');
    $('#reportsView').innerHTML=header('REPORTS / PRINT','帳票・印刷','用途に合わせて工程一覧を絞り込み、紙面またはCSVで共有できます。',btn('印刷 / PDF保存','print','ws-button-main')+btn('CSVを書き出す','csv'))+
      '<div class="ws-panel"><div class="ws-report-toolbar"><div class="ws-segment">'+switches+'</div><span>ブラウザの印刷画面からPDF保存できます</span></div><div id="wsPrintArea" class="ws-print-sheet"><div class="ws-print-header"><strong>'+esc(project.name)+'</strong><span>工程一覧 / '+todayKey()+'</span></div><div class="ws-print-meta">'+(project.site?'現場：'+esc(project.site)+'　':'')+(project.owner?'担当：'+esc(project.owner):'')+'</div><table class="ws-report-table"><thead><tr><th>No.</th><th>工程名</th><th>開始日</th><th>終了日</th><th>優先度</th><th>実績</th><th>状態</th></tr></thead><tbody>'+(rows||'<tr><td colspan="7">該当する工程はありません</td></tr>')+'</tbody></table><p class="ws-print-foot">Building Schedule ・ 作成日 '+todayKey()+'</p></div></div>';
  }
  function renderSettings(){
    $('#settingsView').innerHTML=header('SETTINGS / DATA','設定','データはこのブラウザに保存されています。端末間の同期はまだありません。')+
      '<div class="ws-progress-layout"><div class="ws-panel"><div class="ws-panel-head"><h2>データのバックアップ</h2><span>JSON</span></div><p class="ws-description">工程、進捗、優先度、現場情報をまとめて保存できます。</p>'+btn('JSONをエクスポート','backup','ws-button-main')+'<label class="ws-file-label">バックアップをインポート<input id="wsImport" type="file" accept=".json,application/json"></label><p class="ws-muted">インポートは現在の工程を置き換えます。事前にエクスポートしてください。</p></div><div class="ws-panel"><div class="ws-panel-head"><h2>初期化・使い方</h2></div><p class="ws-description">表示確認用のサンプル工程に戻すか、操作ガイドを確認できます。</p>'+btn('ヘルプを開く','help')+btn('サンプルに戻す','reset','ws-danger')+'</div></div>';
  }
  function updateProjectNames(){
    const title=$('.project-title strong');if(title){title.textContent=project.name;title.title=project.name;}
    const dashboard=$('.dashboard-project strong');if(dashboard)dashboard.textContent=project.name;
  }
  function renderPages(){
    renderPriority();renderProgress();renderProjects();renderReports();renderSettings();renderTodayPriority();updateProjectNames();
    document.dispatchEvent(new Event('building-schedule:render'));
  }
  function download(filename,content,type){
    const blob=new Blob([content],{type:type||'application/octet-stream'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function csvCell(s){let v=String(s==null?'':s);if(/^[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
  function exportCSV(){
    const fields=[['No.','工程名','開始日','終了日','優先度','進捗率','状態','担当','前工程']];
    reportTasks().forEach((t,i)=>fields.push([i+1,t.name,t.start,t.end,priorityName[priority(t)],nProgress(t)+'%',statusName[status(t)],t.assignee||'',tasks.find(x=>x.id===t.pred)?.name||'']));
    download('building-schedule-'+todayKey()+'.csv','\ufeff'+fields.map(row=>row.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
  }
  function exportJSON(){
    download('building-schedule-backup-'+todayKey()+'.json',JSON.stringify({version:1,exportedAt:new Date().toISOString(),tasks,project,ranks},null,2),'application/json;charset=utf-8');
  }
  function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+'T12:00:00').getTime());}
  function importJSON(file){
    if(!file||file.size>2000000){alert('2MB以下のJSONファイルを選択してください。');return;}
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const data=JSON.parse(String(reader.result));if(!Array.isArray(data.tasks)||data.tasks.length>1000)throw Error('工程データの形式が異なります。');
        const safe=data.tasks.map((t,i)=>{
          if(!t||typeof t.name!=='string'||!t.name.trim()||!validDate(t.start)||!validDate(t.end)||t.end<t.start)throw Error('工程 '+(i+1)+' の日付または名称が不正です。');
          return {id:typeof t.id==='string'&&t.id.length<120?t.id:crypto.randomUUID(),name:t.name.slice(0,160),start:t.start,end:t.end,pred:typeof t.pred==='string'?t.pred:'',status:statusName[t.status]?t.status:'planned',progress:Math.min(100,Math.max(0,Number(t.progress)||0)),priority:[1,2,3,4].includes(Number(t.priority))?Number(t.priority):3,assignee:String(t.assignee||'').slice(0,100)};
        });
        const ids=new Set(safe.map(t=>t.id));if(ids.size!==safe.length)throw Error('重複する工程IDがあります。');
        safe.forEach(t=>{if(!ids.has(t.pred)||t.pred===t.id)t.pred='';});
        if(!confirm('現在の工程をバックアップ内容で置き換えますか？'))return;
        tasks=safe;project=Object.assign({name:'総合工程表',site:'',owner:'',memo:''},data.project&&typeof data.project==='object'?Object.fromEntries(['name','site','owner','memo'].map(k=>[k,String(data.project[k]||'').slice(0,2000)])):{});
        if(!project.name.trim())project.name='総合工程表';
        ranks=Array.isArray(data.ranks)?data.ranks.filter(x=>ids.has(x)):[];
        localStorage.setItem(projectKey,JSON.stringify(project));localStorage.setItem(rankKey,JSON.stringify(ranks));
        persist();go('today');
      }catch(err){alert('読み込みできませんでした: '+err.message);}
    };
    reader.readAsText(file);
  }
  function changeRank(id,delta){
    const source=ordered().map(t=>t.id);
    const index=source.indexOf(id),other=index+delta;
    if(index<0||other<0||other>=source.length)return;
    [source[index],source[other]]=[source[other],source[index]];
    ranks=source.concat(tasks.map(t=>t.id).filter(k=>!source.includes(k)));
    orderMode='manual';
    localStorage.setItem('building-schedule-order-mode',orderMode);localStorage.setItem(rankKey,JSON.stringify(ranks));renderPages();
  }
  function quickProgress(t){
    if(!t)return;t.progress=Math.min(100,nProgress(t)+25);
    t.status=t.progress>=100?'done':t.progress>0?'in-progress':'planned';persist();
  }
  function handleAction(action){
    if(['today','gantt','network','priority','projects','progress','reports','settings'].includes(action))return go(action);
    if(action==='quick'){ $('#quickUpdateFab')?.click();return; }
    if(action==='print'){window.print();return;}
    if(action==='csv'){exportCSV();return;}
    if(action==='backup'){exportJSON();return;}
    if(action==='help'){$('#helpDialog')?.showModal();return;}
    if(action==='reset'&&confirm('この端末の工程をサンプルに戻しますか？ 現在の編集内容は失われます。')){$('#reset')?.click();}
  }
  function bindEvents(){
    $('#mainContent').addEventListener('click',(e)=>{
      const a=e.target.closest('[data-ws-action]');if(a){handleAction(a.dataset.wsAction);return;}
      const open=e.target.closest('[data-ws-open]');if(open){openInspector(open.dataset.wsOpen);return;}
      const up=e.target.closest('[data-move-up]');if(up){changeRank(up.dataset.moveUp,-1);return;}
      const down=e.target.closest('[data-move-down]');if(down){changeRank(down.dataset.moveDown,1);return;}
      const progress=e.target.closest('[data-progress-step]');if(progress){quickProgress(tasks.find(t=>t.id===progress.dataset.progressStep));return;}
      const order=e.target.closest('[data-order-mode]');if(order){orderMode=order.dataset.orderMode;localStorage.setItem('building-schedule-order-mode',orderMode);renderPages();return;}
      const report=e.target.closest('[data-report-type]');if(report){reportType=report.dataset.reportType;renderReports();}
    });
    $('#mainContent').addEventListener('change',e=>{
      const t=e.target;
      if(t.matches('[data-priority]')){const task=tasks.find(x=>x.id===t.dataset.priority);if(task){task.priority=Number(t.value);orderMode='auto';localStorage.setItem('building-schedule-order-mode',orderMode);persist();}}
      if(t.matches('[data-project-field]')){project[t.dataset.projectField]=t.value.trim();if(!project.name)project.name='総合工程表';localStorage.setItem(projectKey,JSON.stringify(project));renderPages();}
      if(t.id==='showDone'){includeDone=t.checked;renderPriority();}
      if(t.id==='wsImport'){importJSON(t.files[0]);}
    });
    document.addEventListener('keydown',e=>{
      const tag=(document.activeElement?.tagName||'').toLowerCase();
      if(e.key.toLowerCase()==='n'&&!['input','textarea','select'].includes(tag)&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();go('gantt');$('#addRow')?.click();}
    });
  }
  initialiseNavigation();bindEvents();
  const oldRender=render;
  render=()=>{oldRender();renderPages();};
  renderPages();
  go('today');
})();