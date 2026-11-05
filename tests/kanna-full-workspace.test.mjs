import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Script } from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const text = name => readFileSync(join(root, name), 'utf8');
const html = text('index.html');
const theme = text('kanna-workspace.css');
const themeJs = text('kanna-workspace.js');
const workspace = text('field-workspace.js');
const priorities = text('priority-visual-hierarchy.css');

test('the new integration does not remove any original UI controls', () => {
  for (const id of [
    'todayView','todayTasks','nextTasks','gantt','network','networkSvg',
    'scheduleViewport','scheduleCanvas','dates','rows','miniMap','miniWindow',
    'addRow','fit','inspector','saveTaskDates','taskName','taskStart','taskEnd',
    'taskPred','deleteTask','reset','helpDialog','quickUpdateFab'
  ]) {
    // Some dynamic controls are created by existing JavaScript, not index.html.
    const found = new RegExp('(?:id=["\\u0027]' + id + '["\\u0027]|\\b' + id + '\\b)').test(
      html + text('field-runtime.js') + text('field-quick-update.js'));
    assert.ok(found, 'Original control missing: ' + id);
  }
});

test('load all original modules in original order before visual extension', () => {
  const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(match => match[1].split('?')[0]);
  const expected = [
    'app.js','schedule-dependencies.js','field-runtime.js',
    'sidebar-dashboard.js','sketch-network.js','field-workspace.js','kanna-workspace.js'
  ];
  let previous = -1;
  for (const file of expected) {
    assert.ok(existsSync(join(root, file)), 'Missing script ' + file);
    const pos = scripts.indexOf(file);
    assert.ok(pos > previous, 'Script order incorrect: ' + file);
    previous = pos;
  }
});

test('retain and load existing feature styles', () => {
  const css = [...html.matchAll(/<link\b[^>]*href="([^"]+\.css(?:\?[^"]*)?)"/g)]
    .map(match => match[1].split('?')[0]);
  for (const file of [
    'style.css','field-today.css','field-status.css','field-lookahead.css',
    'field-quick-update.css','field-offline.css','sidebar-dashboard.css',
    'field-workspace.css','priority-visual-hierarchy.css','kanna-workspace.css'
  ]) {
    assert.ok(css.includes(file), 'Missing stylesheet ' + file);
    assert.ok(existsSync(join(root, file)), 'Cannot read ' + file);
  }
  assert.ok(css.indexOf('priority-visual-hierarchy.css') < css.indexOf('kanna-workspace.css'));
});

test('theme JS and existing workspace JS have valid syntax', () => {
  assert.doesNotThrow(() => new Script(themeJs));
  assert.doesNotThrow(() => new Script(workspace));
});

test('current project summary uses real progress values and safe text', () => {
  assert.match(themeJs, /reduce\(\(n, task\) => n \+/);
  assert.match(themeJs, /title\.textContent = currentProjectName\(\)/);
  assert.match(themeJs, /description\.textContent/);
  assert.doesNotMatch(themeJs, /innerHTML\s*=/, 'No user data should be directly inserted as HTML');
  assert.doesNotMatch(themeJs, /localStorage\.setItem/);
});

test('overview re-renders when tasks or project are updated', () => {
  assert.match(workspace, /document\.dispatchEvent\(new Event\('building-schedule:render'\)\)/);
  assert.match(themeJs, /document\.addEventListener\('building-schedule:render'/);
});

test('priority card area is based on priority instead of display rank', () => {
  assert.match(workspace, /data-priority-level/);
  assert.match(workspace, /data-completed/);
  assert.match(priorities, /data-priority-level="1"/);
  assert.match(priorities, /data-priority-level="2"/);
  assert.match(theme, /#priorityView/);
});

test('original task operations remain in field-workspace and editor', () => {
  for (const marker of [
    'data-priority','data-move-up','data-move-down','data-progress-step',
    'data-project-field','data-report-type','exportCSV','exportJSON',
    'function renderProjects','function renderProgress','function renderReports',
    'function renderSettings'
  ]) assert.ok(workspace.includes(marker), 'Missing original feature: ' + marker);
  const app = text('app.js');
  for (const marker of ['deleteTask','saveTaskDates','taskPred','miniMap']) {
    assert.ok(html.includes(marker) || app.includes(marker), 'Missing editing feature: ' + marker);
  }
});

test('mobile, print and reduced motion are supported', () => {
  for (const breakpoint of [1250,900,700,430]) {
    assert.ok(theme.includes('@media(max-width:' + breakpoint + 'px)'), 'Missing media breakpoint ' + breakpoint);
  }
  assert.match(theme, /@media print/);
  assert.match(theme, /prefers-reduced-motion/);
  assert.match(theme, /:focus-visible/);
});

test('honest infrastructure messaging, no fake public share links', () => {
  assert.match(themeJs, /LocalStorage|localStorage/);
  assert.match(themeJs, /QRによる共有は準備中/);
  assert.match(themeJs, /別の端末へURLだけを送っても工程は共有されません/);
  assert.doesNotMatch(themeJs, /https:\/\/[^"'\s]+\/share\//, 'Never claim a functional share URL');
});

test('the built-in app icon resolves locally rather than emitting a 404', () => {
  assert.match(html, /<link rel="icon"[^>]*href="favicon.svg"/);
  assert.ok(existsSync(join(root, 'favicon.svg')));
});

test('no KANNA-specific logo, remote artwork or code copied into the app', () => {
  assert.doesNotMatch(theme, /url\(["']?https?:\/\/[^)]/);
  assert.doesNotMatch(themeJs, /<img\b|https?:\/\/(?:lp\.kanna4u\.com|aldagram\.com)/);
  assert.ok(theme.includes('--brand:#155b48'));
});
