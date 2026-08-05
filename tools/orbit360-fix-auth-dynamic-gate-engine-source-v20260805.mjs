#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
const FILE = 'tools/orbit360-validar-gate-contracts-engine-auth-foundation-roster-resolution-and-runtime-v20260805.mjs';
let source = fs.readFileSync(FILE, 'utf8');
const broken = `  add('INITIAL_BRIDGES_EXPLICIT_MIGRATION_ONLY', bridge.includes("orbitInitialAdvisorMigration') === '1'") && catalog.includes("orbitInitialAdvisorMigration') === '1'"));`;
const fixed = `  add('INITIAL_BRIDGES_EXPLICIT_MIGRATION_ONLY', bridge.includes("orbitInitialAdvisorMigration') === '1'") && catalog.includes("orbitInitialAdvisorMigration') === '1'"));`;
if (source.includes(broken)) {
  source = source.replace(broken, fixed.slice(0, -1));
}
if (source.includes("INITIAL_BRIDGES_EXPLICIT_MIGRATION_ONLY', bridge.includes") && source.includes("=== '1'\"));")) {
  source = source.replace("=== '1'\"));", "=== '1'\"));");
}
fs.writeFileSync(FILE, source, 'utf8');
console.log(JSON.stringify({ok:true,file:FILE}));
