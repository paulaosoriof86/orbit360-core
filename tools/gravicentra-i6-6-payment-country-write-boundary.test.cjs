'use strict';
// I6.6 source-only country boundary contract. No Firebase credentials, network, or real writes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../functions/cobros-reconciliation-domain.js'),'utf8');
const start=source.indexOf('function paymentCountry(value) {');
const stop=source.indexOf('async function authorize(',start);
assert(start>0&&stop>start,'canonical payment country helper must precede authorize');
const block=source.slice(start,stop);
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
const text=(value,max=1000)=>String(value==null?'':value).replace(/\u0000/g,'').trim().slice(0,max);
const norm=value=>text(value,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const unique=values=>Array.from(new Set([].concat(values||[]).map(value=>text(value,180)).filter(Boolean)));
const scope=new Function('norm','text','unique','HttpsError',block+'\nreturn assertPaymentCountryScope;')(norm,text,unique,HttpsError);
const actor=(countries,paises=[])=>({member:{countries,paises}});
const policy=pais=>({pais});
const receipt=pais=>({pais});
test('direct and reconciliation writers both call the same authorization before state changes',()=>{
  const apply=source.slice(source.indexOf('async function applyPayment('),source.indexOf('function evidenceOrigin('));
  const infer=source.slice(source.indexOf('async function reconcileEvidence('),source.indexOf('function unsupportedMutation('));
  assert.match(apply,/assertPaymentCountryScope\(authz, policy, receipt\)/);
  assert.match(infer,/assertPaymentCountryScope\(authz, policy\)/);
  assert.match(infer,/for \(const receipt of receipts\) assertPaymentCountryScope\(authz, policy, receipt\)/);
  assert(apply.indexOf('assertPaymentCountryScope')<apply.indexOf('tx.set(cobroRef'));
  assert(infer.indexOf('assertPaymentCountryScope')<infer.indexOf('tx.set(cobroRef'));
});
test('GT-only and CO-only memberships reject cross-border payment',()=>{
  assert.equal(scope(actor(['GT']),policy('GT'),receipt('Guatemala')),'GT');
  assert.equal(scope(actor(['CO']),policy('CO'),receipt('Colombia')),'CO');
  assert.throws(()=>scope(actor(['GT']),policy('CO'),receipt('CO')),e=>e.code==='permission-denied');
  assert.throws(()=>scope(actor(['CO']),policy('GT'),receipt('GT')),e=>e.code==='permission-denied');
});
test('multi-country Operativo supports both countries without individual user exceptions',()=>{
  for(const country of ['GT','CO'])assert.equal(scope(actor(['GT','CO']),policy(country),receipt(country)),country);
});
test('policy/receipt country contradictions and missing country fail before write',()=>{
  assert.throws(()=>scope(actor(['GT','CO']),policy('GT'),receipt('CO')),e=>e.code==='failed-precondition');
  assert.throws(()=>scope(actor(['GT','CO']),policy(''),receipt('')),e=>e.code==='failed-precondition');
});
test('legacy country-empty membership semantics stay compatible only if policy country exists',()=>{
  assert.equal(scope(actor([]),policy('GT'),receipt('GT')),'GT');
  assert.throws(()=>scope(actor([]),policy(''),receipt('')),e=>e.code==='failed-precondition');
});
console.log('I66_PAYMENT_COUNTRY_WRITE_BOUNDARY_SOURCE_TESTS_REGISTERED');
