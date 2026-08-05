#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const files = [
  'tools/orbit360-test-auth-foundation-dynamic-team-runtime-source-v20260805.mjs',
  'tools/orbit360-validar-gate-contracts-engine-auth-foundation-roster-resolution-and-runtime-v20260805.mjs'
];

for (const file of files) {
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(
    `!/CANONICAL_COLLECTIONS\\s*=\\s*\\[[\\s\\S]*?'asesores'/.test(store)`,
    `!store.slice(store.indexOf('const CANONICAL_COLLECTIONS'), store.indexOf('];', store.indexOf('const CANONICAL_COLLECTIONS'))).includes("'asesores'")`
  );
  fs.writeFileSync(file, source, 'utf8');
}

console.log(JSON.stringify({ok:true,files}));
