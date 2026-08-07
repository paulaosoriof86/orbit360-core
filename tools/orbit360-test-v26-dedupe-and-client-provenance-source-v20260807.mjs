#!/usr/bin/env node
'use strict';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { adjudicateInsurerIdentityRows } from './orbit360-insurer-identity-dedupe-v26-v20260807.mjs';
import { adjudicateInsurersV26 } from './orbit360-adjudicate-block1-universe-readonly-v26-v20260807.mjs';
import { extractCandidateTokens, deterministicPatternProbe } from './orbit360-reconcile-client-provenance-v26-source-v20260807.mjs';

const checks=[]; const check=(id,fn)=>{try{fn();checks.push({id,ok:true});}catch(e){checks.push({id,ok:false,detail:String(e.message||e).slice(0,160)});}};
const rows = values => values.map((data,i)=>({id:'i'+String(i+1).padStart(2,'0'),data}));
check('shared-source-code-distinct-legal-identities-both-effective',()=>{
 const out=adjudicateInsurerIdentityRows(rows([{pais:'GT',tipoEntidad:'aseguradora',nit:'111',codigo:'X'},{pais:'GT',tipoEntidad:'aseguradora',nit:'222',codigo:'X'}]));
 assert.equal(out.filter(x=>x.effective).length,2); assert.equal(out.every(x=>x.requiresValidation),true); assert.equal(out.some(x=>x.duplicate),false);
});
check('shared-source-code-different-country-both-effective',()=>{
 const out=adjudicateInsurerIdentityRows(rows([{pais:'GT',tipoEntidad:'aseguradora',nit:'111',codigo:'X'},{pais:'CO',tipoEntidad:'aseguradora',nit:'222',codigo:'X'}]));
 assert.equal(out.filter(x=>x.effective).length,2); assert.equal(out.some(x=>x.duplicate),false);
});
check('same-legal-identity-country-type-is-real-duplicate',()=>{
 const out=adjudicateInsurerIdentityRows(rows([{pais:'GT',tipoEntidad:'aseguradora',nit:'111',codigo:'A'},{pais:'GT',tipoEntidad:'aseguradora',nit:'111',codigo:'B'}]));
 assert.equal(out.filter(x=>x.effective).length,1); assert.equal(out.filter(x=>x.duplicate).length,1);
});
check('source-code-without-legal-id-never-auto-excluded',()=>{
 const out=adjudicateInsurerIdentityRows(rows([{pais:'GT',codigo:'X'},{pais:'GT',codigo:'X'}]));
 assert.equal(out.filter(x=>x.effective).length,2); assert.equal(out.every(x=>x.requiresValidation),true);
});
check('explicit-source-uniqueness-conflict-still-fails-closed',()=>{
 const out=adjudicateInsurerIdentityRows(rows([{pais:'GT',tipoEntidad:'aseguradora',nit:'111',codigo:'X'},{pais:'GT',tipoEntidad:'aseguradora',nit:'222',codigo:'X'}]),{sourceCodeUniqueness:'global',legalIdentityFields:['nit'],sourceCodeFields:['codigo'],countryFields:['pais'],entityTypeFields:['tipoEntidad'],provenanceFields:[]});
 assert.equal(out.filter(x=>x.effective).length,2); assert.equal(out.every(x=>x.sourceCodeContractConflict),true); assert.equal(out.every(x=>x.requiresValidation),true);
});
check('code-alone-is-not-duplicate-basis',()=>{
 const out=adjudicateInsurerIdentityRows(rows([{pais:'GT',codigoIntermediario:'K'},{pais:'GT',codigoIntermediario:'K'}]));
 assert.equal(out.some(x=>x.duplicateBasis==='source_code'),false);
});
check('universe-adjudicator-keeps-shared-code-rows-effective',()=>{
 const out=adjudicateInsurersV26(rows([{pais:'GT',tipoEntidad:'aseguradora',nit:'111',codigo:'X',vinculada:true},{pais:'GT',tipoEntidad:'aseguradora',nit:'222',codigo:'X',vinculada:true}]));
 assert.equal(out.effective,2); assert.equal(out.duplicatesExcluded,0); assert.equal(out.requiresValidation,2);
});
check('universe-adjudicator-still-excludes-explicit-inactive',()=>{
 const out=adjudicateInsurersV26(rows([{pais:'GT',nit:'111',codigo:'X',vinculada:true},{pais:'GT',nit:'222',codigo:'Y',vinculada:false}]));
 assert.equal(out.effective,1); assert.equal(out.items.filter(x=>x.excludedFromEffective).length,1);
});
check('source-token-extractor-does-not-require-pii-output',()=>{
 const tokens=extractCandidateTokens(`const id='cli001'; const other="abc-123";`); assert.equal(tokens.has('cli001'),true); assert.equal(tokens.has('abc-123'),true);
});
check('deterministic-probe-matches-known-formula-only',()=>{
 const h=crypto.createHash('sha256').update('clientes:cli001','utf8').digest('hex').slice(0,20); const found=deterministicPatternProbe(new Set([h])); assert.equal(found.has(h),true);
});
const failed=checks.filter(x=>!x.ok); const result={schemaVersion:'orbit360-v26-source-fixtures-v1',status:failed.length?'STOP_V26_SOURCE_FIXTURES':'PASS_V26_SOURCE_FIXTURES',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,secretsRead:false,firebaseAccess:false,browserExecuted:false,hostingTouched:false,writes:0,productionTouched:false,ok:failed.length===0};
console.log(JSON.stringify(result,null,2)); process.exit(result.ok?0:41);
