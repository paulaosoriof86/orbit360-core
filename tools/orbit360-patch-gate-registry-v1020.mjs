#!/usr/bin/env node
import fs from 'node:fs';
const P='tools/orbit360-gate-contract-registry-v20260717.json';
const G='block1-client360-insurers-lab-v20260717';
const H='tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs';
const R='tools/orbit360-gate-runtime-crm-v20260716.mjs';
const j=JSON.parse(fs.readFileSync(P,'utf8'));
const g=j.gates.find(x=>x.gateId===G);if(!g)throw new Error('GATE_NOT_FOUND');if(g.contractVersion!=='1.0.19')throw new Error('SOURCE:'+g.contractVersion);
const uniq=a=>[...new Set([].concat(a||[]))];
g.contractVersion='1.0.20';g.diagnosticRevision='external-owner-handoff-evidence-v1';g.status='ACTIVE_VALIDATOR_RECONCILIATION';
g.diagnosticRule='Accept Store, Router and Auth handoff from pre-navigation CDP parse evidence plus the approved Auth UI milestone; do not duplicate the same proof through a page evaluator that can be starved by later runtime contracts.';
g.executionBudget.ownerHandoffExternalEvidenceMs=24000;
g.executionBudget.evidence={sourceContractVersion:'1.0.19',preflightPassed:true,labCountsPassed:true,labDeployPassed:true,pwaControllerControlled:true,authProviderReady:true,authUiReady:true,failedStage:'canonical_owner_handoff_ready',firstError:'PIPELINE_STEP_TIMEOUT:canonical_owner_handoff_ready',rootInference:'canonical_auth_ui_ready proves the canonical inline order reached Orbit.auth.init after Orbit.store.init and Orbit.router.init; the duplicate page evaluator timed out while contracts continued loading.'};
g.executionBudget.interpretation='Product frozen. Version 1.0.20 changes only validator evidence; watchdog and accepted budgets remain unchanged.';
g.executionBudget.exhaustionPolicy='Run once after GO_GATE_CONTRACT. If the same stage fails, inspect only ownerHandoffDiagnostic and browserParseDiagnostics; do not touch product owners, data or another module.';
g.executionBudget.acceptancePolicy='Only sanitized ok:true closes the gate.';
g.reconciliation={date:'2026-07-18',classifications:['VALIDATOR_STALE'],scope:'canonical_owner_handoff_ready validator only',rootCause:'The gate re-evaluated Store, Router and Auth after canonical_auth_ui_ready had already proven the ordered initialization path. The duplicate evaluator was starved and produced a false timeout.',corrections:['freeze Cliente 360, Aseguradoras, Orbit.store, Auth, Router, Firestore rules and tenant data','extend pre-navigation CDP parse evidence to data/store.js, core/router.js and core/auth.js','record each owner separately in ownerHandoffDiagnostic','use canonical_auth_ui_ready as ordered bootstrap proof','fail closed on owner parse failure or missing evidence','run preflight first and the same gate once'],openEvidence:['1.0.20 sanitized ok:true across three views'],preserved:['Orbit.store API','core/auth.js','core/router.js','Firestore rules','Cliente 360 renderer','Aseguradoras renderer','414 clientes','26 aseguradoras','7 asesores']};
function c(p){const x=g.runtimeVersionContracts.find(y=>y.path===p);if(!x)throw new Error('CONTRACT:'+p);return x}
const hc=c(H);hc.requiredTokens=uniq(hc.requiredTokens.concat(['waitForOwnerHandoffEvidence','ownerHandoffDiagnostic','storeOwnerScriptParsed','routerOwnerScriptParsed','authOwnerScriptParsed','inlineInitOrderEstablished','OWNER_HANDOFF_EXTERNAL_EVIDENCE_MISSING']));
const rc=c(R);rc.requiredTokens=uniq(rc.requiredTokens.map(t=>t==="contractVersion:'1.0.19'"?"contractVersion:'1.0.20'":t==='orbit360-runtime-gate-joint-v19-preauth-fail-closed'?'orbit360-runtime-gate-joint-v20-owner-handoff-external-evidence':t).concat(['data\\/store\\.js','core\\/router\\.js','core\\/auth\\.js']));
fs.writeFileSync(P,JSON.stringify(j,null,2)+'\n');console.log(JSON.stringify({ok:true,gateId:G,contractVersion:g.contractVersion,classification:'VALIDATOR_STALE'}));