import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(resolve(root, file), 'utf8');
const net = read('sketch-network.js');
const style = read('field-workspace.css');
const side = read('sidebar-dashboard.css');
const html = read('index.html');

test('original network implementation parses and remains callable', () => {
  assert.doesNotThrow(() => new Script(net));
  for (const capability of [
    'drawNetwork=()=>', 'function networkModel()', 'applyNetworkZoom(false)',
    'networkZoomSteps', 'networkWarning', 'networkLegend',
    "svg.innerHTML=", 'data-net-id'
  ]) assert.ok(net.includes(capability), capability);
});

test('rendered arrows stop before the next node instead of being covered', () => {
  assert.match(net, /const fromX=p\.x\+211\+5, toX=q\.x-15/);
  assert.match(net, /const bend=Math\.min\(31,\(toX-fromX\)\/2\.5\)/);
  assert.match(net, /L'\+targetX\+' '\+targetY/);
});

test('filled arrowhead size stays constant regardless of line width', () => {
  assert.match(net, /markerUnits="userSpaceOnUse"/);
  assert.match(net, /viewBox="0 0 16 16"/);
  assert.match(net, /markerWidth="16" markerHeight="16"/);
  assert.match(net, /M2 2 L14 8 L2 14 Z/);
  assert.doesNotMatch(net, /context-stroke/);
});

test('neutral and critical dependency links use matching marker colors', () => {
  assert.match(net, /markerDef\('netArrow','#718e7a'\)/);
  assert.match(net, /markerDef\('netArrowCritical','#2563eb'\)/);
  assert.match(style, /\.net-edge\{[^}]*marker-end:url\(#netArrow\)/);
  assert.match(style, /\.net-edge\.net-critical\{[^}]*marker-end:url\(#netArrowCritical\)/);
});

test('sidebar chevron has its own SVG viewport and cannot flex-shrink', () => {
  assert.match(html, /<svg class="sidebar-chevron" viewBox="0 0 24 24" aria-hidden="true"/);
  assert.match(side, /\.sidebar-chevron\{[^}]*flex:0 0 18px/);
  assert.match(side, /\.sidebar-chevron\{[^}]*stroke:currentColor/);
});

test('fresh scripts and styles load via versioned URLs', () => {
  for (const filename of ['sketch-network.js','sidebar-dashboard.css','field-workspace.css']) {
    assert.ok(html.includes(filename+'?v=20261105-arrowhead-fix-1'), filename);
  }
});
