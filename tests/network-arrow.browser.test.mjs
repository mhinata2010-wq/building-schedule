import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {dirname, resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const report=resolve(root,'tests-output');
const errors=[];
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  const path=decodeURIComponent((req.url||'/').split('?')[0]);
  if(path==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const file=resolve(root,path==='/'?'index.html':path.replace(/^\/+/,''));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  try{const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(data);}
  catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined});
try{
  await mkdir(report,{recursive:true});
  const ctx=await browser.newContext({viewport:{width:1365,height:920}});
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&/\.(js|css)(\?|$)/.test(r.url()))errors.push('missing asset '+r.url());});
  await page.goto(url,{waitUntil:'load'});
  await page.locator('.sidebar-nav .mode[data-view="network"]').click();
  await page.locator('#networkSvg .net-edge').first().waitFor();
  const geometry=await page.locator('#networkSvg').evaluate(svg=>{
    const marker=[...svg.querySelectorAll('marker')].map(m=>({
      id:m.id,units:m.getAttribute('markerUnits'),w:m.getAttribute('markerWidth'),h:m.getAttribute('markerHeight'),
      pathFill:m.querySelector('path')?.getAttribute('fill')
    }));
    const taskNodes=[...svg.querySelectorAll('.net-task')];
    const positions=taskNodes.map(n=>{
      const t=n.getAttribute('transform')||'';
      const m=t.match(/translate\((-?[\d.]+),(-?[\d.]+)\)/);
      return m?{x:Number(m[1]),y:Number(m[2])}:null;
    });
    const edges=[...svg.querySelectorAll('path.net-edge')];
    const measurements=edges.map((e,i)=>{
      const end=e.getPointAtLength(e.getTotalLength());
      const dest=positions[i+1];
      return {gap:dest?dest.x-end.x:null,lastX:end.x,marker:getComputedStyle(e).markerEnd};
    });
    const arrow=svg.querySelector('#netArrowCritical');
    return {marker,measurements,edgeCount:edges.length,nodeCount:taskNodes.length,arrowExists:!!arrow};
  });
  assert.ok(geometry.nodeCount>=2,'Need linked sample tasks');
  assert.equal(geometry.edgeCount,geometry.nodeCount-1,'Sample network is a chain');
  assert.equal(geometry.marker.length,2,'Both normal and critical markers must exist');
  for(const m of geometry.marker){
    assert.equal(m.units,'userSpaceOnUse');
    assert.equal(m.w,'16');assert.equal(m.h,'16');
    assert.ok(m.pathFill.startsWith('#'));
  }
  for(const e of geometry.measurements){
    assert.ok(e.gap>=13&&e.gap<=17,'Arrow must have clearance before card, got '+e.gap);
    assert.ok(e.marker.includes('netArrow'),'Arrow marker lost after CSS');
  }
  const sidebar=await page.locator('.sidebar-chevron').evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {width:r.width,height:r.height,flex:getComputedStyle(el).flexShrink};
  });
  assert.equal(sidebar.width,18);
  assert.equal(sidebar.height,18);
  assert.equal(sidebar.flex,'0');
  await page.screenshot({path:report+'/network-100.png',fullPage:true});
  await page.locator('#networkZoomOut').click();
  await page.waitForFunction(()=>document.querySelector('#networkZoomLabel')?.textContent==='75%');
  await page.screenshot({path:report+'/network-75.png',fullPage:true});
  await page.locator('#networkZoomIn').click();
  await page.locator('#networkZoomIn').click();
  await page.waitForFunction(()=>document.querySelector('#networkZoomLabel')?.textContent==='125%');
  await page.screenshot({path:report+'/network-125.png',fullPage:true});

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const m=await mobile.newPage();m.on('pageerror',e=>errors.push('mobile '+e.message));
  await m.goto(url,{waitUntil:'load'});
  await m.locator('#mobileMenu').click();
  await m.locator('.sidebar-nav .mode[data-view="network"]').click();
  await m.locator('#networkSvg .net-edge').first().waitFor();
  assert.ok(await m.locator('#network').isVisible());
  await m.locator('#networkZoomFit').click();
  assert.equal(await m.locator('#networkZoomFit').getAttribute('aria-pressed'),'true');
  await m.screenshot({path:report+'/network-mobile.png',fullPage:true});
  await mobile.close();
  await ctx.close();
  assert.deepEqual(errors,[],'No browser runtime or JS/CSS asset errors');
  console.log('PASS network arrowheads: 100%, 75%, 125%, mobile fit, SVG geometry, sidebar chevron');
  console.log(JSON.stringify({geometry,sidebar},null,2));
}finally{
  await browser.close();
  await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
}
