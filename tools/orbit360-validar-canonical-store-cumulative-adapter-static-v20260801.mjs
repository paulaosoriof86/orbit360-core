#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE='block7-canonical-store-cumulative-adapter-static-v20260801';
const VERSION='7.10.0';
const BASELINE='a0c430d7ae2856b5fe45207fb0820dcd9bb45809';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/canonical-store-cumulative-adapter-static-v20260801.json');
const CANONICAL_DIGEST='19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b';
const CANONICAL=['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
const ALLOWED_DELTA=[
  'orbit360-platform/index.html',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-canonical-view-sync.js',
  'orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js',
  'orbit360-platform/data/store-firestore-lab.local.js'
].sort();
const FILES={
  index:'orbit360-platform/index.html',
  store:'orbit360-platform/data/store-firestore-lab.local.js',
  init:'orbit360-platform/core/backend-lab-init.js',
  sync:'orbit360-platform/core/backend-lab-canonical-view-sync.js',
  bridge:'orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js',
  oldBridge:'orbit360-platform/core/backend-lab-receipts-portfolio-projection-v910.js',
  gate79:'tools/orbit360-validator-lifecycle-contract-policies-full-canonical-revalidation-readonly-v20260801.json'
};

function text(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}
function sha(value){return crypto.createHash('sha256').update(String(value)).digest('hex');}
function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsDocumentIds:false,containsValues:false,containsSecrets:false},null,2)+'\n','utf8');}
function lines(cmd,args){return execFileSync(cmd,args,{cwd:ROOT,encoding:'utf8'}).split(/\r?\n/).map(v=>v.trim()).filter(Boolean);}
function manifest(){
  const roots=['orbit360-platform/index.html','orbit360-platform/modules','orbit360-platform/core','orbit360-platform/styles','orbit360-platform/data'];
  const files=lines('git',['ls-files','--',...roots]).filter(file=>!file.includes('/runtime-gate-')).sort();
  const rows=files.map(file=>({file,digest:sha(fs.readFileSync(path.join(ROOT,file)))}));
  const counts={index:files.filter(f=>f==='orbit360-platform/index.html').length,modules:files.filter(f=>f.startsWith('orbit360-platform/modules/')).length,core:files.filter(f=>f.startsWith('orbit360-platform/core/')).length,styles:files.filter(f=>f.startsWith('orbit360-platform/styles/')).length,data:files.filter(f=>f.startsWith('orbit360-platform/data/')).length};
  return{trackedFileCount:rows.length,pathDigest:sha(rows.map(r=>r.file).join('\n')),contentDigest:sha(rows.map(r=>`${r.file}:${r.digest}`).join('\n')),indexDigest:rows.find(r=>r.file==='orbit360-platform/index.html')?.digest||'',counts};
}
function syntax(rel){const run=spawnSync(process.execPath,['--check',rel],{cwd:ROOT,encoding:'utf8'});return{ok:run.status===0,error:String(run.stderr||run.stdout||'').trim().slice(0,300)};}
function functionBody(source,name){const start=source.indexOf(`function ${name}(`);if(start<0)return'';let brace=source.indexOf('{',start),depth=0;for(let i=brace;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'){depth--;if(depth===0)return source.slice(start,i+1);}}return'';}
function matches(source,pattern){return pattern.test(source);}
function sortedEqual(a,b){return JSON.stringify([...a].sort())===JSON.stringify([...b].sort());}

const checks=[];
function check(id,ok,detail){checks.push({id,ok:Boolean(ok),detail:detail===undefined?null:detail});}
const result={schemaVersion:'orbit360-canonical-store-cumulative-adapter-static-evidence-v1',gateId:GATE,contractVersion:VERSION,status:'STARTED',classification:'STATIC_ARCHITECTURE_VALIDATION',baseline:BASELINE,canonicalSnapshotDigest:CANONICAL_DIGEST,checks:[],runtimeDelta:[],manifest:{},api:{},ownership:{},routing:{},seedPolicy:{},moduleScan:{},firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,previewExecuted:false,deployExecuted:false,productionTouched:false,mainTouched:false,mergeExecuted:false,ok:false};
try{
  for(const rel of Object.values(FILES))check(`FILE_${rel}`,fs.existsSync(path.join(ROOT,rel)));
  if(checks.some(c=>!c.ok))throw new Error('PIPELINE_MECHANISM_FAILURE:REQUIRED_FILES');

  const lifecycle=JSON.parse(text('tools/orbit360-validator-lifecycle-contract-canonical-store-cumulative-adapter-static-v20260801.json'));
  const gate79=JSON.parse(text(FILES.gate79));
  check('LIFECYCLE',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.status==='CANONICAL_STORE_CUMULATIVE_ADAPTER_STATIC_AUTHORIZED');
  check('AUTHORIZATION',lifecycle.authorization?.explicit===true&&lifecycle.authorization?.allowedExecutions===1&&lifecycle.authorization?.consumed===false&&lifecycle.authorization?.authorizationRef==='user_proceed_definitive_solutions_no_trial_error_20260801');
  check('ZERO_CAPABILITY',Object.values(lifecycle.executionProfile?.capabilities||{}).every(v=>v===false)&&lifecycle.executionProfile?.phase==='STATIC_PREFLIGHT');
  check('GATE_79_CLOSED',gate79.status==='POLICIES_FULL_CANONICAL_REVALIDATION_READONLY_CLOSED'&&gate79.sealedState?.canonicalSnapshotDigest===CANONICAL_DIGEST&&gate79.guards?.additionalExecutionsAllowed===false);

  const runtimeDelta=lines('git',['diff','--name-only',`${BASELINE}..HEAD`,'--','orbit360-platform/index.html','orbit360-platform/core','orbit360-platform/modules','orbit360-platform/styles','orbit360-platform/data']).sort();
  result.runtimeDelta=runtimeDelta;
  check('RUNTIME_DELTA_EXACT',sortedEqual(runtimeDelta,ALLOWED_DELTA),{expected:ALLOWED_DELTA,actual:runtimeDelta});
  check('MODULES_UNCHANGED',runtimeDelta.every(f=>!f.startsWith('orbit360-platform/modules/')));
  check('STYLES_UNCHANGED',runtimeDelta.every(f=>!f.startsWith('orbit360-platform/styles/')));

  const index=text(FILES.index),store=text(FILES.store),init=text(FILES.init),sync=text(FILES.sync),bridge=text(FILES.bridge);
  const syntaxResults={};
  [FILES.store,FILES.init,FILES.sync,FILES.bridge].forEach(rel=>{syntaxResults[rel]=syntax(rel);check(`SYNTAX_${rel}`,syntaxResults[rel].ok,syntaxResults[rel].error);});

  check('INDEX_CACHE_VERSION',index.includes('core/backend-lab-loader.js?v=20260801-canonical-v79')&&index.includes('core/backend-lab-init.js?v=20260801-canonical-v79')&&index.includes('data/store-firestore-lab.local.js?v=20260801-canonical-v79'));
  check('INDEX_SINGLE_STORE_ADAPTER',(index.match(/data\/store-firestore-lab\.local\.js/g)||[]).length===1);
  check('INDEX_MODULE_BOOTSTRAP_PRESERVED',index.includes('modules/cliente360.js')&&index.includes('modules/polizas.js')&&index.includes('modules/cobros.js')&&index.includes('modules/aseguradoras.js')&&index.includes('modules/finanzas.js')&&index.includes('modules/academia.js'));

  const apiNames=['all','get','where','find','insert','update','remove','on','_emit','pref','setPref','init','reseed','raw'];
  const apiMissing=apiNames.filter(name=>!new RegExp(`(?:^|[,\\s])${name}\\s*:`,'m').test(store));
  result.api={required:apiNames,missing:apiMissing};
  check('PUBLIC_API_COMPLETE',apiMissing.length===0,apiMissing);
  check('STORE_EXTENSIONS_PRESERVED',store.includes('subscribe: on')&&store.includes('_subscribe: on')&&store.includes('_attachSnapshots: attachSnapshots')&&store.includes('_detachSnapshots: detachSnapshots'));
  check('STORE_NO_LOCALSTORAGE',!store.includes('localStorage'));
  check('STORE_NO_SEED_FALLBACK',store.includes('noFallback: true')&&!store.includes('Orbit.SEED'));
  check('STORE_CANONICAL_DIGEST',store.includes(CANONICAL_DIGEST)&&init.includes(CANONICAL_DIGEST));
  check('STORE_SINGLE_OWNER_MARKERS',store.includes('__canonicalReadModelV79: true')&&store.includes('__singleReadOwner: true')&&store.includes("singleReadOwner: true"));

  const canonicalMissing=CANONICAL.filter(name=>!store.includes(`'${name}'`));
  check('CANONICAL_COLLECTION_SET',canonicalMissing.length===0,canonicalMissing);
  check('CANONICAL_PATH',store.includes("database.collection('tenants').doc(tenantId)")&&store.includes(".collection('data').doc(collection).collection('items')")&&store.includes("'tenants/' + tenantId + '/data/' + collection + '/items'"));
  check('LEGACY_UNMIGRATED_PATH',store.includes("database.collection('tenantId').doc(tenantId).collection(collection)")&&store.includes("'tenantId/' + tenantId + '/' + collection"));
  check('PER_COLLECTION_AUTHORITY',store.includes("CANONICAL_SET.has(collection) ? 'canonical-v79' : 'legacy-unmigrated'")&&store.includes('_collectionAuthority: collectionAuthority'));
  result.routing={canonicalCollections:CANONICAL,canonicalPath:'tenants/{tenantId}/data/{collection}/items',legacyUnmigratedPath:'tenantId/{tenantId}/{collection}',perCollection:true};

  const operationalBody=functionBody(store,'operationalRows');
  check('CENTRAL_SEED_EXCLUSION',operationalBody.includes('seedLike(row)')&&operationalBody.includes('CANONICAL_SET.has(collection)'));
  check('VALIDATION_NOT_FILTERED',!/requiereValidacion|validationStatus|estadoValidacion|calidad_datos/.test(operationalBody));
  check('SEEDS_VISIBLE_ONLY_IN_INTERNAL_CACHE',store.includes('rawCounts')&&store.includes('operationalCounts')&&store.includes('excludedSeedCounts')&&store.includes('cache: cache'));
  result.seedPolicy={operationalSeedExclusion:true,requiresValidationPreserved:true,internalAuditCache:true};

  check('INIT_FEATURE_FLAGS',init.includes('canonicalReadModelV79: true')&&init.includes('canonicalStoreSingleOwner: true')&&init.includes('canonicalSeedExclusion: true'));
  check('SYNC_LOADS_NATIVE_BRIDGE',sync.includes('backend-lab-receipts-portfolio-native-bridge-v20260801.js')&&sync.includes('Orbit.receiptsPortfolioProjectionV920'));
  check('SYNC_DOES_NOT_LOAD_OLD_BRIDGE',!sync.includes('backend-lab-receipts-portfolio-projection-v910.js')&&!sync.includes('receiptsPortfolioProjectionV910'));

  const forbiddenBridgePatterns=[/firebase\s*\./,/onSnapshot\s*\(/,/\.collection\s*\(/,/\bcache\s*=\s*\{/];
  const bridgeViolations=forbiddenBridgePatterns.filter(p=>p.test(bridge)).map(p=>String(p));
  check('BRIDGE_NO_DIRECT_FIRESTORE',bridgeViolations.length===0,bridgeViolations);
  check('BRIDGE_NO_STORE_OVERRIDE',!/(Orbit\.store|\bS)\.(all|get|where|find|insert|update|remove)\s*=/.test(bridge));
  check('BRIDGE_STORE_ONLY_OWNER',bridge.includes("storeOwner:'Orbit.store'")&&bridge.includes('directFirestoreListeners:0')&&bridge.includes('parallelCache:false')&&bridge.includes('Orbit.store.where')&&bridge.includes('Orbit.store.get'));
  result.ownership={readOwner:'Orbit.store',directFirestoreListenersInBridge:0,parallelBridgeCache:false,visualBridgeOnly:true};

  let oldRuntimeRefs=[];
  try{oldRuntimeRefs=lines('git',['grep','-n','backend-lab-receipts-portfolio-projection-v910.js','--','orbit360-platform/index.html','orbit360-platform/core','orbit360-platform/data','orbit360-platform/modules']).filter(line=>!line.startsWith(FILES.oldBridge+':'));}catch(e){oldRuntimeRefs=[];}
  check('OLD_BRIDGE_NOT_LOADED',oldRuntimeRefs.length===0,oldRuntimeRefs);

  const moduleFiles=lines('git',['ls-files','--','orbit360-platform/modules']);
  const moduleViolations=[];
  const directPattern=/(firebase\s*\.\s*firestore|\.collection\s*\(\s*['"](?:tenantId|tenants)['"]|onSnapshot\s*\()/;
  for(const rel of moduleFiles){const source=text(rel);if(directPattern.test(source))moduleViolations.push(rel);}
  result.moduleScan={files:moduleFiles.length,directFirestoreViolations:moduleViolations};
  check('MODULES_USE_STORE_ONLY',moduleViolations.length===0,moduleViolations);
  check('MODULE_COUNT_PRESERVED',moduleFiles.length===62,moduleFiles.length);

  const mf=manifest();result.manifest=mf;
  check('CUMULATIVE_FILE_COUNTS',mf.counts.index===1&&mf.counts.modules===62&&mf.counts.core===183&&mf.counts.styles===10&&mf.counts.data===53&&mf.trackedFileCount===309,mf.counts);
  check('INDEX_PRESENT_IN_MANIFEST',Boolean(mf.indexDigest));

  const failed=checks.filter(c=>!c.ok);
  result.checks=checks;
  result.summary={totalChecks:checks.length,passedChecks:checks.length-failed.length,failedChecks:failed.length,failedCheckIds:failed.map(c=>c.id),allowedRuntimeDeltaFiles:ALLOWED_DELTA.length,actualRuntimeDeltaFiles:runtimeDelta.length,modulesPreserved:moduleFiles.length,canonicalCollections:CANONICAL.length,newTrackedFileCount:mf.trackedFileCount};
  if(failed.length)throw new Error('FUNCTIONAL_DEFECT:STATIC_CONTRACT_FAILED');
  result.status='CANONICAL_STORE_CUMULATIVE_ADAPTER_STATIC_PASS';
  result.classification='GO_STATIC_CANONICAL_STORE_ADAPTER';
  result.ok=true;
}catch(error){
  const failed=checks.filter(c=>!c.ok);
  result.checks=checks;
  result.status='CANONICAL_STORE_CUMULATIVE_ADAPTER_STATIC_FAIL';
  result.classification=String(error&&error.message||error).split(':')[0]||'FUNCTIONAL_DEFECT';
  result.error=String(error&&error.message||error).slice(0,500);
  result.summary={totalChecks:checks.length,passedChecks:checks.length-failed.length,failedChecks:Math.max(1,failed.length),failedCheckIds:failed.map(c=>c.id)};
  result.ok=false;
}
save(result);console.log(JSON.stringify(result,null,2));process.exit(result.ok?0:41);
