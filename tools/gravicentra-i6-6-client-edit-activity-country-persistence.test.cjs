'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ui=fs.readFileSync('orbit360-platform/modules/cliente360.js','utf8');
const crm=fs.readFileSync('orbit360-platform/modules/crm-v1198-operational-bridge.js','utf8');
const backend=fs.readFileSync('functions/product-operational-domain.js','utf8');
test('Operativo client + activity update is same atomic transaction and both rows contain country and advisor',()=>{
 const block=ui.slice(ui.indexOf('function edit(cid)'),ui.indexOf('function field(label'));
 assert.match(block,/pais:\s*patch\.pais,\s*tenantId:\s*c\.tenantId/);
 assert.match(block,/asesorId:\s*patch\.asesorId/);
 assert.match(block,/action: 'update', collection: 'clientes'/);
 assert.match(block,/action: 'insert', collection: 'actividades'/);
 assert.match(block,/await S\(\)\.batchDurable/);
 assert.match(block,/DURABLE_CLIENT_EDIT_HOLD/);
 assert.match(backend,/actividades: 'cliente360'/);
 assert.match(backend,/function countryAllowed\(member,row\)/);
});
test('Effective CRM wrapper keeps mandatory reason but never writes optimistic audit before backend readback',()=>{
 const block=crm.slice(crm.indexOf('mod.edit = function'),crm.indexOf('const policyActions'));
 assert.match(block,/pendingAuditReason = motivo/);
 assert.doesNotMatch(block,/A\.audit\(/);
 assert.doesNotMatch(block,/setTimeout\(/);
 assert.match(block,/stopImmediatePropagation/);
});
test('Both components parse and preserve direct signed country advisor roster',()=>{
 new vm.Script(ui);new vm.Script(crm);
 assert.match(ui,/bindAssignableClientAdvisors\(back,'ce-ase',selPais,'ce-save'/);
});

test('Only the linked activity of a marked client fixture on I6.6 Preview inherits its marker',()=>{
 const start=ui.indexOf('  function markPreviewClientActivity(');
 const mark=vm.runInNewContext('('+ui.slice(start,ui.indexOf('  function edit(cid)',start)).trim()+')');
 const preview='ays-orbit-360-lab--gi-i66-rc-123-abc.web.app';
 for(const [host,id,flag,link,expected] of [
  [preview,'b4003qa_x',true,'b4003qa_x',true],
  [preview,'b4003qa_x',false,'b4003qa_x',undefined],
  [preview,'real',true,'real',undefined],
  [preview,'b4003qa_x',true,'another',undefined],
  ['app.aysseguros.com','b4003qa_x',true,'b4003qa_x',undefined]
 ]){
  const activity={id:'act_cli_edit_'+id+'_1',clienteId:link};
  mark({id,__syntheticQa:flag},activity,host);
  assert.equal(activity.__syntheticQa,expected);
 }
});
