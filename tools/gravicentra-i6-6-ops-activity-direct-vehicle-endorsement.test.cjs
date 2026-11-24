'use strict';
// Frozen I6.6 source-contract QA. This test NEVER touches live records.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const server=src('functions/product-ops-leads-domain.js');
const client=src('orbit360-platform/core/ciclo.js');
const issued=src('orbit360-platform/modules/issuance-endosos-v1201-bridge.js');
const engine=src('orbit360-platform/core/endorsement-workflow-v1201.js');

test('Ops management and Client 360 activity are atomically persisted by the backend owner',()=>{
  assert.ok(server.includes("if(['create_management','portal_request'].includes(operation)&&after.clienteId&&after.workflowType!=='endorsement_request')"));
  const i=server.indexOf("if(['create_management','portal_request'].includes(operation)&&after.clienteId&&after.workflowType!=='endorsement_request')");
  const j=server.indexOf('tx.set(entity,after,{merge:true});',i);
  assert.ok(i>0&&j>i);
  const block=server.slice(i,j);
  assert.match(block,/tx\.set\(dataRef\(authz\.tenantId,'actividades',activityId\)/);
  assert.match(block,/gestionId:entityId/);
  assert.match(block,/after\.actividadCliente360Id=activityId/);
  assert.match(server,/OPS_CLIENT360_ACTIVITY_READBACK_MISSING/);
  assert.match(server,/managementActivityReadback=\{activityId,clienteId:confirmedRow\.clienteId,gestionId:entityId,reclamoId:text\(confirmedRow\.reclamoId,180\),exists:true,transactional:true\}/);
});
test('Client never claims success for optimistic activity nor swallows permission errors',()=>{
  assert.doesNotMatch(client,/S\(\)\.insert\('actividades'/);
  assert.match(client,/actividadCliente360Confirmada/);
  assert.match(client,/aún no está confirmada por el servidor/);
  assert.match(client,/await crearGestionDurable/);
});
test('Already-issued substitution is an independent insured policy UI path',()=>{
  assert.match(issued,/Registrar sustitución ya emitida/);
  assert.match(issued,/directEndorsementAllowed\(type\.value\)/);
  assert.match(issued,/if\(type\.value==='sustitucion_vehiculo'\)/);
  assert.match(issued,/if\(!doc\|\|!ref\|\|!date\|\|!note\)/);
  assert.match(issued,/identificación del nuevo vehículo/);
  assert.match(issued,/const result=await E\.createRequest/);
  assert.match(issued,/if\(issued&&result\.reused\)/);
  assert.match(issued,/const applied=await E\.apply\(result\.request\.id/);
  assert.match(issued,/if\(!applied\.ok\)/);
  assert.match(issued,/window\.__orbitOpenGestion=result\.request\.id/);
});
test('Existing workflow preserves old insured vehicle and closes Ops on successful apply',()=>{
  assert.match(engine,/estado: 'Histórico'/);
  assert.match(engine,/action: 'insert', collection: 'vehiculos'/);
  assert.match(engine,/policyPatch: \{ vehiculoId: id \}/);
  assert.match(engine,/endorsementStage: 'APLICADO', estado: 'Resuelta'/);
  assert.match(engine,/canonicalReadback !== true/);
});
