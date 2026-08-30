#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {assertFunctionalDiagnosticSemantics} from './orbit360-operational-semantic-authority-v20260830.mjs';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const REPAIR='POST_GO_LIVE_SEMANTIC_SINGLE_STATE_ROOTFIX_VALIDATE_AND_SEAL';
const RECOVERY='CONTROL_PLANE_RECOVER_ORPHANED_SOURCE_ONLY_TERMINAL';
const SELFTEST='CONTROL_PLANE_SELFTEST';
const EXEMPT=new Set([REPAIR,RECOVERY,SELFTEST]);
const args=process.argv.slice(2);
const val=f=>{const i=args.indexOf(f);return i>=0?String(args[i+1]||''):'';};
const readJson=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const fail=code=>{throw new Error(code);};

export function assertPreclaimOperationalSemanticParity(intent,ledger,failFn=fail){
  const transitionId=String(intent?.transitionId||'');
  if(!transitionId)failFn('PRECLAIM_SEMANTIC_TRANSITION_MISSING');
  if(EXEMPT.has(transitionId))return{ok:true,status:'PRECLAIM_OPERATIONAL_SEMANTIC_EXEMPT',transitionId,exempt:true};
  const fv=ledger?.functionalValidation;
  assertFunctionalDiagnosticSemantics(fv,failFn,{requireComplete:fv?.status==='BLOCKING_THREE_VISIBLE_DEFECTS'});
  return{ok:true,status:'PRECLAIM_OPERATIONAL_SEMANTIC_PARITY_PASS',transitionId,exempt:false};
}

function selftest(){
  const live=readJson(LEDGER),drift=structuredClone(live);
  if(!drift.functionalValidation||!Array.isArray(drift.functionalValidation.blockers)||!drift.functionalValidation.blockers.length)throw new Error('PRECLAIM_SEMANTIC_SELFTEST_FIXTURE_MISSING');
  const insurer=drift.functionalValidation.blockers.find(x=>x?.id==='INSURER_PORTAL_REVEAL_OPEN');
  if(!insurer)throw new Error('PRECLAIM_SEMANTIC_SELFTEST_INSURER_FIXTURE_MISSING');
  insurer.nextDiagnostic='secure_reference_to_provider_to_runtime_to_reveal';
  let ordinaryBlocked=false,repairAllowed=false,recoveryAllowed=false,selftestAllowed=false;
  try{assertPreclaimOperationalSemanticParity({transitionId:'POST_GO_LIVE_OVERLAY_RELEASE_PREP_SOURCE_ONLY'},drift);}catch(e){ordinaryBlocked=String(e?.message||e).includes('OPERATIONAL_SEMANTIC_DIAGNOSTIC_DRIFT:INSURER_PORTAL_REVEAL_OPEN');}
  try{repairAllowed=assertPreclaimOperationalSemanticParity({transitionId:REPAIR},drift).exempt===true;}catch{}
  try{recoveryAllowed=assertPreclaimOperationalSemanticParity({transitionId:RECOVERY},drift).exempt===true;}catch{}
  try{selftestAllowed=assertPreclaimOperationalSemanticParity({transitionId:SELFTEST},drift).exempt===true;}catch{}
  const ok=ordinaryBlocked&&repairAllowed&&recoveryAllowed&&selftestAllowed;
  console.log(JSON.stringify({ok,status:ok?'PRECLAIM_OPERATIONAL_SEMANTIC_GUARD_SELFTEST_PASS':'PRECLAIM_OPERATIONAL_SEMANTIC_GUARD_SELFTEST_FAIL',ordinaryTransitionBlockedBeforeClaim:ordinaryBlocked,semanticRepairExempt:repairAllowed,orphanRecoveryExempt:recoveryAllowed,controlPlaneSelftestExempt:selftestAllowed,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
  if(!ok)process.exit(41);
}

try{
  if(args.includes('--selftest')){selftest();process.exit(0);}
  const intentPath=val('--intent')||process.env.ORBIT360_EXECUTION_INTENT||'';
  if(!intentPath||!fs.existsSync(intentPath))throw new Error('PRECLAIM_SEMANTIC_INTENT_MISSING');
  const intent=JSON.parse(fs.readFileSync(intentPath,'utf8').replace(/^\uFEFF/,''));
  const result=assertPreclaimOperationalSemanticParity(intent,readJson(LEDGER));
  console.log(JSON.stringify({...result,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
}catch(error){
  console.error(JSON.stringify({ok:false,status:'PRECLAIM_OPERATIONAL_SEMANTIC_GUARD_FAIL',classification:'VALIDATOR_STALE',code:String(error?.message||error),runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
  process.exit(41);
}
