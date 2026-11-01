(()=>{
const top=document.querySelector('.top-actions');if(!top)return;
const state=document.createElement('span');state.id='connectionState';state.className='connection-state';state.innerHTML='<span>端末保存</span>';top.prepend(state);
const note=document.createElement('div');note.id='offlineNote';note.className='offline-note';document.body.append(note);
function syncConnection(){const online=navigator.onLine;state.classList.toggle('offline',!online);state.innerHTML=`<span>${online?'オンライン・端末保存':'オフライン・端末保存'}</span>`;note.textContent=online?'通信が戻りました。端末データは保持されています。':'オフラインです。変更はこの端末に保存されます。';note.classList.add('show');clearTimeout(syncConnection.timer);syncConnection.timer=setTimeout(()=>note.classList.remove('show'),2600)}
window.addEventListener('online',syncConnection);window.addEventListener('offline',syncConnection);syncConnection();
})();