'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const repo=process.env.GI_I66_OPS_TEST_ROOT||path.join(__dirname,'..');
const app=fs.existsSync(path.join(repo,'orbit360-platform'))?path.join(repo,'orbit360-platform'):repo;
const read=file=>fs.readFileSync(path.join(file.startsWith('functions/')?repo:app,file),'utf8');
const ops=read('modules/ops.js'),ciclo=read('core/ciclo.js'),deleting=read('core/record-delete.js');
const store=read('data/store-firestore-product-operational-p0.js');
const backend=read('functions/product-ops-leads-domain.js');

test('Ops passes canonical card ID unchanged into the delete flow',()=>{
 assert.match(ops,/C\(\)\.cardNegocio\(it\.rec/);
 assert.match(ops,/C\(\)\.wireCards\(host\)/);
 assert.match(ciclo,/data-neg="\$\{n\.id\}"/);
 assert.match(ciclo,/openNegocio\(el\.dataset\.neg\)/);
 assert.match(ciclo,/Orbit\.recordDelete\.remove\('negocios', id/);
 assert.match(deleting,/updateDurable\(collection, id, patch\)/);
});
test('Business deletion uses scoped Ops callable, not generic batch',()=>{
 assert.match(store,/WORKFLOW_COMMAND='orbit360OpsLeadsCommand'/);
 assert.match(store,/return'archive_business'/);
 assert.match(store,/WORKFLOW_COMMAND\s*,\s*\{tenantId:m\.tenantId/);
 assert.match(store,/previewWorkflow\?'us-east1':'us-central1'/);
 assert.ok(!deleting.includes("collection === 'negocios') {\n      return ["));
});
test('Server not-found is fail-closed and an applied endoso stays protected',()=>{
 assert.match(backend,/dataRef\(authz\.tenantId,entityType,entityId\)/);
 assert.match(backend,/tx\.get\(entity\).*?new HttpsError\('not-found','El registro no existe\.'/s);
 assert.match(backend,/ENDOSO_APPLIED_OR_REFERENCED_ARCHIVE_FORBIDDEN/);
});

const match=ciclo.match(/  async function safeDeletionFailure\(error, collection, entityId\)\{[\s\S]*?\n  \}\n(?=  function tiposGestion\()/);
assert.ok(match,'safeDeletionFailure must remain included in canonical Ops source');
const factory=(role='direccion',tenant='alianzas-soluciones')=>{
 const logs=[];
 const Orbit={session:{rol:()=>role},auth:{productUser:{tenantId:tenant}}};
 const context={Orbit,window:{crypto:webcrypto},crypto:webcrypto,TextEncoder,Uint8Array,console:{warn:(...x)=>logs.push(x)}};
 const diagnose=vm.runInNewContext(match[0].trim().replace(/^async function /,'(async function ')+')',context);
 return{diagnose,logs};
};
test('Positive fixture: canonical missing-document message has deterministic private hash',async()=>{
 const {diagnose,logs}=factory('Dirección');
 const a=await diagnose({code:'functions/not-found',message:'El registro no existe.'},'negocios','qa_foc_001');
 const b=await diagnose({code:'functions/not-found',message:'El registro no existe.'},'negocios','qa_foc_001');
 const c=await diagnose({code:'functions/not-found',message:'El registro no existe.'},'negocios','qa_foc_002');
 assert.equal(a.category,'DOCUMENTO_NO_ENCONTRADO_EN_ALCANCE');
 assert.match(a.fingerprint,/^[a-f0-9]{16}$/);
 assert.equal(a.fingerprint,b.fingerprint);
 assert.notEqual(a.fingerprint,c.fingerprint);
 assert.ok(!JSON.stringify(logs).includes('qa_foc_001'));
});
test('Negative fixture: 404 transport uncertainty stays unresolved; advisor gets no hash',async()=>{
 const {diagnose}=factory('asesor');
 const d=await diagnose({code:'functions/not-found',message:'Not found; client@example.test'},'negocios','qa_foc_001');
 assert.equal(d.category,'ORIGEN_NO_DETERMINADO');
 assert.equal(d.fingerprint,'');
 assert.ok(!JSON.stringify(d).includes('client@example.test'));
});
test('Signed Operativo permission denial is distinguished without publishing PII',async()=>{
 const {diagnose,logs}=factory('operativo');
 const d=await diagnose({code:'functions/permission-denied',message:'SCOPE_DENIED: client@example.test'},'gestiones','qa_ges_003');
 assert.equal(d.category,'PERMISO_RECHAZADO');
 assert.match(d.fingerprint,/^[a-f0-9]{16}$/);
 assert.ok(!JSON.stringify(logs).includes('client@example.test'));
});
