'use strict';
// Pure guards only. This test never imports Firebase/Playwright or uses a credential.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {validateEnvironment,owned,makeStage}=require('./gravicentra-i6-6-proposal-application-signed-uat.cjs');
const {verifiedStage}=require('../functions/proposal-application-boundary');
const code=fs.readFileSync(require.resolve('./gravicentra-i6-6-proposal-application-signed-uat.cjs'),'utf8');
const env={I66_SOURCE_SHA:'a'.repeat(40),I66_PACKAGE_ROOT:'/tmp/i66-package',I66_PREVIEW_ORIGIN:'https://ays-orbit-360-lab--gi-i66-rc-123-abc.web.app'};
let checks=0;
assert.equal(validateEnvironment(env).phase,'PREVIEW');checks++;
assert.equal(validateEnvironment({...env,I66_SIGNED_TEST_LIVE:'true',I66_PREVIEW_ORIGIN:'https://app.aysseguros.com'}).phase,'LIVE');checks++;
for(const wrong of ['https://example.invalid','https://app.aysseguros.com','http://localhost:3000']){assert.throws(()=>validateEnvironment({...env,I66_PREVIEW_ORIGIN:wrong}));checks++;}
assert.throws(()=>validateEnvironment({...env,I66_SIGNED_TEST_LIVE:'true'}));checks++;
assert.throws(()=>validateEnvironment({...env,I66_SOURCE_SHA:'main'}));checks++;
assert.throws(()=>validateEnvironment({...env,I66_PACKAGE_ROOT:'relative'}));checks++;
assert.equal(owned({__syntheticQa:true,qaRunId:'qa_run'},'qa_run'),true);checks++;
assert.equal(owned({__syntheticQa:true,qaRunId:'other'},'qa_run'),false);checks++;
assert.equal(owned({qaRunId:'qa_run'},'qa_run'),false);checks++;
const manifest={sourceLedgerDigest:'b'.repeat(64),packageLogicalSha256:'c'.repeat(64)};
const row=makeStage('evidenciasCobro','qa_id','tenant_qa','run_qa',{sourceRowId:'source_qa',sourceRowIdSha256:'d'.repeat(64)},manifest);
assert.equal(verifiedStage(row,'qa_id','tenant_qa','run_qa',manifest,'evidenciasCobro'),true);checks++;
assert.match(code,/cobrosLedgerQaRuns/);assert.match(code,/cobrosLedgerQaControl/);checks++;
assert.match(code,/ref\.delete\(\{lastUpdateTime:s\.updateTime\}\)/);assert.doesNotMatch(code,/recursiveDelete|deleteUser|setCustomUserClaims/);checks++;
assert.match(code,/SECOND_APPLY_IDEMPOTENT_NO_DOUBLE_PAYMENT/);assert.match(code,/UI_BINDING_PERSISTED_WITH_ZERO_FINANCIAL_WRITES/);checks++;
assert.match(code,/realControlUnchanged/);assert.match(code,/originalManifest/);checks++;
assert.match(code,/if\(!carlosAccess\.canView\)/);assert.match(code,/carlosAccess\.scope==='all'/);
assert.match(code,/SIGNED_OPERATIVO_FULL_PORTFOLIO_READ_NO_ADVISOR_REQUIRED/);assert.doesNotMatch(code,/I66_PROPOSAL_OPERATIVO_UNASSIGNED_SCOPE_LEAK/);checks++;
const provider=fs.readFileSync(require.resolve('../orbit360-platform/core/product-runtime-browser-providers-p0.js'),'utf8');
const marker='window.Orbit.productRuntimeBrowserProvidersP0=Object.freeze';
const browser={location:{hostname:'ays-orbit-360-lab--gi-i66-rc-123-abc.web.app'},Orbit:{}};
vm.runInNewContext(provider.replace(marker,'window.__proposalGate=i66ReadOnlyCallableError;'+marker),{window:browser,location:browser.location,console});
const gate=browser.__proposalGate,name='orbit360CobrosReconciliationCommandPreview';
const qa={tenantId:'alianzas-soluciones',operation:'preview_proposal_application',payload:{proposalId:'b3005qa_i66_proposal_abcdefghijkl',sourceRunId:'cobledgerqa_abcdefghijkl'}};
for(const op of ['preview_proposal_application','resolve_proposal_application','apply_proposal_application']){assert.equal(gate(name,{...qa,operation:op},'us-central1'),'');checks++;}
assert.equal(gate(name,{...qa,payload:{proposalId:'real_proposal',sourceRunId:'cobledger_'+'a'.repeat(28)}},'us-central1'),'');checks++;
for(const op of ['resolve_proposal_application','apply_proposal_application']){
 assert.equal(gate(name,{...qa,operation:op,payload:{proposalId:'real_proposal',sourceRunId:'cobledger_'+'a'.repeat(28)}},'us-central1'),'I66_PREVIEW_MUTATION_CALLABLE_DENIED');checks++;
}
assert.equal(gate(name,{...qa,tenantId:'another-tenant'},'us-central1'),'I66_PREVIEW_MUTATION_CALLABLE_DENIED');checks++;
assert.equal(gate(name,qa,'us-east1'),'I66_PREVIEW_REGION_DENIED');checks++;
assert.equal(gate('orbit360CobrosReconciliationCommand',qa,'us-central1'),'I66_PREVIEW_REGION_DENIED');checks++;
console.log(JSON.stringify({status:'PASS',checks,scope:'SIGNED_UAT_OFFLINE_GUARDS_ONLY',cloudWrites:0}));
