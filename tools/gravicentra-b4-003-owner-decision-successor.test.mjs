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

const {validateEquipoCausalSourceSuccessor:validateTeam}=await import('./gravicentra-b4-003-formal-live-closeout-guard.mjs');
const {execFileSync}=await import('node:child_process');
const teamPaths=["orbit360-platform/data/store-firestore-product-operational-p0.js","tests/goal-participation-classification-writer.test.cjs","tools/gravicentra-b4-003-live-backend-source-readback.cjs",".github/workflows/gravicentra-b4-003-live-protected-reader-20261029.yml","tools/gravicentra-b4-003-live-reader-source-readback.test.cjs"];
const teamBase='b3dcd9d1a57bb4871b06df341ec6198c56f9cfe9';
const postSourceBase='e5030ec5ba9854f0c576fd905c2f510766347ffa';
const frozenTransportPaths=new Set([teamPaths[2],teamPaths[3],teamPaths[4]]);
const readPostBase=path=>process.env.GI_POST_E503_BASE_DIR?fs.readFileSync(process.env.GI_POST_E503_BASE_DIR+'/'+path):execFileSync('git',['show',postSourceBase+':'+path]);
const teamBytes=Object.fromEntries(teamPaths.map(path=>[path,frozenTransportPaths.has(path)?readPostBase(path):fs.readFileSync(path)]));
const baseSourceBytes=Object.fromEntries(teamPaths.map((path,index)=>[path,index===4?null:(process.env.GI_SOURCE_SUCCESSOR_BASE_DIR?fs.readFileSync(process.env.GI_SOURCE_SUCCESSOR_BASE_DIR+'/'+path):execFileSync('git',['show',teamBase+':'+path]))]));
const teamRecord={execution:{productSourceChanged:true,workflowChanged:true},equipoCausalSourceCorrection:{
 schema:'GRAVICENTRA_EQUIPO_CAUSAL_SOURCE_SUCCESSOR_V1',sourceBaseHead:teamBase,status:'SOURCE_AND_QA_READY_READBACK_ONLY_NOT_DEPLOYED',
 realBusinessWrites:0,repeatSevenClassificationWrites:false,rulesChanged:false,productionAccepted:false,
 changes:teamPaths.map(path=>({path,previousBlobSha:baseSourceBytes[path]===null?null:hash(baseSourceBytes[path]),blobSha:hash(teamBytes[path])}))
}};
const teamFixture=()=>({record:clone(teamRecord),pointer:{productSourceChanged:true},fileBytes:clone(teamBytes),baseSourceBytes:clone(baseSourceBytes)});
assert.deepEqual(validateTeam(teamFixture()).allowedPaths,teamPaths);checks++;
function rejectsTeam(label,edit,pattern){const f=teamFixture();edit(f);assert.throws(()=>validateTeam(f),pattern,label);checks++;}
rejectsTeam('wrong source ancestor',f=>f.record.equipoCausalSourceCorrection.sourceBaseHead='0'.repeat(40),/TEAM_SOURCE_BASE/);
rejectsTeam('repeat real writes',f=>f.record.equipoCausalSourceCorrection.repeatSevenClassificationWrites=true,/TEAM_SOURCE_SCOPE/);
rejectsTeam('new PASS',f=>f.record.equipoCausalSourceCorrection.productionAccepted=true,/TEAM_SOURCE_SCOPE/);
rejectsTeam('missing causal test',f=>f.record.equipoCausalSourceCorrection.changes.pop(),/TEAM_SOURCE_CHANGES/);
rejectsTeam('file substitution',f=>f.record.equipoCausalSourceCorrection.changes[0].path='firestore.rules',/TEAM_SOURCE_REQUIRED_PATHS|TEAM_SOURCE_PATH_OR_PREDECESSOR/);
rejectsTeam('hash mismatch',f=>f.fileBytes[teamPaths[0]]=Buffer.from('tampered'),/TEAM_SOURCE_CURRENT_BLOB/);
rejectsTeam('different predecessor',f=>f.baseSourceBytes[teamPaths[0]]=Buffer.from('tampered'),/TEAM_SOURCE_BASE_BYTES/);
rejectsTeam('unrelated product edit',f=>{f.fileBytes[teamPaths[0]]=Buffer.concat([Buffer.from(f.fileBytes[teamPaths[0]]),Buffer.from('// unrelated\n')]);f.record.equipoCausalSourceCorrection.changes[0].blobSha=hash(f.fileBytes[teamPaths[0]]);},/TEAM_SOURCE_EXACT_ACK_PATCH/);
rejectsTeam('push deployment default',f=>{f.fileBytes[teamPaths[3]]=Buffer.from(Buffer.from(f.fileBytes[teamPaths[3]]).toString().replace('default: readback','default: deploy'));f.record.equipoCausalSourceCorrection.changes[3].blobSha=hash(f.fileBytes[teamPaths[3]]);},/TEAM_SOURCE_READBACK_DEFAULT|TEAM_SOURCE_REVIEWED_TRANSPORT_BLOB/);
console.log('OWNER_AND_EQUIPO_BOUNDED_SUCCESSOR_CONTRACT_PASS '+checks+' checks; current42 historical checks retained');

rejectsTeam('cancel source requires test',f=>f.record.equipoCausalSourceCorrection.changes.push({path:'orbit360-platform/modules/cancelaciones.js',previousBlobSha:'c9f6934beea57136daca0a3292451ad0792181c1',blobSha:'c206f79a47b8aa8684dc0cf50756f3720166bdbe'}),/CANCELLATION_SOURCE_TEST_PAIR_REQUIRED/);
console.log('FINAL_BOUNDED_SUCCESSOR_PASS '+checks+' checks');

const frontendPaths=[
 ['orbit360-platform/modules/cancelaciones.js','c9f6934beea57136daca0a3292451ad0792181c1'],
 ['tools/gravicentra-b4-003-cancelaciones-commercial-qa.test.cjs',null],
 ['orbit360-platform/modules/reportes.js','e00cdbaef2207b6e48c6507c0039161afa07c4e0'],
 ['.github/workflows/gravicentra-b4-003-immutable-candidate-preview.yml','2b74f6d920f5da6016256dd40ce6666f0693cd1e'],
 [root+'I6_5_B4_003_CURRENT42_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_20261107.json',null]
];
function frontendFixture(){
 const f=teamFixture(),proof=f.record.equipoCausalSourceCorrection;
 for(const [path,prior] of frontendPaths){
  f.fileBytes[path]=fs.readFileSync(path);
  f.baseSourceBytes[path]=prior?(process.env.GI_SOURCE_SUCCESSOR_BASE_DIR?fs.readFileSync(process.env.GI_SOURCE_SUCCESSOR_BASE_DIR+'/'+path):execFileSync('git',['show',teamBase+':'+path])):null;
  proof.changes.push({path,previousBlobSha:prior,blobSha:hash(f.fileBytes[path])});
 }
 const workflowPath=frontendPaths[3][0],contractPath=frontendPaths[4][0];
 proof.status='SOURCE_AND_QA_READY_FRONTEND_PREVIEW_ONLY_NOT_DEPLOYED';
 proof.previewAllowedOnly={workflowPath,contractPath,contractBlobSha:'c792b7db1aa3f16ed7ee20cbdffe2b76dc61b97f',site:'ays-orbit-360-lab',channelId:'gi-i65-b4-rc-41765742748',buildExactlyOnce:true,livePromotionAuthorized:false,backendFunctionDeploys:0,current42Preserved:true,productPaths:[teamPaths[0],frontendPaths[0][0],frontendPaths[2][0]]};
 return f;
}
assert.equal(validateTeam(frontendFixture()).allowedPaths.length,10);checks++;
for(const [key,value] of [['livePromotionAuthorized',true],['backendFunctionDeploys',1],['current42Preserved',false]]){
 const f=frontendFixture();f.record.equipoCausalSourceCorrection.previewAllowedOnly[key]=value;
 assert.throws(()=>validateTeam(f),/FRONTEND_PREVIEW_EXACT_AUTHORITY/);checks++;
}
console.log('FRONTEND_PREVIEW_BOUNDED_SUCCESSOR_PASS '+checks+' checks; LIVE, backend deployment and historical reset rejected');

const {validateReaderDeploymentSuccessorSnapshot:validateReader}=await import('./gravicentra-b4-003-formal-live-closeout-guard.mjs');
const readerRecord={"schema":"GRAVICENTRA_READER_DEPLOYMENT_SUCCESSOR_V1","sourceBaseHead":"e5030ec5ba9854f0c576fd905c2f510766347ffa","status":"EXACT_ISOLATED_READER_PREPARED_ACTIVATION_REQUIRED","target":"orbit360ScopedPolicyRead","region":"us-east1","project":"ays-orbit-360-lab","preservedFrontendSource":"e5030ec5ba9854f0c576fd905c2f510766347ffa","deployAuthorized":true,"requiresActivationReceipt":true,"activationPath":"artifacts/orbit360-recovery/release-control/I6_5_B4_003_ISOLATED_READER_DEPLOY_ACTIVATION_20261107.json","allowedPushSubject":"deploy(b4-003): exact isolated LIVE reader e503 successor","hostingDeployAuthorized":false,"rulesWrites":0,"realBusinessWrites":0,"repeatSevenClassificationWrites":false,"otherFunctionsDeployAuthorized":false,"backendSourceFilesChanged":false,"before":{"runId":42397991685,"runConclusion":"success","observedAtUtc":"2026-11-07T17:47:31.769Z","sourceManifestSha256":"067c746216f25a8aecbcf435bd0cd00a2ed0f8463c7446bb9c36ee5dc5a822ff","archiveSha256":"eb076c9f52c16d1a66bd3bd0b31a25555a57fc6109cdfe9b6d0f61dcfcd27fe9","revision":"orbit360scopedpolicyread-00001-tiv"},"expectedIsolatedSourceManifestSha256":"690d036074683b4ea1d46cf867fa14856b40536fe739388ff50801ec9d31786a","singleExport":"orbit360ScopedPolicyRead","completeLocalDependencyFiles":7,"packageFiles":10,"readOnlyDiagnostic":{"target":"orbit360TenantDomainConfig","region":"us-central1","invokesCallable":false,"deployAuthorized":false,"businessDataReads":0},"changes":[{"path":".github/workflows/gravicentra-b4-003-live-protected-reader-20261029.yml","previousBlobSha":"bd45ef8297cb4d326929a01d5b8c4303369b72d4","blobSha":"967fc96d3d263b34bec8c8cbb4be6ce0b3a40967","sha256":"301a451e7ac059e2723c7aad276d923f62ac20c609c22ff75f672d3942012163"},{"path":"tools/gravicentra-b4-003-live-backend-source-readback.cjs","previousBlobSha":"48edf21b50f05521a33159b5925e75a904841951","blobSha":"632e8ded686b2d9dba2b80cda6f5f54824575831","sha256":"d446fd359a2ad6d3857fa21472651a9ebe446e21e90e24e0cc81a341aec44f55"},{"path":"tools/gravicentra-b4-003-live-reader-source-readback.test.cjs","previousBlobSha":"43072eb1d054b18438a76d300214827652b61ad9","blobSha":"46020dfb28143974f9701478edb9c6cfbb7be075","sha256":"28d002dacbfb09392714beab198c6d02f105db254d8a0a88ae1a45d00f389a25"},{"path":"tools/gravicentra-b4-003-isolated-reader-package.cjs","previousBlobSha":null,"blobSha":"50e4bd4c2b4d5391d1c2097364e1786454818f31","sha256":"e6eb5145079074c1dcd7a7e4f55f7aeb6e7ce0dd7ad5a5d5813b673f62a0eae5"},{"path":"tools/gravicentra-b4-003-isolated-reader-package.test.cjs","previousBlobSha":null,"blobSha":"6787010e0ef9a756ebfed093bc64619724c38e0f","sha256":"aee1bec53e6f4a397edbb31ed57609d429c7ccf5a5e91c3cfa8ad5df45a8058c"}],"tests":{"isolatedPackage":16,"sourceReadback":39,"workflowYamlAndBash":8},"firstPublishMode":"READBACK_ONLY","activationNotYetCreated":true};
function readerFixture(){
 const bytes={},baseBytes={};
 for(const x of readerRecord.changes){bytes[x.path]=fs.readFileSync(x.path);baseBytes[x.path]=x.previousBlobSha?readPostBase(x.path):null;}
 return{record:{readerDeploymentSuccessor:clone(readerRecord)},fileBytes:bytes,baseSourceBytes:baseBytes};
}
const readerGood=readerFixture(),readerValidated=validateReader(readerGood);
assert.equal(readerValidated.allowedPaths.length,5);checks++;
for(const x of readerRecord.changes.filter(x=>x.previousBlobSha))assert.equal(hash(Buffer.from(readerValidated.comparableFileBytes[x.path])),x.previousBlobSha);checks++;
function rejectReader(edit,pattern){const f=readerFixture();edit(f);assert.throws(()=>validateReader(f),pattern);checks++;}
rejectReader(f=>f.record.readerDeploymentSuccessor.target='orbit360TenantDomainConfig',/READER_DEPLOY_IDENTITY/);
rejectReader(f=>f.record.readerDeploymentSuccessor.preservedFrontendSource='0'.repeat(40),/READER_DEPLOY_BASE/);
rejectReader(f=>f.record.readerDeploymentSuccessor.before.archiveSha256='0'.repeat(64),/READER_DEPLOY_EXACT_OBSERVED_PREDECESSOR/);
rejectReader(f=>f.record.readerDeploymentSuccessor.readOnlyDiagnostic.deployAuthorized=true,/READER_CATALOG_READONLY_SCOPE/);
rejectReader(f=>f.record.readerDeploymentSuccessor.requiresActivationReceipt=false,/READER_DEPLOY_ACTIVATION_CONTRACT/);
rejectReader(f=>f.fileBytes[readerRecord.changes[0].path]=Buffer.from('unreviewed workflow'),/READER_DEPLOY_CURRENT_PIN/);
console.log('POST_E503_READER_BOUNDED_SUCCESSOR_PASS '+checks+' checks; historical source pins preserved, activation required');
