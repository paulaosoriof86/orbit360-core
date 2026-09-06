import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const productRoot = path.resolve(process.cwd(), 'orbit360-platform');
const queue = ['index.html', 'product-runtime-config.js', 'sw.js'];
const seen = new Set();
const textExt = new Set(['.html','.js','.css','.json','.webmanifest','.svg']);
const assetExt = '(?:js|css|json|webmanifest|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|pdf)';
const generic = new RegExp('(?<![A-Za-z0-9_])(/?(?:[A-Za-z0-9_.-]+/)*[A-Za-z0-9_.-]+\\.' + assetExt + ')(?:\\?[^\\s\'\"<>)]*)?', 'g');
const htmlRef = /(?:src|href)=["']([^"']+)["']/gi;
const cssRef = /url\((?:["']?)([^)"']+)/gi;

function normalize(raw, parent = '') {
  raw = String(raw || '').trim().split('#', 1)[0].split('?', 1)[0];
  if (!raw || /^(?:https?:|data:|blob:|mailto:|tel:|#|\/\/)/i.test(raw)) return null;
  let candidate;
  if (raw.startsWith('/')) candidate = raw.slice(1);
  else if (raw.startsWith('./') || raw.startsWith('../')) candidate = path.posix.normalize(path.posix.join(path.posix.dirname(parent), raw));
  else candidate = raw;
  candidate = candidate.replace(/^\.\//, '');
  if (candidate === '..' || candidate.startsWith('../')) return null;
  return candidate;
}

function resolved(rel) {
  const full = path.resolve(productRoot, rel);
  assert.ok(full === productRoot || full.startsWith(productRoot + path.sep), `PATH_ESCAPE:${rel}`);
  return full;
}

function enqueue(rel) {
  if (!rel || seen.has(rel) || queue.includes(rel)) return;
  const full = resolved(rel);
  if (fs.existsSync(full) && fs.statSync(full).isFile()) queue.push(rel);
}

while (queue.length) {
  const rel = queue.shift();
  if (seen.has(rel)) continue;
  const full = resolved(rel);
  assert.ok(fs.existsSync(full) && fs.statSync(full).isFile(), `REQUIRED_PRODUCT_FILE_MISSING:${rel}`);
  assert.ok(!/(^|\/)(?:lab|seeds?|demo-auth)(?:\/|[-_.])/i.test(rel), `FORBIDDEN_PRODUCT_DEPENDENCY:${rel}`);
  seen.add(rel);
  if (!textExt.has(path.extname(rel).toLowerCase())) continue;
  const text = fs.readFileSync(full, 'utf8');

  if (path.extname(rel).toLowerCase() === '.html') {
    htmlRef.lastIndex = 0;
    let match;
    while ((match = htmlRef.exec(text))) {
      const candidate = normalize(match[1], rel);
      if (!candidate) continue;
      const local = resolved(candidate);
      assert.ok(fs.existsSync(local) && fs.statSync(local).isFile(), `HTML_LOCAL_REFERENCE_MISSING:${rel}:${candidate}`);
      enqueue(candidate);
    }
  }

  if (path.extname(rel).toLowerCase() === '.css') {
    cssRef.lastIndex = 0;
    let match;
    while ((match = cssRef.exec(text))) enqueue(normalize(match[1], rel));
  }

  generic.lastIndex = 0;
  let match;
  while ((match = generic.exec(text))) enqueue(normalize(match[1], rel));
}

for (const required of [
  'index.html',
  'product-runtime-config.js',
  'sw.js',
  'core/product-app-p0.js',
  'core/pwa.js',
  'data/tenant-runtime-config-index.js',
  'data/store-firestore-product-readonly-p0.js',
  'data/store-firestore-product-operational-p0.js'
]) {
  assert.ok(seen.has(required), `REACHABILITY_CLOSURE_MISSING:${required}`);
}

for (const rel of seen) {
  assert.ok(!rel.startsWith('tools/'), `NON_PRODUCT_TREE_REACHED:${rel}`);
  assert.ok(!rel.startsWith('docs/'), `NON_PRODUCT_TREE_REACHED:${rel}`);
  assert.ok(!rel.startsWith('reports/'), `NON_PRODUCT_TREE_REACHED:${rel}`);
  assert.ok(!rel.startsWith('functions/'), `NON_PRODUCT_TREE_REACHED:${rel}`);
  assert.ok(!rel.startsWith('.github/'), `NON_PRODUCT_TREE_REACHED:${rel}`);
}

console.log(`I2_REACHABILITY_PASS files=${seen.size}`);
