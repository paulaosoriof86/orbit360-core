#!/usr/bin/env node
'use strict';
import assert from 'node:assert/strict';
import {buildCanonicalWritePlan,stagingPolicyToCanonicalRaw,TENANT_ID} from './orbit360-policy-staging-to-canonical-v20260730.mjs';

const refs={
  clients:[{id:'cli_exist',nombre:'Cliente Existente',numeroDocumento:'123',asesorId:'adv_paula',pais:'GT',moneda:'GTQ'}],
  insurers:[{id:'ins_uni',nombre:'Seguros Universales',aliases:['Universales'],pais:'GT'}],
  advisors:[{id:'adv_paula',nombre:'Paula Osorio'}],
  policies:[]
};
const candidate={
  tenant_id:TENANT_ID,
  excluded:[{reason:'vigencia_invertida'},{reason:'vigencia_invertida'}],
  insurersRestricted:[{nombre:'Carrier Referenciado',pais:'CO',source_refs:['fixture#ins']}],
  clients:[{nombre:'Cliente Nuevo',documento:'',correo:'nuevo@example.test',telefono:'55550000',whatsapp:'55550000',pais:'GT',moneda:'GTQ',vendedor:'Paula Osorio',calidad_datos:'pendiente_completar',source_refs:['fixture#1']}],
  policies:[
    {numero_poliza:'POL-001',cliente_match_fuente:'Cliente Existente',asegurado:'Cliente Existente',aseguradora:'Universales',vigencia_inicio:'2026-01-01',vigencia_fin:'2026-12-31',estado_fuente:'Vencida',estado_propuesto:'Vigente',pais:'GT',moneda:'GTQ',prima_neta:1000,prima_total:1120,forma_pago:'Transferencia',frecuencia_pago:'Mensual',ramo:'VEHICULOS',subramo:'Automoviles',tipo_ramo:'Auto Individual',vendedor:'Paula Osorio',source_version_key:'POL-001|UNIVERSALES|CLIENTE EXISTENTE|2026-01-01|2026-12-31',source_refs:['fixture#2']},
    {numero_poliza:'POL-002',cliente_match_fuente:'Cliente Nuevo',asegurado:'Cliente Nuevo',cliente_nuevo_candidato:true,aseguradora:'Universales',vigencia_inicio:'2026-02-01',vigencia_fin:'2027-02-01',estado_fuente:'Vigente',estado_propuesto:'Vigente',pais:'GT',moneda:'GTQ',prima_neta:2000,prima_total:2240,forma_pago:'Transferencia',frecuencia_pago:'Pago Único',ramo:'VIDA',subramo:'Vida',tipo_ramo:'Vida Individual',vendedor:'Paula Osorio',source_version_key:'POL-002|UNIVERSALES|CLIENTE NUEVO|2026-02-01|2027-02-01',source_refs:['fixture#3']},
    {numero_poliza:'POL-003',cliente_match_fuente:'Cliente Nuevo',asegurado:'Cliente Nuevo',cliente_nuevo_candidato:true,aseguradora:'Carrier Referenciado',vigencia_inicio:'2026-03-01',vigencia_fin:'2027-03-01',estado_fuente:'Vigente',estado_propuesto:'Vigente',pais:'CO',moneda:'COP',prima_neta:3000,prima_total:3360,forma_pago:'',frecuencia_pago:'Mensual',ramo:'SALUD',subramo:'Gastos Medicos',tipo_ramo:'Individual',vendedor:'Paula Osorio',source_version_key:'POL-003|CARRIER REFERENCIADO|CLIENTE NUEVO|2026-03-01|2027-03-01',source_refs:['fixture#4'],calidad_datos:'pendiente_completar',requiereValidacion:true,motivos_calidad:['FORMA_PAGO_FALTANTE']}
  ]
};

const plan=buildCanonicalWritePlan(candidate,refs);
assert.equal(plan.ok,true);
assert.equal(plan.blocking.length,0);
assert.equal(plan.counts.clientCreates,1);
assert.equal(plan.counts.restrictedInsurerCreates,1);
assert.equal(plan.counts.policyWrites,3);
assert.equal(plan.counts.policyCreates,3);
assert.equal(plan.counts.policyUpdates,0);
assert.equal(plan.counts.pendingPolicies,1);
assert.equal(plan.counts.excluded,2);
assert.equal(plan.counts.receipts,0);
assert.equal(plan.counts.cartera,0);
assert.equal(plan.counts.cobros,0);
assert.equal(plan.operations[0].collection,'clientes');
assert.equal(plan.operations[0].data.calidad_datos,'pendiente_completar');
assert.equal(plan.operations[0].data.validationStatus,'pendiente_completar');
const insurerOp=plan.operations.find(x=>x.collection==='aseguradoras');
assert.ok(insurerOp);
assert.equal(insurerOp.data.vinculada,false);
assert.equal(insurerOp.data.cotizadorHabilitado,false);
assert.equal(insurerOp.data.validationStatus,'requiere_validacion');
const newPolicyOps=plan.operations.filter(x=>x.collection==='polizas'&&x.data.clienteFuenteNombre==='Cliente Nuevo');
assert.equal(newPolicyOps.length,2);
assert.equal(newPolicyOps[0].data.clienteId,newPolicyOps[1].data.clienteId,'las pólizas del cliente nuevo deben reutilizar el mismo ID determinístico');
for(const op of plan.operations.filter(x=>x.collection==='polizas')){
  assert.ok(op.data.numero);
  assert.ok(op.data.vigenciaInicio);
  assert.ok(op.data.vigenciaFin);
  assert.ok(op.data.clienteId);
  assert.equal(op.data.carteraMaterializada,false);
  assert.equal(op.data.recibosMaterializados,false);
  assert.equal(op.data.cobroAplicado,false);
  assert.ok(op.data._sourceVersionKey);
}
const pending=plan.operations.find(x=>x.collection==='polizas'&&x.data.numero==='POL-003');
assert.equal(pending.data.requiereValidacion,true);
assert.equal(pending.data.validationStatus,'pendiente_completar');
assert.equal(pending.data.estadoCartera,'pendiente_datos_no_materializar');
const raw=stagingPolicyToCanonicalRaw(candidate.policies[0],{clienteId:'cli_exist',insurerId:'ins_uni',asesorId:'adv_paula'});
assert.equal(raw.numero,'POL-001');
assert.equal(raw.vigenciaInicio,'2026-01-01');
assert.equal(raw.vigenciaFin,'2026-12-31');
assert.equal(raw.estadoFuenteOriginal,'Vencida');
assert.equal(raw.estado,'Vigente');
assert.equal(raw.primaNeta,1000);
assert.equal(raw.primaTotal,1120);
assert.deepEqual(raw.sourceRefs,['fixture#2']);

const unknownInsurer=structuredClone(candidate);
unknownInsurer.insurersRestricted=[];
unknownInsurer.policies=[{...unknownInsurer.policies[0],aseguradora:'No Existe'}];
const blocked=buildCanonicalWritePlan(unknownInsurer,refs);
assert.equal(blocked.ok,false);
assert.equal(blocked.counts.policyWrites,0);
assert.equal(blocked.blocking[0].reason,'aseguradora_missing');

console.log(JSON.stringify({status:'PASS',stagingToCanonical:true,existingClientReused:true,newClientCreatedOnce:true,newClientPoliciesReuseId:true,restrictedInsurerReferenceCreated:true,restrictedInsurerCannotActivate:true,pendingPolicyQualityPreserved:true,pendingPolicyCannotMaterializeReceipts:true,insurerResolutionFailClosed:true,excludedPreserved:2,receiptsWritten:0,carteraWrites:0,cobroWrites:0,firestoreWrites:0,operationalWrites:0},null,2));
