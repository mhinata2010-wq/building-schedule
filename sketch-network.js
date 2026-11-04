/* Pencil-style schedule creation and fully interactive dependency view. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const baseRows = renderRows;
  const baseNetwork = drawNetwork;
  function pointToIndex(event,track){
    const box=track.getBoundingClientRect();
    return clamp(Math.floor((event.clientX-box.left)/dayWidth()),0,TOTAL_DAYS-1);
  }
  function addSketchTrack(rowIndex){
    const width=TOTAL_DAYS*dayWidth();
    const row=document.createElement('div');
    row.className='row empty-row sketch-spare-row';
    row.innerHTML='<div class="task-label"><span class="sketch-pen">✎</span><div class="task-copy"><span class="sketch-label">工程を描く</span><small class="task-meta">右へドラッグして予定を追加</small></div></div><div class="track sketch-track" style="width:'+width+'px" aria-label="新しい工程を描く"></div>';
    row.dataset.sketchRow=String(rowIndex);$('#rows').append(row);
  }
  function wireTrack(track){
    let from=null,preview=null;
    track.classList.add('sketch-track');
    track.style.touchAction='none';
    track.onpointerdown=event=>{
      if(event.button!==0&&event.pointerType==='mouse')return;
      from=pointToIndex(event,track);
      preview=document.createElement('div');
      preview.className='sketch-preview';
      preview.style.left=(from*dayWidth())+'px';
      preview.style.width=dayWidth()+'px';
      track.append(preview);
      track.setPointerCapture(event.pointerId);
      event.preventDefault();
    };
    track.onpointermove=event=>{
      if(from===null||!preview)return;
      const end=pointToIndex(event,track);
      const left=Math.min(from,end),right=Math.max(from,end);
      preview.style.left=(left*dayWidth())+'px';
      preview.style.width=((right-left+1)*dayWidth())+'px';
      preview.textContent=(right-left+1)+'日';
    };
    track.onpointerup=event=>{
      if(from===null)return;
      const end=pointToIndex(event,track),lo=Math.min(from,end),hi=Math.max(from,end);
      from=null;preview?.remove();preview=null;
      if(track.hasPointerCapture(event.pointerId))track.releasePointerCapture(event.pointerId);
      const id=crypto.randomUUID();
      tasks.push({id,name:'新しい工程',start:iso(add(base,lo)),end:iso(add(base,hi)),pred:'',progress:0,status:'planned',priority:3,assignee:''});
      persist();
      setTimeout(()=>{const input=document.querySelector('.task-name[data-name="'+id+'"]');input?.focus();input?.select();},0);
    };
    track.onpointercancel=()=>{from=null;preview?.remove();preview=null;};
  }
  renderRows=()=>{
    baseRows();
    // Keep three visible sketch lines so new tasks can be drawn like writing on paper.
    for(let i=0;i<3;i++)addSketchTrack(i);
    document.querySelectorAll('#drawTrack,.sketch-spare-row .track').forEach(wireTrack);
  };
  const instructions=$('#gantt .guidance');
  if(instructions){
    const title=instructions.querySelector('strong'),detail=instructions.querySelector('span');
    if(title)title.textContent='紙の工程表に線を引くように、空白をなぞって作成';
    if(detail)detail.textContent='空白を横にドラッグ＝新規工程　／　バーを動かす＝日程変更　／　左右端を引く＝期間調整　／　⠿＝行の並べ替え';
  }
  const intro=document.createElement('div');
  intro.className='sketch-helper';
  intro.innerHTML='<div><span class="sketch-helper-icon">✎</span><strong>なぞって工程を描く</strong><small>クリックなら1日、横に引くとその期間で追加されます。</small></div><span>編集は自動保存</span>';
  $('#gantt .guidance')?.after(intro);
  // Discrete zoom prevents touch-gesture conflicts with card editing.
  const networkZoomSteps=[0.75,1,1.25];
  let networkZoom=1;
  let networkNaturalWidth=870,networkNaturalHeight=460;
  let networkFit=false;
  function networkScrollArea(){return $('#network .network-wrap');}
  function applyNetworkZoom(preserveCenter=true){
    const area=networkScrollArea(),svg=$('#networkSvg');
    if(!area||!svg)return;
    const prevW=svg.getBoundingClientRect().width||networkNaturalWidth;
    const prevH=svg.getBoundingClientRect().height||networkNaturalHeight;
    const centerX=area.scrollLeft+area.clientWidth/2;
    const centerY=area.scrollTop+area.clientHeight/2;
    const fitScale=Math.min(1,area.clientWidth/networkNaturalWidth);
    const scale=networkFit?fitScale:networkZoom;
    const newW=networkNaturalWidth*scale,newH=networkNaturalHeight*scale;
    svg.style.width=newW+'px';
    svg.style.height=newH+'px';
    svg.style.minWidth='0';
    svg.style.minHeight='0';
    if(preserveCenter){
      area.scrollLeft=Math.max(0,centerX/prevW*newW-area.clientWidth/2);
      area.scrollTop=Math.max(0,centerY/prevH*newH-area.clientHeight/2);
    }
    const label=$('#networkZoomLabel');
    if(label)label.textContent=networkFit?'全体':Math.round(networkZoom*100)+'%';
    $('#networkZoomOut')?.toggleAttribute('disabled',!networkFit&&networkZoom===networkZoomSteps[0]);
    $('#networkZoomIn')?.toggleAttribute('disabled',!networkFit&&networkZoom===networkZoomSteps[networkZoomSteps.length-1]);
    $('#networkZoomFit')?.setAttribute('aria-pressed',String(networkFit));
  }
  function setNetworkZoom(direction){
    const current=networkFit?0.75:networkZoom;
    let idx=networkZoomSteps.findIndex(n=>n>=current-0.001);
    idx=Math.max(0,Math.min(networkZoomSteps.length-1,idx+direction));
    networkFit=false;
    networkZoom=networkZoomSteps[idx];
    applyNetworkZoom();
  }
  const net=$('#network');
  if(net){
    const head=net.querySelector('.network-head');
    if(head)head.innerHTML='<div><strong>ネットワーク工程表</strong><span>工程の前後関係を自動図解。ノードをクリックすると編集できます。</span></div><button class="ws-button" id="networkAddDep">前後関係を編集</button>';
    const toolbar=document.createElement('div');
    toolbar.className='network-zoom-toolbar';
    toolbar.setAttribute('role','group');
    toolbar.setAttribute('aria-label','ネットワーク工程表の拡大縮小');
    toolbar.innerHTML='<button type="button" id="networkZoomOut" aria-label="縮小">−</button><output id="networkZoomLabel" aria-live="polite">100%</output><button type="button" id="networkZoomIn" aria-label="拡大">＋</button><button type="button" id="networkZoomFit" aria-pressed="false">全体表示</button>';
    head?.after(toolbar);
    $('#networkZoomOut').addEventListener('click',()=>setNetworkZoom(-1));
    $('#networkZoomIn').addEventListener('click',()=>setNetworkZoom(1));
    $('#networkZoomFit').addEventListener('click',()=>{
      networkFit=true;
      applyNetworkZoom();
      const area=networkScrollArea();if(area){area.scrollLeft=0;area.scrollTop=0;}
    });
    window.addEventListener('resize',()=>applyNetworkZoom(false));
    $('#networkAddDep')?.addEventListener('click',()=>{
      const first=tasks.find(t=>t.pred)||tasks[0];if(first)openInspector(first.id);else $('.mode[data-view="gantt"]')?.click();
    });
    const legend=document.createElement('div');
    legend.id='networkLegend';
    legend.className='network-legend';
    head?.after(legend);
  }
  const invalidLabel=document.createElement('p');
  invalidLabel.className='network-warning';
  invalidLabel.hidden=true;
  invalidLabel.id='networkWarning';
  $('#networkLegend')?.after(invalidLabel);
  function duration(t){
    const s=new Date(t.start+'T12:00:00').getTime();
    const e=new Date(t.end+'T12:00:00').getTime();
    return Math.max(1,Math.round((e-s)/DAY)+1);
  }
  function networkModel(){
    const byId=new Map(tasks.map(t=>[t.id,t]));
    const level=new Map(),longest=new Map(),visiting=new Set(),cyclic=new Set();
    function build(t){
      if(level.has(t.id))return;
      if(visiting.has(t.id)){cyclic.add(t.id);return;}
      visiting.add(t.id);
      const pred=byId.get(t.pred);
      if(pred&&pred.id!==t.id){build(pred);}
      if(cyclic.has(t.id)||pred&&cyclic.has(pred.id))cyclic.add(t.id);
      level.set(t.id,pred&&!cyclic.has(t.id)?(level.get(pred.id)||0)+1:0);
      longest.set(t.id,duration(t)+(pred&&!cyclic.has(t.id)?(longest.get(pred.id)||0):0));
      visiting.delete(t.id);
    }
    tasks.forEach(build);
    const last=tasks.slice().sort((a,b)=>(longest.get(b.id)||0)-(longest.get(a.id)||0))[0];
    const chain=new Set();
    let cursor=last;
    while(cursor&&!chain.has(cursor.id)){chain.add(cursor.id);cursor=byId.get(cursor.pred);}
    return {byId,level,longest,cyclic,chain,totalLongest:last?longest.get(last.id):0};
  }
  drawNetwork=()=>{
    const svg=$('#networkSvg');
    if(!svg)return;
    const {byId,level,cyclic,chain,totalLongest}=networkModel();
    const levelGroups=new Map();
    tasks.forEach(t=>{const lv=level.get(t.id)||0;if(!levelGroups.has(lv))levelGroups.set(lv,[]);levelGroups.get(lv).push(t);});
    const maxLevel=Math.max(0,...levelGroups.keys()),maxRows=Math.max(1,...Array.from(levelGroups.values()).map(x=>x.length));
    const width=Math.max(870,310+maxLevel*270),height=Math.max(460,90+maxRows*134);
    const points=new Map();
    levelGroups.forEach((items,lvl)=>items.forEach((t,i)=>{
      const blockHeight=items.length*134,start=(height-blockHeight)/2+16;
      points.set(t.id,{x:42+lvl*270,y:start+i*134});
    }));
    const links=tasks.filter(t=>byId.has(t.pred)&&t.pred!==t.id);
    const edgeMarkup=links.map(t=>{
      const p=points.get(t.pred),q=points.get(t.id);
      if(!p||!q)return '';
      const isCritical=chain.has(t.id)&&chain.has(t.pred);
      return '<path class="net-edge '+(isCritical?'net-critical':'')+'" d="M'+(p.x+211)+' '+(p.y+46)+' C'+(p.x+248)+' '+(p.y+46)+','+(q.x-38)+' '+(q.y+46)+','+q.x+' '+(q.y+46)+'"/>';
    }).join('');
    const nodeMarkup=tasks.map((t,i)=>{
      const p=points.get(t.id),progress=Math.min(100,Math.max(0,Number(t.progress)||0));
      const late=t.end<iso(new Date())&&progress<100;
      const critical=chain.has(t.id);
      return '<g class="net-task '+(critical?'critical':'')+'" data-net-id="'+esc(t.id)+'" transform="translate('+p.x+','+p.y+')" role="button" tabindex="0" aria-label="'+esc(t.name)+'を編集"><rect class="net-card-bg" width="211" height="94" rx="12"/><text class="net-kicker" x="14" y="21">工程 '+String(i+1).padStart(2,'0')+' ・ '+duration(t)+'日</text><text class="net-title" x="14" y="43">'+esc(t.name.slice(0,15))+'</text><text class="net-date" x="14" y="61">'+t.start.slice(5)+' 〜 '+t.end.slice(5)+(late?' ・ 期限超過':'')+'</text><rect x="14" y="74" rx="3" width="181" height="6" class="net-track"/><rect x="14" y="74" rx="3" width="'+(181*progress/100)+'" height="6" class="net-progress"/></g>';
    }).join('');
    svg.setAttribute('viewBox','0 0 '+width+' '+height);
    svg.setAttribute('width',String(width));svg.setAttribute('height',String(height));
    networkNaturalWidth=width;networkNaturalHeight=height;
    applyNetworkZoom(false);
    svg.innerHTML='<defs><marker id="netArrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M1 1 L9 5 L1 9" fill="none" stroke="context-stroke" stroke-width="1.5"/></marker></defs>'+edgeMarkup+nodeMarkup+(tasks.length?'':'<text x="52" y="75" class="net-title">工程がまだありません。工程を考える画面から追加してください。</text>');
    const legends=$('#networkLegend');
    if(legends)legends.innerHTML='<div><strong>'+tasks.length+'</strong><span>工程</span></div><div><strong>'+links.length+'</strong><span>前後関係</span></div><div><strong>'+totalLongest+'日</strong><span>最長チェーン（工程日数の合計）</span></div><div class="net-legend-note"><i></i>青枠：最長の依存チェーン（工期の正式なCPM計算ではありません）</div>';
    const warning=$('#networkWarning');
    if(warning){warning.hidden=!cyclic.size;warning.textContent=cyclic.size?'前工程に循環が含まれています。該当する工程の前工程を解除してください。':'';}
  };
  $('#networkSvg')?.addEventListener('click',e=>{const node=e.target.closest('[data-net-id]');if(node)openInspector(node.dataset.netId);});
  $('#networkSvg')?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const node=e.target.closest('[data-net-id]');if(node){e.preventDefault();openInspector(node.dataset.netId);}}});
  $('#taskPred')?.addEventListener('change',e=>{
    const t=tasks.find(x=>x.id===selected),next=e.target.value;
    if(!t||!next)return;
    const byId=new Map(tasks.map(x=>[x.id,x]));
    const seen=new Set([t.id]);let cursor=next;
    while(cursor){
      if(seen.has(cursor)){
        e.stopImmediatePropagation();
        alert('前後関係が循環します。別の前工程を選択してください。');
        e.target.value=t.pred||'';
        return;
      }
      seen.add(cursor);cursor=byId.get(cursor)?.pred||'';
    }
  },true);
  // Existing row renderer was installed before this enhancement; refresh the canvas.
  render();
})();