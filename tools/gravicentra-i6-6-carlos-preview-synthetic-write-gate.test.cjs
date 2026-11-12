'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const browserPath=path.join(root,'orbit360-platform/core/product-runtime-browser-providers-p0.js');
const original=fs.readFileSync(browserPath,'utf8');
const marker='window.Orbit.productRuntimeBrowserProvidersP0=Object.freeze';
assert.equal(original.split(marker).length,2,'preview guard must come from one canonical provider');
const scoped=original.replace(marker,'window.__i66PreviewWriteGuard=i66ReadOnlyCallableError;'+marker);
const previewWindow={location:{hostname:'ays-orbit-360-lab--gi-i66-rc-43293845272-j4qucpnj.web.app'},Orbit:{}};
vm.runInNewContext(scoped,{window:previewWindow,location:previewWindow.location,console},{filename:browserPath,timeout:2000});
const check=previewWindow.__i66PreviewWriteGuard;
assert.equal(typeof check,'function');
const no='I66_PREVIEW_MUTATION_CALLABLE_DENIED';
const team='alianzas-soluciones';
const management={tenantId:team,activeRole:'operativo',operation:'create_management',entityId:'b4003qa_i66_carlos_safe_01',payload:{id:'b4003qa_i66_carlos_safe_01',pais:'GT',titulo:'I6.6 prueba sintética'}};
assert.equal(check('orbit360OpsLeadsCommandPreview',management,'us-east1'),'');
assert.equal(check('orbit360OpsLeadsCommandPreview',{...management,operation:'resolve_management'},'us-east1'),'');
assert.equal(check('orbit360OpsLeadsCommandPreview',{...management,entityId:'ges_real_client'},'us-east1'),no);
assert.equal(check('orbit360OpsLeadsCommandPreview',{...management,tenantId:'other'},'us-east1'),no);
assert.equal(check('orbit360OpsLeadsCommandPreview',management,'us-central1'),'I66_PREVIEW_REGION_DENIED');
assert.equal(check('orbit360OpsLeadsCommand','', 'us-east1'),no);
const task={tenantId:team,activeRole:'operativo',mutations:[{collection:'tareas',action:'insert',id:'b4003qa_tareas_20261112',payload:{id:'b4003qa_tareas_20261112',pais:'GT',t:'Tarea QA',__syntheticQa:true}}]};
assert.equal(check('orbit360ProductOperationalCommandPreview',task,'us-east1'),'');
assert.equal(check('orbit360ProductOperationalCommandPreview',{...task,mutations:[{...task.mutations[0],id:'tk_live_real'}]},'us-east1'),no);
assert.equal(check('orbit360ProductOperationalCommandPreview',{...task,mutations:[{...task.mutations[0],payload:{pais:'GT'}}]},'us-east1'),no);
assert.equal(check('orbit360ProductOperationalCommandPreview',{...task,mutations:[]},'us-east1'),no);
assert.equal(check('orbit360ScopedPolicyReadPreview',{mode:'list'},'us-east1'),'');
assert.equal(check('orbit360ScopedPolicyReadPreview',{mode:'write'},'us-east1'),'I66_PREVIEW_SCOPED_READ_MODE_DENIED');

const backend=fs.readFileSync(path.join(root,'functions/product-ops-leads-domain.js'),'utf8');
for(const required of ['PREVIEW_SYNTHETIC_ENTITY_ID_REQUIRED','PREVIEW_REAL_RELATION_DENIED','PREVIEW_POLICY_EMISSION_DENIED','previewWrite=true','previewWorkflowRequests','previewNotificationOutbox']){
  assert.ok(backend.includes(required),'server synthetic-only Preview guard missing: '+required);
}
assert.ok(/if\(previewOnly\)\s*\{[\s\S]*?PREVIEW_SYNTHETIC_ENTITY_ID_REQUIRED/.test(backend),'server identity guard must only restrict Preview');
assert.ok(/operation==='transition_business'[\s\S]*?==='emitido'/.test(backend),'Preview must forbid synthetic policy issuance');
console.log('I66_CARLOS_PREVIEW_UAT_SYNTHETIC_WRITE_TRANSPORT_SAFETY_PASS transport_cases=12 server_guard_markers=6');
