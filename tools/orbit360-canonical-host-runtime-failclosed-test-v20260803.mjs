#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('orbit360-platform/core/backend-lab-loader.js', 'utf8');
const checks = [];
const add = (id, ok, detail='') => checks.push({id, ok:Boolean(ok), detail:String(detail)});

function runScenario({hostname, search='', hash=''}) {
  let replaced = '';
  const writes = [];
  const window = {
    location: {
      hostname,
      search,
      hash,
      replace(value) { replaced = String(value); }
    },
    OrbitBackend: undefined
  };
  const document = { write(value) { writes.push(String(value)); } };
  const context = {
    window,
    document,
    URLSearchParams,
    console: { log(){}, warn(){}, error(){} },
    Object,
    String,
    Array,
    RegExp,
    encodeURIComponent
  };
  vm.runInNewContext(source, context, {filename:'backend-lab-loader.js'});
  return {window, replaced, writes};
}

const direct = runScenario({hostname:'ays-orbit-360-lab.web.app',hash:'#/cliente360'});
add('CANONICAL_DIRECT_REDIRECT', direct.replaced === 'index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones&runtime=20260717-2#/cliente360', direct.replaced);
add('CANONICAL_DIRECT_NO_SCRIPT_FALLTHROUGH', direct.writes.length === 0, direct.writes.length);

const normalized = runScenario({
  hostname:'ays-orbit-360-lab.web.app',
  search:'?orbitBackend=firestore-lab&tenant=alianzas-soluciones&runtime=20260717-2',
  hash:'#/cliente360'
});
add('CANONICAL_NORMALIZED_NO_REDIRECT', normalized.replaced === '', normalized.replaced);
add('CANONICAL_NORMALIZED_MODE', normalized.window.OrbitBackend?.mode === 'firestore-lab');
add('CANONICAL_NORMALIZED_TENANT', normalized.window.OrbitBackend?.tenantId === 'alianzas-soluciones');
add('CANONICAL_NORMALIZED_NO_FALLBACK', normalized.window.OrbitBackend?.noFallback === true);
add('CANONICAL_NORMALIZED_HOST_FLAG', normalized.window.OrbitBackend?.canonicalHost === true);
add('CANONICAL_NORMALIZED_FIREBASE_REQUESTED', normalized.window.OrbitBackend?.firebaseLoader === 'requested');
add('CANONICAL_NORMALIZED_SDK_COUNT', normalized.writes.length === 4, normalized.writes.length);
add('CANONICAL_NORMALIZED_RESERVED_CONFIG', normalized.writes.some(x => x.includes('/__/firebase/init.js')));

const firebaseAlias = runScenario({hostname:'ays-orbit-360-lab.firebaseapp.com',hash:'#/polizas'});
add('FIREBASE_ALIAS_REDIRECT', firebaseAlias.replaced.endsWith('#/polizas'), firebaseAlias.replaced);

const preview = runScenario({hostname:'ays-orbit-360-lab--orbit360-ays-lab-abc123.web.app',hash:'#/cobros'});
add('PREVIEW_REDIRECT_PRESERVED', preview.replaced.endsWith('#/cobros'), preview.replaced);

const local = runScenario({hostname:'localhost',hash:'#/cliente360'});
add('LOCAL_DEMO_BEHAVIOR_PRESERVED', local.replaced === '' && !local.window.OrbitBackend && local.writes.length === 0);

add('SOURCE_DECLARES_FAIL_CLOSED', source.includes("loaderVersion: 'v1.112-canonical-host-fail-closed'") && source.includes('noSeedAsSource: true'));
add('SOURCE_EXCLUDES_DEMO_CREDENTIALS', !source.includes('admin@demo.com') && !source.includes('demo123'));

const failed = checks.filter(x => !x.ok);
const result = {
  schemaVersion:'orbit360-canonical-host-runtime-failclosed-test-v1',
  status:failed.length ? 'FAIL' : 'PASS',
  classification:failed.length ? 'FUNCTIONAL_DEFECT' : 'GO_STATIC_RUNTIME_ROOT_FIX',
  total:checks.length,
  passed:checks.length-failed.length,
  failed:failed.length,
  failedCheckIds:failed.map(x=>x.id),
  checks,
  containsPII:false,
  containsSecrets:false,
  firestoreRead:false,
  firestoreWrites:0,
  deployExecuted:false,
  productionTouched:false
};
console.log(JSON.stringify(result,null,2));
process.exit(failed.length ? 41 : 0);
