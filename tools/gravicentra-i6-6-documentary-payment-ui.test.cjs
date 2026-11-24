'use strict';
// Isolated draft tests only. No Firebase credentials, sessions, network API or data writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const repo=process.env.DOCUMENTARY_BASE_REPO||path.resolve(__dirname,'..');
const root=process.env.DOCUMENTARY_SOURCE_ROOT||repo;
const source=fs.readFileSync(path.join(root,'orbit360-platform/modules/cobros.js'),'utf8');
const r46=JSON.parse(fs.readFileSync(path.join(repo,'artifacts/orbit360-recovery/release-control/I6_6_MAPFRE_NEXT_CONTROLLED_PREFLIGHT_20261124_R46.json')));
const helperBegin=source.indexOf('  function documentaryInputError(');
const applyBegin=source.indexOf('  function aplicarPago(cobroId)');
const begin=source.indexOf('  function paymentFailureFeedback(');
const end=source.indexOf('\n  function kpi(kind)',applyBegin);
const uploadBegin=source.indexOf('  async function uploadPaymentDocument(');
const uploadEnd=source.indexOf('\n  /* ---- Detalle del recibo',uploadBegin);
assert.ok(helperBegin>begin&&applyBegin>helperBegin&&end>applyBegin&&uploadEnd>uploadBegin);
const sandbox={window:{crypto:webcrypto,OrbitBackend:{tenantId:r46.scope.tenantId}},OrbitBackend:{tenantId:r46.scope.tenantId},TextEncoder,URL};
vm.createContext(sandbox);vm.runInContext(source.slice(helperBegin,applyBegin),sandbox);
const serial=value=>JSON.parse(JSON.stringify(value));
const passed=[];
async function check(name,fn){await fn();passed.push(name);console.log('PASS '+name);}
function fixture(target=r46.twoCases[0]){
 const payload=target.pendingConditionalCanonicalCall.payload;
 return {receipt:{id:target.receiptId,polizaId:r46.scope.policyId,primaTotal:127.77,monto:127.77,montoTotal:127.77,estado:'Pendiente'},
  cobro:{monto:127.77},values:{sourceType:payload.sourceType,sourceRef:payload.sourceRef,evidenceAsOfDate:payload.evidenceAsOfDate,
   evidenceId:payload.evidenceId,requestId:target.pendingConditionalCanonicalCall.requestId,reviewed:true},
  manual:{paidDate:payload.paidDate,invoiceNumber:payload.invoiceNumber,applicationDate:'',invoiceDate:'',paymentMethod:''}};
}
async function command(f){return serial(await sandbox.documentaryPaymentCommand(f.receipt,f.cobro,f.values,f.manual));}
async function rejected(f,match){await assert.rejects(()=>command(f),error=>error.code==='invalid-argument'&&match.test(error.documentaryMessage));}

(async()=>{
 await check('R46 exact two payloads and request IDs, without invented fields',async()=>{
  for(const target of r46.twoCases){const actual=await command(fixture(target));assert.equal(actual.requestId,target.pendingConditionalCanonicalCall.requestId);assert.deepEqual(actual.payload,target.pendingConditionalCanonicalCall.payload);}
 });
 await check('Missing explicit documentary review blocks before command',async()=>{const f=fixture();f.values.reviewed=false;await rejected(f,/Confirma/);});
 await check('Already paid receipt blocks new payment',async()=>{const f=fixture();f.receipt.paymentState='PAID_DIRECT';await rejected(f,/ya figura pagado/);});
 await check('Inconsistent gross aliases are not silently corrected',async()=>{const f=fixture();f.receipt.montoTotal=127.76;await rejected(f,/prima total/);});
 await check('Actual payment date cannot be invented from the source cut',async()=>{const f=fixture();f.manual.paidDate='';await rejected(f,/fecha válida/);});
 await check('Actual payment after document cut is rejected',async()=>{const f=fixture();f.manual.paidDate='2026-12-01';await rejected(f,/posterior/);});
 await check('Invalid calendar dates are rejected',async()=>{const f=fixture();f.values.evidenceAsOfDate='2026-02-30';await rejected(f,/fecha válida/);});
 await check('Drive reference accepts exact original and rejects untrusted host',async()=>{
  const f=fixture(),expected=(await command(f)).payload.sourceRef;f.values.sourceRef='https://drive.google.com/file/d/'+expected.slice(6)+'/view?usp=sharing';assert.equal((await command(f)).payload.sourceRef,expected);
  f.values.sourceRef='https://drive.google.com.example.org/file/d/'+expected.slice(6)+'/view';await rejected(f,/documento original/);
 });
 await check('Proposal application namespace cannot be forged in this form',async()=>{const f=fixture();f.values.requestId='propapp_existing_request';await rejected(f,/referencia/);});
 await check('Generated operation ID is stable for replay and changes with evidence',async()=>{
  const f=fixture();f.values.requestId='';f.values.evidenceId='';const a=await command(f),b=await command(f);assert.equal(a.requestId,b.requestId);assert.equal(a.payload.evidenceId,b.payload.evidenceId);
  f.manual.paidDate='2026-10-02';assert.notEqual((await command(f)).requestId,a.requestId);
 });
 await check('Manual payment remains outside documentary requirements',async()=>{const f=fixture();f.values={sourceType:'manual'};assert.equal(await command(f),null);});
 await check('Missing tenant identity blocks command preparation',async()=>{
  const saved=sandbox.OrbitBackend.tenantId;sandbox.OrbitBackend.tenantId='';try{await rejected(fixture(),/sesión/);}finally{sandbox.OrbitBackend.tenantId=saved;}
 });
 await check('Amount precision and zero gross are rejected without rounding money',async()=>{
  for(const amount of [0,-1,127.771,NaN]){const f=fixture();f.cobro.monto=amount;await rejected(f,/prima total/);}
 });
 await check('Exact canonical response passes and contradictory responses require readback',async()=>{
  const f=fixture(),c=await command(f),p=c.payload;
  const response={ok:true,serverOwned:true,portfolioUpdated:true,receiptId:f.receipt.id,policyId:f.receipt.polizaId,cobroId:'fixture_cobro',paymentState:'PAID_DIRECT',applicationState:'APPLIED_DIRECT',paidDate:p.paidDate,invoiceNumber:p.invoiceNumber,requestId:c.requestId};
  assert.doesNotThrow(()=>sandbox.verifyDocumentaryPaymentResult(response,c,f.receipt));
  for(const patch of [{portfolioUpdated:false},{paidDate:'2026-09-01'},{applicationState:'PENDING_APPLICATION'},{requestId:'different_request'},{invoiceDate:'2026-10-31'}])
   assert.throws(()=>sandbox.verifyDocumentaryPaymentResult({...response,...patch},c,f.receipt),error=>error.code==='data-loss'&&error.gravicentraPayment.requestId===c.requestId);
 });
 await check('Documentary UI source explicitly gates notices and double submission',async()=>{
  const handler=source.slice(applyBegin,end);
  assert.ok(handler.includes("const avisar=!documentaryCommand&&pm.querySelector('#pm-avisar')"));
  assert.ok(handler.includes('if(btn.disabled)return;'));
  assert.ok(handler.includes("notifyBox.checked=false;"));
  assert.ok(handler.includes('btn.disabled = submittedDocumentary&&feedback.uncertain'));
 });

 assert.equal(passed.length,15);
 console.log(JSON.stringify({status:'DOCUMENTARY_PAYMENT_SOURCE_PAYLOAD_GUARDS_PASS_NOT_SIGNED_UI',checks:passed.length,networkRequests:0,realCustomerWrites:0}));
})().catch(error=>{console.error(error);process.exitCode=1;});
