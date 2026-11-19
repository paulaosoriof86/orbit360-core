'use strict';
// I6.6 source successor: test the exact client/cadence, role/finance and
// auth-first code that changed after the previous approved product manifest.
// Passing here is source QA, not acceptance of Preview or LIVE publication.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=file('orbit360-platform/index.html');
assert.match(html,/core\/product-runtime-browser-providers-p0\.js\?v=20261119-i66-auth-first/);
assert.match(html,/core\/auth-product-runtime-p0\.js\?v=20261119-i66-auth-first/);
assert.equal((html.match(/<html\b/g)||[]).length,1,'one canonical product document');
assert.doesNotMatch(html,/<script[^>]+src=["'][^"']*(?:auth-lab|seed-lab)[^"']*["']/i);

require('./gravicentra-i66-auth-first-startup.test.cjs');
require('./gravicentra-i66-existing-client-inspection-cadence.test.cjs');
require('./gravicentra-i6-6-management-catalog-client-projection.test.cjs');
require('./gravicentra-i6-6-advisor-financial-ownership.test.cjs');
