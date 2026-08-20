#!/usr/bin/env node
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const need = (cond, code, details={}) => {
  if (!cond) {
    console.error(JSON.stringify({ok:false,classification:'PIPELINE_MECHANISM_FAILURE',code,...details},null,2));
    process.exit(1);
  }
};

const polizas = read('orbit360-platform/modules/polizas.js');
const kit = read('orbit360-platform/core/crmkit.js');
const queries = read('orbit360-platform/core/queries.js');
const store = read('orbit360-platform/data/store-firestore-product-readonly-p0.js');
const runtime = read('tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs');

need(/const PAGE\s*=\s*100/.test(polizas), 'POLIZAS_PAGE_SIZE_CONTRACT_CHANGED');
need(/K\.clienteCell\(p\.clienteId\)/.test(polizas), 'POLIZAS_CLIENT_CELL_PATH_MISSING');
need(/K\.aseguradoraCell\(p\.aseguradoraId\)/.test(polizas), 'POLIZAS_INSURER_CELL_PATH_MISSING');
need(/K\.asesorCell\(p\.asesorId\)/.test(polizas), 'POLIZAS_ADVISOR_CELL_PATH_MISSING');
need(/function clienteCell\(cliId\)[\s\S]*?S\(\)\.get\('clientes',\s*cliId\)/.test(kit), 'KIT_CLIENT_GET_PATH_MISSING');
need(/function asesorCell\(aseId\)[\s\S]*?q\.asesor\(aseId\)/.test(kit), 'KIT_ADVISOR_QUERY_PATH_MISSING');
need(/function aseguradoraCell\(asgId\)[\s\S]*?q\.aseguradora\(asgId\)/.test(kit), 'KIT_INSURER_QUERY_PATH_MISSING');
need(/function asesor\(id\)\s*\{\s*return S\(\)\.get\('asesores',\s*id\);\s*\}/.test(queries), 'QUERY_ADVISOR_GET_PATH_MISSING');
need(/function aseguradora\(id\)\s*\{\s*return S\(\)\.get\('aseguradoras',\s*id\);\s*\}/.test(queries), 'QUERY_INSURER_GET_PATH_MISSING');
need(/function all\(collection\)\s*\{\s*return \(cache\[collection\] \|\| \[\]\)\.map\(clone\);\s*\}/.test(store), 'PRODUCT_STORE_ALL_CLONE_PATH_CHANGED');
need(/function get\(collection, id\)\s*\{\s*return all\(collection\)\.find/.test(store), 'PRODUCT_STORE_GET_FULL_COLLECTION_CLONE_PATH_CHANGED');
need(/timeout:\s*20000/.test(runtime), 'F2_RUNTIME_ROUTE_TIMEOUT_CHANGED');

const pageRows = 100;
const rowReferenceGets = pageRows * 3;
const observed = { polizas: 1375, clientes: 430, vehiculos: 1033, recibos: 1294, aseguradoras: 26, asesores: 7 };
const clonedRowsForReferenceColumns = pageRows * observed.clientes + pageRows * observed.aseguradoras + pageRows * observed.asesores;

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function makeRows(n, payloadSize=256) {
  const payload='x'.repeat(payloadSize);
  return Array.from({length:n},(_,i)=>({id:`id-${i}`,nombre:`Row ${i}`,payload,nested:{a:payload,b:i}}));
}
const cache={
  clientes: makeRows(observed.clientes, 512),
  aseguradoras: makeRows(observed.aseguradoras, 128),
  asesores: makeRows(observed.asesores, 128)
};
let legacyCloneRows=0;
let fixedCloneRows=0;
function legacyAll(c){legacyCloneRows += cache[c].length; return cache[c].map(clone);}
function legacyGet(c,id){return legacyAll(c).find(r=>r.id===id)||null;}
function fixedGet(c,id){const row=cache[c].find(r=>r.id===id); if(!row)return null; fixedCloneRows += 1; return clone(row);}

for(let i=0;i<pageRows;i++){
  legacyGet('clientes',`id-${i%observed.clientes}`);
  legacyGet('aseguradoras',`id-${i%observed.aseguradoras}`);
  legacyGet('asesores',`id-${i%observed.asesores}`);
}
for(let i=0;i<pageRows;i++){
  fixedGet('clientes',`id-${i%observed.clientes}`);
  fixedGet('aseguradoras',`id-${i%observed.aseguradoras}`);
  fixedGet('asesores',`id-${i%observed.asesores}`);
}

need(legacyCloneRows === clonedRowsForReferenceColumns, 'AMPLIFICATION_COUNT_UNEXPECTED', {legacyCloneRows,clonedRowsForReferenceColumns});
need(fixedCloneRows === rowReferenceGets, 'FIXED_COUNT_UNEXPECTED', {fixedCloneRows,rowReferenceGets});
const amplification = legacyCloneRows / fixedCloneRows;
need(amplification > 100, 'AMPLIFICATION_NOT_MATERIAL', {amplification});

console.log(JSON.stringify({
  ok:true,
  status:'F2_POLIZAS_READ_AMPLIFICATION_SOURCE_PROOF_PASS',
  classification:'FUNCTIONAL_DEFECT',
  code:'F2_PRODUCT_READONLY_GET_FULL_COLLECTION_CLONE_AMPLIFICATION',
  sourceChain:[
    'modules/polizas.js:100 visible rows x clienteCell+aseguradoraCell+asesorCell',
    'core/crmkit.js:cell helpers -> store.get / q lookups',
    'core/queries.js:q.asesor/q.aseguradora -> store.get',
    'data/store-firestore-product-readonly-p0.js:get -> all(collection) -> map(clone)'
  ],
  observedCollectionSizes:observed,
  visiblePageRows:pageRows,
  storeGetCallsForReferenceColumns:rowReferenceGets,
  legacyRowsSerializedAndClonedForReferenceColumns:legacyCloneRows,
  findThenCloneOneRows:fixedCloneRows,
  rowCloneAmplificationFactor:Number(amplification.toFixed(2)),
  safetyProperty:'find-then-clone-one preserves caller isolation while avoiding full-collection cloning',
  runtimeCorrelation:{route:'desktopDirection:polizas',waiterTimeoutMs:20000,observedElapsedMs:64680,capturedContractVisible:true},
  browser:false,secrets:false,firestore:false,writes:0,productMutation:false
},null,2));
