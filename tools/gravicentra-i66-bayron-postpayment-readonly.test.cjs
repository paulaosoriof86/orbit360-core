'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const source=process.env.GI_I66_BAYRON_READONLY_SOURCE||path.join(__dirname,'gravicentra-i66-bayron-postpayment-readonly.cjs');
const {K,certify,digest,safeError}=require(source);
function fixture(){
 const first={id:K.first,polizaId:K.policyId,clienteId:'cli_gt',pais:'GT',monto:1557.92,vence:K.firstDue,
   estado:'Pagado',fechaPago:K.paidDate,conciliadoPago:true,applicationState:'PENDING_APPLICATION',paymentState:'PAID_DIRECT'};
 const second={id:K.second,polizaId:K.policyId,clienteId:'cli_gt',pais:'GT',monto:1557.92,vence:K.secondDue,estado:'Pendiente'};
 const cb={id:'actual_cobro',reciboId:K.first,polizaId:K.policyId,monto:1557.92,paidDate:K.paidDate,
   paymentState:'PAID_DIRECT',applicationState:'PENDING_APPLICATION',conciliado:false};
 return {tenantId:'gt_tenant',policyMatches:1,policy:{id:K.policyId,numero:K.policyNumber,clienteId:'cli_gt',pais:'GT'},client:{id:'cli_gt',pais:'GT'},
   first,second,receipts:[first,second,...Array.from({length:12},(_,i)=>({id:'historical_'+i,polizaId:K.policyId}))],
   car:[{id:'car_first',reciboId:K.first,polizaId:K.policyId,monto:1557.92,estado:'Pagado',fechaPago:K.paidDate,conciliadoPago:true}],
   cobros:[cb],secondCar:[{id:'car_second',reciboId:K.second,estado:'Pendiente',monto:1557.92}],secondCobros:[],policyCobros:[cb],
   events:[{id:'evt',operation:'apply_payment',receiptId:K.first,actor:{uid:'signed_paula',activeRole:'direccion'}}],
   requests:[{id:'req',operation:'apply_payment',status:'committed',result:{receiptId:K.first}}],
   sourceMatches:[],maintenance:null};
}
test('Paula signed application counts paid but pending conciliation',()=>{let r=certify(fixture());assert.equal(r.status,'PAID_PENDING_APPLICATION');assert.equal(r.applicationState,'PENDING_APPLICATION');assert.equal(r.cobroCount,1);assert.equal(r.requestCount,1);assert.equal(r.eventCount,1);});
test('reconciliation only PASS when actual Cobro confirms it',()=>{let f=fixture();f.cobros[0].conciliado=true;f.cobros[0].applicationState='APPLIED_DIRECT';assert.equal(certify(f).status,'PAID_RECONCILED');});
test('source number missing is a separate metadata fact, not a missing payment',()=>{let r=certify(fixture());assert.equal(r.sourceNumberPresent,false);assert.equal(r.status,'PAID_PENDING_APPLICATION');});
test('source number uniquely set on same receipt remains readable',()=>{let f=fixture();f.first.numeroReciboFuente=K.sourceNumber;f.sourceMatches=[f.first];assert.equal(certify(f).sourceNumberPresent,true);});
test('bad receipt amount or date blocks financial certification',()=>{let f=fixture();f.first.monto=120;f.cobros[0].paidDate='2026-08-20';assert.ok(certify(f).issues.includes('FIRST_RECEIPT_PAID_IDENTITY'));assert.ok(certify(f).issues.includes('FIRST_COBRO_PERSISTENCE'));});
test('duplicate, orphan and wrong relation are held',()=>{let f=fixture();f.policyCobros.push({id:'orphan',reciboId:'unknown',polizaId:K.policyId});assert.ok(certify(f).issues.includes('DUPLICATE_OR_ORPHAN_COBROS'));});
test('signed event and idempotency request required, not just UI toast',()=>{let f=fixture();f.events=[];f.requests=[];assert.ok(certify(f).issues.includes('SIGNED_DIRECTION_EVENT_NOT_VERIFIED'));assert.ok(certify(f).issues.includes('SIGNED_REQUEST_NOT_VERIFIED'));});
test('second receipt any new activity is reported without altering first',()=>{let f=fixture();f.second.fechaPago='2026-11-10';f.secondCobros=[{id:'other'}];assert.equal(certify(f).secondState,'SECOND_HAS_FINANCIAL_ACTIVITY_REVIEW');});
test('tenant and country mismatch is fail closed',()=>{let f=fixture();f.policy.tenantId='wrong_tenant';assert.ok(certify(f).issues.includes('POLICY_CLIENT_TENANT_IDENTITY'));});
test('source does not contain ANY mutation or callable invocation',()=>{
 const s=fs.readFileSync(source,'utf8');
 assert.ok(!/\b(?:tx|batch|db|firestore|docRef|receiptRef|carRef|cobroRef)\s*\.\s*(?:set|update|delete|create|runTransaction)\s*\(/.test(s));
 assert.ok(!s.includes('.cloudfunctions.net'));
 assert.ok(!s.includes('FieldValue'));
 assert.ok(!s.includes('verifyIdToken'));
 assert.ok(s.includes('I66_BAYRON_POSTPAYMENT_READONLY'));
});
test('readback stable digest and sanitized errors',()=>{let f=fixture();assert.equal(digest(f),digest({...f}));assert.equal(safeError(new Error('tenants/private/client')), 'I66_BAYRON_POSTPAYMENT_READONLY_EXTERNAL_ERROR_PRIVATE_DETAILS_OMITTED');});
