import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateOwnerDecisionSuccessorSnapshot as validate} from './gravicentra-b4-003-formal-live-closeout-guard.mjs';
const root='artifacts/orbit360-recovery/release-control/';
const guard='tools/gravicentra-b4-003-formal-live-closeout-guard.mjs';
const self='tools/gravicentra-b4-003-owner-decision-successor.test.mjs';
const freeze=root+'OWNER_DECISION_FREEZE_AND_RECONCILIATION_PLAN_20261107.json';
const plan=root+'PLAN_OPERATIVO_DECISIONES_PAULA_20261107.md';
const v6=root+'I6_5_I6_6_PAYMENT_INFERENCE_RECONCILIATION_LOCK_V6_20261001.json';
const statePath='orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json';
const base='74312cc3621ba155ee288a0afb530a488246f0e6';
const key='ownerDecisionFreeze20261107';
const hash=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const clone=x=>structuredClone(x);
const fileBytes={
 [guard]:fs.readFileSync(fileURLToPath(new URL('./gravicentra-b4-003-formal-live-closeout-guard.mjs',import.meta.url))),
 [self]:fs.readFileSync(fileURLToPath(import.meta.url)),
 [v6]:fs.readFileSync(v6),
 [plan]:Buffer.from('# Exact owner plan\n')
};
const baseControl={
 nextAction:'B4_003_CLOSED_RETURN_TO_FROZEN_PLAN_NEXT_GATE_NOT_EXECUTED',
 pendingClosureMasterPlan:{blobSha:'sealed-master',status:'sealed'},
 capabilityStatusAuthority:{latestBlobSha:'sealed-ledger'},
 findingContinuityControl:{masterPlanBlobSha:'sealed-master'},
 currentB4:{status:'B4_003_CLOSED_PASS_CURRENT42',humanFunctionalAccepted:true},
 paymentInferenceReconciliationControl:{activeVersion:'V4_20260930',path:'old-v4',blobSha:'sealed-v4',autoCommitHighConfidence:true},
 certificates:{closed:true,receiptBlobSha:'0879188bf245248fa1092fb2014e35e14e802b44'}
};
const baseState={updatedAtUtc:'previous',nextAction:'previous',productionAccepted:false,capabilities:{count:15}};
const record={
 schema:'GRAVICENTRA_OWNER_DECISION_FREEZE_20261107_V1',authorityBaseHead:base,additiveOnly:true,
 repository:'paulaosoriof86/orbit360-core',branch:'recovery/fase-a-clean-20260831',recordedAtUtc:'2026-11-07T16:25:48Z',
 plan:{path:plan,blobSha:hash(fileBytes[plan])},nextGateExecuted:false,nextGateAccepted:false,
 execution:{productSourceChanged:false,workflowChanged:false,productDeployed:false,dnsChanged:false,dataImportExecuted:false,newModulePassGranted:false,realBusinessWrites:0},
 governanceSuccessorValidation:{schema:'GRAVICENTRA_OWNER_DOCUMENTARY_SUCCESSOR_VALIDATION_V1',baseHead:base,guardPath:guard,guardBlobSha:hash(fileBytes[guard]),testPath:self,testBlobSha:hash(fileBytes[self])}
};
function fixture(){
 const bytes={...fileBytes,[freeze]:Buffer.from(JSON.stringify(record))};
 const p={authorityBaseHead:base,path:freeze,blobSha:hash(bytes[freeze]),planPath:plan,planBlobSha:hash(bytes[plan]),
 recordedAtUtc:record.recordedAtUtc,nextGateExecuted:false,nextGateAccepted:false,productSourceChanged:false,realBusinessWrites:0,
 firstIncompleteGate:'B4-004-SINIESTROS-CRONOGRAMA',preservedB4003ReceiptBlobSha:'0879188bf245248fa1092fb2014e35e14e802b44',
 preservedProductSourceSha:'857f1222f360a42a06e012810a1c01bce155a26f'};
 const control=clone(baseControl);
 Object.assign(control,{[key]:p,currentExecutionDecisionPointer:key});
 Object.assign(control.pendingClosureMasterPlan,{currentDecisionPointer:key,firstIncompleteGateUnderCurrentOwnerScope:p.firstIncompleteGate});
 Object.assign(control.paymentInferenceReconciliationControl,{activeVersion:'V6_20261001',path:v6,blobSha:'b47f91000713de9c8ac317e1f3fd118b2eafc0d5',
 previousActiveRulePointer:{...baseControl.paymentInferenceReconciliationControl,preservedInGitHistory:true},
 currentOriginAndTimingAuthority:'V6 originContract and V7 temporal addendum',
 ownerPolicyModalities20261107:{policy:'VIME-18154',insurer:'G&T',modality:'MONTHLY_12_PAYMENTS',ownerConfirmed:true,scope:'POLICY_ONLY_NOT_GLOBAL_FRACCIONADO_CEILING',receiptPath:freeze,receiptBlobSha:p.blobSha,dataApplied:false}});
 delete control.paymentInferenceReconciliationControl.previousActiveRulePointer.autoCommitHighConfidence;
 const state={...clone(baseState),[key]:clone(p),currentExecutionDecisionPointer:key,updatedAtUtc:record.recordedAtUtc,nextAction:'Follow '+key};
 return {control,baseControl:clone(baseControl),state,baseState:clone(baseState),
 changedPaths:[root+'CONTROL_PLANE.json',statePath,freeze,plan,guard,self],fileBytes:bytes};
}
let checks=0;
function rejects(label,edit,pattern){const f=fixture();edit(f);assert.throws(()=>validate(f),pattern,label);checks++;}
const good=fixture(),out=validate(good);assert.deepEqual(out.comparableControl,baseControl);assert.equal(good.control.paymentInferenceReconciliationControl.activeVersion,'V6_20261001');checks++;
rejects('product edit',f=>f.changedPaths.push('orbit360-platform/modules/equipo.js'),/OWNER_UNDECLARED_PATH/);
rejects('workflow edit',f=>f.changedPaths.push('.github/workflows/gravicentra-b4-003-executor.yml'),/OWNER_UNDECLARED_PATH/);
rejects('receipt edit',f=>f.changedPaths.push(root+'I6_5_B4_003_CURRENT42_FINAL_LIVE_CLOSEOUT_20261107.json'),/OWNER_UNDECLARED_PATH/);
rejects('other documentation',f=>f.changedPaths.push(root+'UNAPPROVED.json'),/OWNER_UNDECLARED_PATH/);
rejects('ledger edit',f=>f.changedPaths.push(root+'CAPABILITY_STATUS_LEDGER.json'),/OWNER_UNDECLARED_PATH/);
rejects('wrong plan bytes',f=>f.fileBytes[plan]=Buffer.from('changed'),/OWNER_DOCUMENT_HASH/);
rejects('wrong freeze bytes',f=>f.fileBytes[freeze]=Buffer.from('{}'),/OWNER_DOCUMENT_HASH/);
rejects('wrong guard bytes',f=>f.fileBytes[guard]=Buffer.from('changed'),/OWNER_VALIDATION_HASH/);
rejects('wrong test bytes',f=>f.fileBytes[self]=Buffer.from('changed'),/OWNER_VALIDATION_HASH/);
rejects('unauthorized CP permission',f=>f.control.productionPromotionAuthorized=true,/OWNER_UNENUMERATED_CONTROL_CHANGE/);
rejects('historical certificate changed',f=>f.control.certificates.closed=false,/OWNER_UNENUMERATED_CONTROL_CHANGE/);
rejects('state acceptance changed',f=>f.state.productionAccepted=true,/OWNER_UNENUMERATED_STATE_CHANGE/);
rejects('master sealed pointer changed',f=>f.control.pendingClosureMasterPlan.blobSha='wrong',/OWNER_UNENUMERATED_CONTROL_CHANGE/);
rejects('inference flags changed',f=>f.control.paymentInferenceReconciliationControl.autoCommitHighConfidence=false,/OWNER_UNENUMERATED_CONTROL_CHANGE/);
rejects('policy applied',f=>f.control.paymentInferenceReconciliationControl.ownerPolicyModalities20261107.dataApplied=true,/OWNER_POLICY_MODALITY/);
rejects('wrong source base',f=>f.control[key].authorityBaseHead='0'.repeat(40),/OWNER_BASE_BINDING/);
console.log('OWNER_DOCUMENTARY_SUCCESSOR_CONTRACT_PASS '+checks+' checks; no Git, network, product or business writes');

