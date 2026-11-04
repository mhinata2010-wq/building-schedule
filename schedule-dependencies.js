/* Schedule dependency helpers. All changes are committed once, after confirmation. */
function scheduleDateMillis(key) {
  return new Date(key+'T12:00:00').getTime();
}
function shiftScheduleDate(key, days) {
  const date=new Date(key+'T12:00:00');
  date.setDate(date.getDate()+days);
  return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
}
function collectDownstreamTaskIds(taskId) {
  const affected=[],seen=new Set([taskId]),queue=[taskId];
  // Work from predecessor links, not row position: independent tasks do not move.
  for(let i=0;i<queue.length;i++) {
    const id=queue[i];
    for(const t of tasks) {
      if(t.pred!==id||seen.has(t.id))continue;
      seen.add(t.id);
      // An already completed task is historical, and stops propagation on that path.
      if(t.status==='done'||Number(t.progress)>=100)continue;
      affected.push(t.id);
      queue.push(t.id);
    }
  }
  return affected;
}
function commitScheduleChange(taskId,before) {
  const task=tasks.find(t=>t.id===taskId);
  if(!task||!before)return;
  if(task.start===before.start&&task.end===before.end){render();return;}
  if(task.end<task.start) {
    task.start=before.start;task.end=before.end;
    window.alert('終了日は開始日以降にしてください。');
    render();return;
  }
  const days=Math.round((scheduleDateMillis(task.end)-scheduleDateMillis(before.end))/DAY);
  if(days>0) {
    const affected=collectDownstreamTaskIds(taskId);
    if(affected.length) {
      const examples=affected.slice(0,3).map(id=>'・'+tasks.find(t=>t.id===id)?.name).join('\n');
      const answer=window.confirm(
        '「'+task.name+'」の終了が'+days+'日後ろになりました。\n'+
        '前後関係がつながっている後続'+affected.length+'工程も'+days+'日後ろへ移動しますか？\n\n'+
        examples+(affected.length>3?'\n・ほか'+(affected.length-3)+'工程':'')+
        '\n\n「OK」＝後続工程も変更\n「キャンセル」＝この工程だけ変更'
      );
      if(answer) {
        const lookup=new Set(affected);
        // Every descendant moves exactly once, preserving duration and existing gaps.
        for(const successor of tasks) {
          if(!lookup.has(successor.id))continue;
          successor.start=shiftScheduleDate(successor.start,days);
          successor.end=shiftScheduleDate(successor.end,days);
        }
      }
    }
  }
  persist();
}
function requestTaskDelete(taskId) {
  const task=tasks.find(t=>t.id===taskId);
  if(!task)return;
  const next=tasks.filter(t=>t.pred===taskId);
  const linked=next.length
    ?'\nこの工程を「前工程」に指定している'+next.length+'工程のリンクが解除されます。'
    :'';
  if(!window.confirm('「'+task.name+'」を削除しますか？'+linked+'\nこの操作は元に戻せません。'))return;
  tasks=tasks.filter(t=>t.id!==taskId).map(t=>t.pred===taskId?{...t,pred:''}:t);
  if(selected===taskId)closeInspector();
  persist();
}