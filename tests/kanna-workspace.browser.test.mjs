import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'tests-output');
const errors = [];
const media = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filename = resolve(root, relative);
    if (filename !== root && !filename.startsWith(root + sep)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    const data = await readFile(filename);
    res.writeHead(200, { 'Content-Type': media[extname(filename)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const url = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true });
const contexts = [];

async function goTo(page, view) {
  const selector = ['today','gantt','network'].includes(view)
    ? '.sidebar-nav .mode[data-view="' + view + '"]'
    : '.sidebar-nav [data-screen="' + view + '"]';
  await page.locator(selector).click();
  const content = ['today','gantt','network'].includes(view)
    ? (view === 'today' ? '#todayView' : '#' + view)
    : '#' + view + 'View';
  await page.waitForFunction(sel => {
    const el = document.querySelector(sel);
    return Boolean(el && !el.hidden && getComputedStyle(el).display !== 'none');
  }, content);
}
try {
  await mkdir(output, {recursive:true});
  const context = await browser.newContext({viewport:{width:1440,height:960},acceptDownloads:true});
  contexts.push(context);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  await page.goto(url, { waitUntil:'load' });
  await page.locator('#todayView .bs-project-overview').waitFor();
  assert.ok((await page.locator('#bsOverviewTitle').innerText()).length > 0);
  assert.match(await page.locator('#bsOverviewStatus').innerText(), /端末/);

  await goTo(page, 'gantt');
  assert.ok(await page.locator('#scheduleViewport').isVisible());
  assert.ok(await page.locator('#miniMap').isVisible());
  assert.ok(await page.locator('#addRow').isVisible());

  await goTo(page, 'network');
  assert.ok(await page.locator('#networkSvg').isVisible());

  await goTo(page, 'priority');
  const rows = page.locator('#priorityView .ws-task-row');
  assert.ok(await rows.count() > 0, 'Tasks should still render');
  const prioritySelect = page.locator('#priorityView select[data-priority]').first();
  if (await prioritySelect.count()) {
    await prioritySelect.selectOption('1');
    await page.waitForTimeout(150);
    assert.ok(await page.locator('#priorityView .ws-task-row[data-priority-level="1"]').count() >= 1,
      'Priority 1 should use large visual treatment');
  }

  await goTo(page, 'projects');
  const name = page.locator('#projectsView input[data-project-field="name"]');
  await name.fill('統合デザイン検証現場');
  await name.press('Tab');
  await page.waitForTimeout(150);
  assert.match(await page.locator('.project-title strong').innerText(), /統合デザイン検証現場/);

  await goTo(page, 'progress');
  assert.ok(await page.locator('#progressView .ws-ring').count() >= 2);

  await goTo(page, 'reports');
  assert.ok(await page.locator('#reportsView .ws-report-table').isVisible());
  assert.ok((await page.locator('#reportsView .ws-report-table th').count()) >= 7);

  await goTo(page, 'settings');
  assert.ok(await page.locator('#settingsView #bsCloudStatus').isVisible());
  assert.match(await page.locator('#bsCloudStatus').innerText(), /未接続/);

  await goTo(page, 'today');
  assert.match(await page.locator('#bsOverviewTitle').innerText(), /統合デザイン検証現場/);
  await page.screenshot({path:output+'/desktop.png',fullPage:true});

  // Mobile uses the existing drawer navigation, not a new fake route.
  const mobile = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  contexts.push(mobile);
  const m = await mobile.newPage();
  m.on('pageerror', error => errors.push('Mobile: '+error.message));
  await m.goto(url, {waitUntil:'load'});
  await m.locator('#mobileMenu').click();
  assert.ok(await m.locator('#appSidebar').evaluate(el => el.classList.contains('open')),
    'Mobile sidebar did not open');
  await m.locator('.sidebar-nav [data-screen="priority"]').click();
  await m.locator('#priorityView').waitFor();
  assert.ok(await m.locator('#priorityView').isVisible(), 'Priority view is not mobile navigable');
  await m.screenshot({path:output+'/mobile.png',fullPage:true});

  assert.deepEqual(errors, [], 'Browser console/runtime errors');
  console.log('PASS: desktop navigation, gantt, network, priorities, project name, progress, reports, settings and mobile menu');
  console.log('Screenshots: tests-output/desktop.png, tests-output/mobile.png');
} finally {
  for(const c of contexts) await c.close();
  await browser.close();
  await new Promise((ok,reject)=>server.close(e=>e?reject(e):ok()));
}
