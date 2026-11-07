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
  f.fileBytes[path]=path==='.github/workflows/gravicentra-b4-003-immutable-candidate-preview.yml'?readPostBase(path):fs.readFileSync(path);
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


// This section constructs synthetic receipt objects in memory. It does not
// create a CP cursor, an acceptance receipt, a commit or a remote operation.
const {validatePolicyCaptureTransportSuccessorSnapshot:validateCaptureRelease,validatePolicyCaptureCausalSourceSuccessor:validateCaptureSource,validateCatalogTransportSuccessorSnapshot:validateCaptureCatalog,validateFrontendPromotionSuccessorSnapshot:validateCaptureHistoricalPromotion}=await import('./gravicentra-b4-003-formal-live-closeout-guard.mjs');
const crAnchor='6c45983610ce0d65a5c63bd07659ad968bfe9da3';
const crKey='policyCaptureFrontendTransportSuccessor20261107',crCursorKey='b4004PolicyCaptureFrontendSuccessor20261107';
const crContract=root+'I6_5_B4_004_POLICY_CAPTURE_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_20261107.json';
const crCp=root+'CONTROL_PLANE.json';
const crSha=b=>createHash('sha256').update(b).digest('hex');
const crBytes=x=>Buffer.from(JSON.stringify(x));
const crBaseRead=path=>process.env.GI_CAPTURE_RELEASE_BASE_DIR?fs.readFileSync(process.env.GI_CAPTURE_RELEASE_BASE_DIR+'/'+path):execFileSync('git',['show',crAnchor+':'+path]);
const crHistory=(head,path,env)=>process.env[env]?fs.readFileSync(process.env[env]+'/'+path):execFileSync('git',['show',head+':'+path]);
const crPaths=['tools/gravicentra-b4-003-retained-hosting-preflight.mjs','tools/gravicentra-b4-003-retained-hosting-promotion.mjs','.github/workflows/gravicentra-b4-003-executor.yml',root+'I6_5_B4_004_E503_ROLLBACK_DURABLE_CERTIFICATE_20261107.json','tools/gravicentra-b4-004-policy-capture-retained-promotion.test.cjs'];
const crReceipts={transport:root+'I6_5_B4_004_POLICY_CAPTURE_IMMUTABLE_PREVIEW_TRANSPORT_20261107.json',focal:root+'I6_5_B4_004_POLICY_CAPTURE_FOCAL_PREVIEW_QA_20261107.json',preflight:root+'I6_5_B4_004_POLICY_CAPTURE_RETAINED_HOSTING_PREFLIGHT_20261107.json',promoted:root+'I6_5_B4_004_POLICY_CAPTURE_RETAINED_HOSTING_PROMOTED_20261107.json'};
const crAssertKeys=['exactArtifactBeforeWrites','originalAbsenceVerified','advisorCommissionAndScopedAudit','clientFormAndAtomicActivity','policyFormAtomicBatchAndDerivedClientState','receiptEditFormAndAtomicPortfolioActivity','freshProductReloadWithoutAdapter'];
const crVersions={preview:'sites/ays-orbit-360-lab/versions/syntheticCaptureVersion',rollback:'sites/ays-orbit-360-lab/versions/d8caae0d585bf6dd'};
const crRefs={transport:'transportEvidence',focal:'focalEvidence',preflight:'preflightEvidence',promoted:'promotionEvidence'};
const crCountStart=checks;
function crFixture(phase='TRANSPORT_PREPARED_NO_ARTIFACT'){
 const record=JSON.parse(crBaseRead(freeze)),baseControl=JSON.parse(crBaseRead(crCp)),baseState=JSON.parse(crBaseRead(statePath));
 const fileBytes={[crContract]:fs.readFileSync(crContract)},baseSourceBytes={};
 const contract=JSON.parse(fileBytes[crContract]);
 const p=record[crKey]={schema:'GRAVICENTRA_POLICY_CAPTURE_FRONTEND_TRANSPORT_SUCCESSOR_V1',sourceBaseHead:crAnchor,phase,sourceContractPath:crContract,sourceContractBlobSha:'985c1444446e21f17f1eb6462131304e0c6cc413',productSourceChangedAfterBuild:false,rebuildExecuted:false,artifactPatched:false,backendFunctionDeploys:0,rulesWrites:0,authIamChanges:0,realBusinessWrites:0,nextGateAccepted:false,globalProductionAccepted:false,productionPromotionAuthorized:phase==='PROMOTION_AUTHORIZED',changes:[]};
 for(const [i,path]of crPaths.entries()){const b=fs.readFileSync(path);fileBytes[path]=b;baseSourceBytes[path]=i<3?crBaseRead(path):null;p.changes.push({path,previousBlobSha:i<3?hash(baseSourceBytes[path]):null,blobSha:hash(b),sha256:crSha(b)});}
 const f={record,control:clone(baseControl),state:clone(baseState),fileBytes,baseSourceBytes,baseControl,baseState};
 if(phase==='TRANSPORT_PREPARED_NO_ARTIFACT')return f;
 const onlyTransport=phase==='EXACT_PREVIEW_TRANSPORT_PASS_FOCAL_UAT_PENDING';
 const needsPreflight=['PREFLIGHT_PASS_PROMOTION_NOT_AUTHORIZED','PROMOTION_AUTHORIZED','LIVE_BYTES_PASS_FOCAL_LIVE_PENDING'].includes(phase);
 const proof={sourceSha:crAnchor,buildId:'gi-i65-b4-'+crAnchor.slice(0,12)+'-synthetic',runId:90000000001,artifactId:90000000002,artifactZipSha256:'1'.repeat(64),archiveSha256:'2'.repeat(64),hostedPayloadDigest:'3'.repeat(64),previewChannelId:'gi-i65-b4-rc-41765742748',previewUrl:'https://ays-orbit-360-lab--gi-i65-b4-rc-41765742748-neoi3u7r.web.app',versionName:needsPreflight?crVersions.preview:null,workflowConclusion:'success',exactServedReadbackPassed:true,productFiles:218,artifactZipBytes:500000,readbackReceiptArtifactId:90000000003,readbackReceiptArtifactZipSha256:'4'.repeat(64),readbackReceiptPath:crReceipts.transport,readbackReceiptBlobSha:null,readbackReceiptSha256:null};
 const t={schema:'I6_5_B4_003_IMMUTABLE_PREVIEW_RELEASE_BUNDLE_V1',...Object.fromEntries(['sourceSha','buildId','runId','artifactId','artifactZipSha256','archiveSha256','hostedPayloadDigest','productFiles','previewUrl'].map(k=>[k,proof[k]])),sourceContract:crContract,preservedCurrent42:contract.preservedAcceptance,rollback:contract.rollback,servedArtifactExact:true,fullProductReadback:true,liveLabStable:true,liveAppDomainStable:true,backendFunctionsDeployed:0,dataWrites:0,firestoreRulesWrites:0,authIamChanges:0,productionDeploy:false,authenticatedUat:'PENDING',productionPromotionAuthorized:false};
 const c={schema:'GRAVICENTRA_B4_004_POLICY_CAPTURE_SUCCESSOR_CURSOR_V1',status:onlyTransport?'EXACT_PREVIEW_TRANSPORT_PASS_FOCAL_UAT_PENDING':phase==='PROMOTION_AUTHORIZED'?'FRONTEND_SUCCESSOR_PREVIEW_ACCEPTED_PROMOTION_AUTHORIZED':phase==='LIVE_BYTES_PASS_FOCAL_LIVE_PENDING'?'FRONTEND_SUCCESSOR_LIVE_BYTES_PASS_FOCAL_LIVE_PENDING':'FRONTEND_SUCCESSOR_FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING',preservedAcceptancePointer:'/b4003ActiveCertificationCursor20261106/formalLiveAcceptance',preservedPriorSuccessorPointer:'/b4003CausalFrontendSuccessor20261107',sourceContractPath:crContract,sourceContractBlobSha:'985c1444446e21f17f1eb6462131304e0c6cc413',activeSourceSha:crAnchor,activeBuildId:proof.buildId,activeImmutableArtifactId:proof.artifactId,immutableSuccessor44PreviewReadback:proof,productionPromotionAuthorized:phase==='PROMOTION_AUTHORIZED',b4003Closed:true,b4003HistoricalAcceptancePreserved:true,nextGateAccepted:false};
 f.control[crCursorKey]=c;f.state[crCursorKey]=clone(c);
 crSetEvidence(f,'transport',t,proof.runId,crAnchor);
 if(!onlyTransport){
  const q={schema:'GRAVICENTRA_B4_004_POLICY_CAPTURE_FOCAL_PREVIEW_QA_V1',status:'FOCAL_AUTHENTICATED_UI_PASS',runId:proof.runId+'_1',target:proof.previewUrl,artifact:Object.fromEntries(['sourceSha','buildId','artifactId','artifactZipSha256','archiveSha256','hostedPayloadDigest'].map(k=>[k,proof[k]])),sourceOwners:contract.productChanges.map(x=>({path:x.path,blobSha:x.afterBlobSha})),assertions:Object.fromEntries(crAssertKeys.map(k=>[k,true])),businessWrites:0,authAccountsCreated:0,membershipWrites:0,productSourceChanged:false,backendChanged:false,syntheticFinalAbsent:true,errors:[],pageErrorCount:0,consoleErrorCount:0,httpErrorCount:0,actor:{existingPrincipal:true,activeRole:'Dirección',uidSha256:'a'.repeat(64)},cleanup:{method:'EXACT_PREDECLARED_IDS_AND_CAPTURED_SERVER_RECEIPTS',actorTimeWindowQuery:false,prefixDelete:false,compareAndDeleteTransaction:true,verifiedAbsent:true}};
  crSetEvidence(f,'focal',q,proof.runId,crAnchor);
  c.focalAuthenticatedAcceptance={status:'PASS',sourceSha:crAnchor,buildId:proof.buildId,artifactId:proof.artifactId,evidencePins:[{path:crReceipts.focal,blobSha:p.focalEvidence.blobSha}],realBusinessWrites:0,exactSyntheticCleanupVerified:true,syntheticIdentityAdaptationDeclared:true};
  c.formalPreviewAcceptance={status:'LATEST_APPROVED_VERSION_PREVIEW_PASS',sourceSha:crAnchor,buildId:proof.buildId,artifactId:proof.artifactId,archiveSha256:proof.archiveSha256};
 }
 if(needsPreflight){
  const names=['exact_candidate_and_archive','artifact_run_metadata','reuse_existing_service_account_for_gets','live_before_snapshot','preview_version_and_all_served_bytes','certified_rollback_version_and_all_served_bytes','live_unchanged_after_readonly_preflight'];
  const r={schema:'B4_003_RETAINED_HOSTING_PREFLIGHT_V1',status:'EXACT_RETAINED_ARTIFACT_HOSTING_PREFLIGHT_PASS',runId:90000000004,runnerCommit:'b'.repeat(40),failedCheckCount:0,b4003Closed:true,b4003HistoricalAcceptancePreserved:true,binding:{...Object.fromEntries(['sourceSha','buildId','runId','artifactId','artifactZipSha256','archiveSha256','previewUrl'].map(k=>[k,proof[k]])),site:'ays-orbit-360-lab',projectId:'ays-orbit-360-lab'},previewVersionName:crVersions.preview,rollbackVersionName:crVersions.rollback,liveVersionName:crVersions.rollback,control:{recordedB4003Closed:true,recordedPromotionAuthorization:false},scope:{remoteReadsOnly:true,buildExecuted:false,hostingMutation:false,functionsDeployment:false,rulesChanged:false,authConfigurationChanged:false,dataWrites:0},checks:names.map(name=>({name,status:'PASS',evidence:name==='preview_version_and_all_served_bytes'?{digest:proof.hostedPayloadDigest,fileCount:proof.productFiles}:name==='certified_rollback_version_and_all_served_bytes'?{rawBytesReadInThisRun:true,rawPayloadDigestVerified:true,digest:contract.rollback.hostedPayloadDigest,fileCount:contract.rollback.productFiles}:{}}))};
  crSetEvidence(f,'preflight',r,r.runId,r.runnerCommit);
 }
 if(phase==='LIVE_BYTES_PASS_FOCAL_LIVE_PENDING'){
  const r={schema:'B4_003_EXACT_HOSTING_PROMOTION_V1',status:'EXACT_HOSTING_VERSION_PROMOTED_LIVE_BYTES_PASS_FUNCTIONAL_LIVE_PENDING',runId:90000000005,runnerCommit:'c'.repeat(40),promotionAttempted:true,rollbackAttempted:false,formalLiveAcceptanceGranted:false,b4003Closed:true,b4003HistoricalAcceptancePreserved:true,binding:Object.fromEntries(['sourceSha','buildId','artifactId','artifactZipSha256','archiveSha256'].map(k=>[k,proof[k]])),previewVersionName:crVersions.preview,rollbackVersionName:crVersions.rollback,liveBeforeVersionName:crVersions.rollback,promotionMethod:'POST_EXISTING_VERSION_RELEASE_NO_NEW_VERSION',promotionTargetVersionName:crVersions.preview,liveAfter:{channel:{versionName:crVersions.preview},hostedFileCount:proof.productFiles,hostedPayloadDigest:proof.hostedPayloadDigest,nonTargetSentinelsUnchanged:true},functionsDeployed:0,rulesChanged:false,authConfigurationChanged:false,dataWrites:0};
  crSetEvidence(f,'promoted',r,r.runId,r.runnerCommit);
 }
 f.state[crCursorKey]=clone(c);return f;
}
function crSetEvidence(f,kind,obj,runId,runnerCommit){
 const path=crReceipts[kind],b=crBytes(obj),p=f.record[crKey],existing=p[crRefs[kind]];
 const ref={path,blobSha:hash(b),sha256:crSha(b),runId:runId??existing?.runId,runnerCommit:runnerCommit??existing?.runnerCommit,runConclusion:'success'};
 f.fileBytes[path]=b;f.baseSourceBytes[path]=null;p[crRefs[kind]]=ref;
 const change={path,previousBlobSha:null,blobSha:ref.blobSha,sha256:ref.sha256},i=p.changes.findIndex(x=>x.path===path);if(i<0)p.changes.push(change);else p.changes[i]=change;
 const c=f.control[crCursorKey];
 if(kind==='transport'&&c){c.immutableSuccessor44PreviewReadback.readbackReceiptBlobSha=ref.blobSha;c.immutableSuccessor44PreviewReadback.readbackReceiptSha256=ref.sha256;}
 if(kind==='focal'&&c?.focalAuthenticatedAcceptance)c.focalAuthenticatedAcceptance.evidencePins=[{path,blobSha:ref.blobSha}];
 if(c)f.state[crCursorKey]=clone(c);
}
function crReject(label,phase,edit,pattern){const f=crFixture(phase);edit(f);assert.throws(()=>validateCaptureRelease(f),pattern,label);checks++;}
for(const phase of ['TRANSPORT_PREPARED_NO_ARTIFACT','EXACT_PREVIEW_TRANSPORT_PASS_FOCAL_UAT_PENDING','FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING','PREFLIGHT_PASS_PROMOTION_NOT_AUTHORIZED','PROMOTION_AUTHORIZED','LIVE_BYTES_PASS_FOCAL_LIVE_PENDING']){
 const f=crFixture(phase),before=JSON.stringify([f.record,f.control,f.state]),r=validateCaptureRelease(f);
 assert.equal(r.phase,phase);assert.deepEqual(r.comparableControl,f.baseControl);assert.deepEqual(r.comparableState,f.baseState);
 assert.equal(JSON.stringify([f.record,f.control,f.state]),before);
 for(const path of crPaths.slice(0,3))assert.equal(hash(Buffer.from(r.comparableFileBytes[path])),hash(f.baseSourceBytes[path]));
 checks++;
}
crReject('undeclared cursor','FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING',f=>delete f.record[crKey],/CAPTURE_RELEASE_UNDECLARED_CURSOR/);
crReject('prepared placeholder cursor','TRANSPORT_PREPARED_NO_ARTIFACT',f=>{f.control[crCursorKey]={activeSourceSha:'TBD'};f.state[crCursorKey]=clone(f.control[crCursorKey]);},/CAPTURE_RELEASE_PREPARED_CURSOR_FORBIDDEN/);
crReject('wrong source base','TRANSPORT_PREPARED_NO_ARTIFACT',f=>f.record[crKey].sourceBaseHead='0'.repeat(40),/CAPTURE_RELEASE_BASE/);
crReject('scope expansion','TRANSPORT_PREPARED_NO_ARTIFACT',f=>f.record[crKey].backendFunctionDeploys=1,/CAPTURE_RELEASE_BOUNDARY/);
crReject('unreviewed lane path','TRANSPORT_PREPARED_NO_ARTIFACT',f=>f.record[crKey].changes[0].path='firestore.rules',/CAPTURE_RELEASE_EXACT_PATHS/);
crReject('lane current bytes changed','TRANSPORT_PREPARED_NO_ARTIFACT',f=>f.fileBytes[crPaths[0]]=Buffer.from('unreviewed lane'),/CAPTURE_RELEASE_CURRENT_PIN/);
crReject('lane predecessor changed','TRANSPORT_PREPARED_NO_ARTIFACT',f=>f.baseSourceBytes[crPaths[0]]=Buffer.from('unreviewed predecessor'),/CAPTURE_RELEASE_BEFORE_PIN/);
crReject('contract bytes changed','TRANSPORT_PREPARED_NO_ARTIFACT',f=>f.fileBytes[crContract]=Buffer.from('{}'),/CAPTURE_RELEASE_CONTRACT/);
crReject('new current42 seal value','FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING',f=>f.control.b4003ActiveCertificationCursor20261106.formalLiveAcceptance.hostedPayloadDigest='0'.repeat(64),/CAPTURE_RELEASE_HISTORICAL_CURSOR/);
crReject('new e503 acceptance','FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING',f=>f.state.b4003CausalFrontendSuccessor20261107.productionPromotionAuthorized=true,/CAPTURE_RELEASE_HISTORICAL_CURSOR/);
crReject('CP/state divergence','FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING',f=>f.state[crCursorKey].activeBuildId='changed',/CAPTURE_RELEASE_CURSOR_PARITY/);
crReject('missing artifact digest','FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING',f=>{delete f.control[crCursorKey].immutableSuccessor44PreviewReadback.hostedPayloadDigest;f.state[crCursorKey]=clone(f.control[crCursorKey]);},/CAPTURE_RELEASE_PROOF_KEYS/);
crReject('malformed artifact digest','FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING',f=>{f.control[crCursorKey].immutableSuccessor44PreviewReadback.hostedPayloadDigest='x';f.state[crCursorKey]=clone(f.control[crCursorKey]);},/CAPTURE_RELEASE_DIGEST/);
crReject('unseen future build','FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING',f=>{f.control[crCursorKey].activeSourceSha='d'.repeat(40);f.state[crCursorKey]=clone(f.control[crCursorKey]);},/CAPTURE_RELEASE_ACTIVE_ARTIFACT/);
crReject('tampered receipt bytes','FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING',f=>f.fileBytes[crReceipts.focal]=Buffer.from('{}'),/CAPTURE_RELEASE_CURRENT_PIN/);
for(const [label,edit,pattern]of [
 ['failed QA cannot become acceptance',q=>q.status='FAIL',/CAPTURE_RELEASE_QA_STATUS/],
 ['failed cleanup cannot become acceptance',q=>q.syntheticFinalAbsent=false,/CAPTURE_RELEASE_QA_BOUNDARY/],
 ['broad cleanup forbidden',q=>q.cleanup.prefixDelete=true,/CAPTURE_RELEASE_QA_CLEANUP/],
 ['QA error cannot become acceptance',q=>q.errors.push({code:'WRITE_FAILED'}),/CAPTURE_RELEASE_QA_BOUNDARY/],
 ['QA artifact differs',q=>q.artifact.archiveSha256='0'.repeat(64),/CAPTURE_RELEASE_QA_ARTIFACT/],
 ['QA drops an owner',q=>q.sourceOwners.pop(),/CAPTURE_RELEASE_QA_OWNERS/],
 ['QA actual actor role differs',q=>q.actor.activeRole='asesor',/CAPTURE_RELEASE_QA_ACTOR/],
 ['missing native receipt proof',q=>q.assertions.receiptEditFormAndAtomicPortfolioActivity=false,/CAPTURE_RELEASE_QA_ASSERTIONS/]
])crReject(label,'FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING',f=>{const q=JSON.parse(f.fileBytes[crReceipts.focal]);edit(q);crSetEvidence(f,'focal',q);},pattern);
crReject('no authorization before preflight','FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING',f=>f.record[crKey].productionPromotionAuthorized=true,/CAPTURE_RELEASE_AUTHORIZATION/);
crReject('authorization requires full preflight receipt','PROMOTION_AUTHORIZED',f=>delete f.record[crKey].preflightEvidence,/CAPTURE_RELEASE_REFERENCE_preflight/);
crReject('null version remains ineligible for promotion','PROMOTION_AUTHORIZED',f=>{f.control[crCursorKey].immutableSuccessor44PreviewReadback.versionName=null;f.state[crCursorKey]=clone(f.control[crCursorKey]);},/CAPTURE_RELEASE_NEW_VERSION/);
crReject('preflight resolves another version','PREFLIGHT_PASS_PROMOTION_NOT_AUTHORIZED',f=>{const r=JSON.parse(f.fileBytes[crReceipts.preflight]);r.previewVersionName='sites/ays-orbit-360-lab/versions/other';crSetEvidence(f,'preflight',r);},/CAPTURE_RELEASE_PREFLIGHT_VERSIONS/);
crReject('preflight altered artifact bytes','PREFLIGHT_PASS_PROMOTION_NOT_AUTHORIZED',f=>{const r=JSON.parse(f.fileBytes[crReceipts.preflight]);r.checks.find(x=>x.name==='preview_version_and_all_served_bytes').evidence.digest='0'.repeat(64);crSetEvidence(f,'preflight',r);},/CAPTURE_RELEASE_PREFLIGHT_PAYLOAD/);
crReject('preflight rollback mismatch','PROMOTION_AUTHORIZED',f=>{const r=JSON.parse(f.fileBytes[crReceipts.preflight]);r.checks.find(x=>x.name==='certified_rollback_version_and_all_served_bytes').evidence.rawBytesReadInThisRun=false;crSetEvidence(f,'preflight',r);},/CAPTURE_RELEASE_FRESH_E503_ROLLBACK/);
crReject('forged live total','LIVE_BYTES_PASS_FOCAL_LIVE_PENDING',f=>{const r=JSON.parse(f.fileBytes[crReceipts.promoted]);r.liveAfter.hostedFileCount++;crSetEvidence(f,'promoted',r);},/CAPTURE_RELEASE_PROMOTION_READBACK/);
crReject('new global live PASS','LIVE_BYTES_PASS_FOCAL_LIVE_PENDING',f=>{const r=JSON.parse(f.fileBytes[crReceipts.promoted]);r.formalLiveAcceptanceGranted=true;crSetEvidence(f,'promoted',r);},/CAPTURE_RELEASE_PROMOTION_STATUS/);
// Real historical validators prove the order of projection. Historical receipt
// bytes are read, not recreated by this fixture. Omitting either normalization
// reproduces the concrete pin failure that would otherwise block the commit.
{
 const f=crFixture('FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING');
 const historical=f.record.frontendPromotionSuccessor,catalog=f.record.catalogTransportSuccessor;
 const postBytes={},catalogBytes={},captureBytes={};
 for(const p of [historical,catalog])for(const e of p.changes)if(!Object.hasOwn(f.fileBytes,e.path))f.fileBytes[e.path]=fs.readFileSync(e.path);
 for(const e of historical.changes)postBytes[e.path]=e.previousBlobSha===null?null:crHistory(historical.sourceBaseHead,e.path,'GI_POST_E503_BASE_DIR');
 for(const e of catalog.changes)catalogBytes[e.path]=e.previousBlobSha===null?null:crHistory(catalog.sourceBaseHead,e.path,'GI_CATALOG_BASE_DIR');
 for(const e of f.record.policyCaptureCausalSourceCorrection20261107.changes){f.fileBytes[e.path]=fs.readFileSync(e.path);captureBytes[e.path]=e.previousBlobSha===null?null:crHistory('932ccaca0a808b2b4ae577c0a3a27fa80220dbe5',e.path,'GI_POLICY_CAPTURE_BASE_DIR');}
 for(const e of f.record.policyCaptureCausalSourceCorrection20261107.preservedFiles)f.fileBytes[e.path]=fs.readFileSync(e.path);
 assert.throws(()=>validateCaptureCatalog({record:f.record,fileBytes:f.fileBytes,baseSourceBytes:catalogBytes}),/CATALOG_REVIEWED_CURRENT_PIN/);checks++;
 const release=validateCaptureRelease(f),source=validateCaptureSource({record:f.record,fileBytes:release.comparableFileBytes,baseSourceBytes:captureBytes});
 assert.throws(()=>validateCaptureHistoricalPromotion({record:f.record,control:release.comparableControl,state:release.comparableState,fileBytes:source.comparableFileBytes,baseSourceBytes:postBytes}),/FRONTPROMO_CURRENT_PIN/);checks++;
 const cat=validateCaptureCatalog({record:f.record,fileBytes:source.comparableFileBytes,baseSourceBytes:catalogBytes});
 const old=validateCaptureHistoricalPromotion({record:f.record,control:release.comparableControl,state:release.comparableState,fileBytes:cat.comparableFileBytes,baseSourceBytes:postBytes});
 assert.equal(old.phase,'LIVE_BYTES_PASS_FOCAL_LIVE_PENDING');assert.equal(old.comparableControl[crCursorKey],undefined);assert.equal(old.comparableControl.b4003CausalFrontendSuccessor20261107,undefined);checks++;
}
// Exercise the actual outer owner guard, including freeze rehash, CP/state
// pointers, all previous grants, and restoration to its original authority.
{
 const f=crFixture('FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING'),r=f.record;
 const paths=new Set([crCp,statePath,freeze,plan,guard,self]);
 const groups=[['equipoCausalSourceCorrection','GI_SOURCE_SUCCESSOR_BASE_DIR'],['readerDeploymentSuccessor','GI_POST_E503_BASE_DIR'],['frontendPromotionSuccessor','GI_POST_E503_BASE_DIR'],['reconciliationReadOnlySuccessor','GI_POST_E503_BASE_DIR'],['catalogTransportSuccessor','GI_CATALOG_BASE_DIR'],['policyCaptureCausalSourceCorrection20261107','GI_POLICY_CAPTURE_BASE_DIR']];
 const sourceBytes={},postBytes={},catalogBytes={},captureBytes={};
 for(const [name,env]of groups){const p=r[name],dest=name==='equipoCausalSourceCorrection'?sourceBytes:name==='catalogTransportSuccessor'?catalogBytes:name==='policyCaptureCausalSourceCorrection20261107'?captureBytes:postBytes;
  for(const e of p.changes){paths.add(e.path);if(!Object.hasOwn(f.fileBytes,e.path))f.fileBytes[e.path]=fs.readFileSync(e.path);dest[e.path]=e.previousBlobSha===null?null:crHistory(p.sourceBaseHead,e.path,env);}
 }
 for(const e of r.reviewedDeferredCandidateArchives20261107.artifacts){paths.add(e.path);f.fileBytes[e.path]=fs.readFileSync(e.path);}
 for(const e of r.policyCaptureCausalSourceCorrection20261107.preservedFiles)f.fileBytes[e.path]=fs.readFileSync(e.path);
 for(const name of ['readerDeploymentSuccessor','catalogTransportSuccessor'])if(fs.existsSync(r[name].activationPath)){paths.add(r[name].activationPath);f.fileBytes[r[name].activationPath]=fs.readFileSync(r[name].activationPath);}
 for(const e of r[crKey].changes)paths.add(e.path);
 for(const p of [plan,guard,self,v6])f.fileBytes[p]=fs.readFileSync(p);
 r.governanceSuccessorValidation.guardBlobSha=hash(f.fileBytes[guard]);r.governanceSuccessorValidation.testBlobSha=hash(f.fileBytes[self]);
 f.fileBytes[freeze]=crBytes(r);
 f.control[key].blobSha=hash(f.fileBytes[freeze]);f.control.paymentInferenceReconciliationControl.ownerPolicyModalities20261107.receiptBlobSha=f.control[key].blobSha;f.state[key]=clone(f.control[key]);
 const originalControl=JSON.parse(crHistory(base,crCp,'GI_OWNER_SUCCESSOR_BASE_DIR')),originalState=JSON.parse(crHistory(base,statePath,'GI_OWNER_SUCCESSOR_BASE_DIR'));
 const input={control:f.control,state:f.state,baseControl:originalControl,baseState:originalState,changedPaths:[...paths],fileBytes:f.fileBytes,baseSourceBytes:sourceBytes,postBaseSourceBytes:postBytes,catalogBaseSourceBytes:catalogBytes,policyCaptureBaseSourceBytes:captureBytes,captureReleaseBaseSourceBytes:f.baseSourceBytes,captureReleaseBaseControl:f.baseControl,captureReleaseBaseState:f.baseState};
 const result=validate(input);assert.deepEqual(result.comparableControl,originalControl);checks++;
 const bad=structuredClone(input);bad.control.productionPromotionAuthorized=true;assert.throws(()=>validate(bad),/OWNER_UNENUMERATED_CONTROL_CHANGE/);checks++;
 const undeclared=structuredClone(input);undeclared.changedPaths.push('functions/cobros-reconciliation-domain.js');assert.throws(()=>validate(undeclared),/OWNER_UNDECLARED_PATH/);checks++;
}
console.log('CAPTURE_RELEASE_BOUNDED_SUCCESSOR_PASS '+(checks-crCountStart)+' synthetic checks; preparatory cursor absent, actual evidence mandatory, source/catalog/e503 projection chained, full owner snapshot verified, no remote actions');
