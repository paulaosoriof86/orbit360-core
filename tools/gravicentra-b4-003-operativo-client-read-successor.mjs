// Role-wide Operativo client READ and immutable country-index dry-run source
// handoff into the ONE canonical candidate. No Preview/LIVE/data mutations.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const BASE='a318f8a75ae40e00f9a9d03612916fc4af80fa6d';
const BASE_TREE='f8395478b4f6bb7814414a222abbae5ef0ad946d';
const SOURCE='965c745105333aef2f731e064599c40360a8552e';
const SOURCE_TREE='4fedd7890f0f0972a7d1b1d348ecd531aeb38485';
const ROOT='artifacts/orbit360-recovery/release-control/';
const CONTROL=ROOT+'CONTROL_PLANE.json';
const RECEIPT=ROOT+'I6_5_B4_003_OPERATIVO_CLIENT_READ_AND_COUNTRY_INDEX_DRYRUN_SUCCESSOR_20261102.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const SELF='tools/gravicentra-b4-003-operativo-client-read-successor.mjs';
const KEY='b4003OperativoClientReadAndIndexDryrun20261102';
const SOURCE_BLOBS=Object.freeze({
 'functions/b4-003-scoped-access-boundary.js':'5cd90582db17d6989b13117e629ed4bc985ff1cf',
 'orbit360-platform/core/tenant-access-policy-effective-p0.js':'0f7f37e67eff15a4286b0202599830899b02a754',
 'orbit360-platform/tools/orbit360-validar-product-readonly-route-rule-matrix-p0.mjs':'3a14006a7506041641683f645edce35a060ebe61',
 'orbit360-platform/tools/orbit360-validar-product-readonly-smoke-catalog-p0.mjs':'15da211e594efccc0b42eb8c86287d1b1305b606',
 'tools/gravicentra-b4-003-client-country-authority.test.cjs':'ad02cd2720f8b4759da327f62574c0fac88fe4a1',
 'tools/gravicentra-b4-003-client-country-index-dryrun-readonly.cjs':'831ade68dd71bf328842bdcdb76fdf97d74450e8',
 'tools/gravicentra-b4-003-client-country-index-dryrun-readonly.test.cjs':'9190db44491fa786de2627363da4b33f8849b2e9',
 'tools/gravicentra-b4-003-client-list-transversal-readonly.test.cjs':'9df1d713d8637d2fdfd906a31688cad6aa51749b',
 'tools/gravicentra-b4-003-firestore-emulator.test.cjs':'e68894557c6fd4bc74c736bbe32c41fc9c08fb6e',
 'tools/gravicentra-b4-003-operativo-client-read-front-back-parity.test.cjs':'f7e0b0aa7ab93f446b6b448213901358ef06feda'
});
const sourcePaths=Object.keys(SOURCE_BLOBS).sort();
const govPaths=[CONTROL,RECEIPT,GUARD,SELF].sort();
const PREFIX="import {runB4003OperativoClientReadSuccessorGuard} from './gravicentra-b4-003-operativo-client-read-successor.mjs';\n"+
 'if (runB4003OperativoClientReadSuccessorGuard()) process.exit(0);\n\n';
const fail=why=>{throw Error('B4_003_OPERATIVO_CLIENT_READ_GUARD_'+why);};
const need=(ok,why)=>{if(!ok)fail(why);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const show=(ref,file)=>execFileSync('git',['show',ref+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024});
const blob=(ref,file)=>git('rev-parse',ref+':'+file);
const hash=file=>git('hash-object',file);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const changed=(a,b)=>git('diff','--name-only',a,b).split(/\r?\n/).filter(Boolean).sort();
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
function verifyControl(){
 const before=JSON.parse(show(BASE,CONTROL)),after=json(CONTROL),pointer=after[KEY];
 need(Object.keys(before).length===438&&Object.keys(after).length===439,
  'CONTROL_APPEND_CARDINALITY');
 need(Object.keys(before).every(k=>same(before[k],after[k])),
  'HISTORICAL_CONTROL_MUTATION');
 need(same(Object.keys(after).filter(k=>!(k in before)),[KEY]),
  'UNAUTHORIZED_NEW_CONTROL_KEY');
 const expected={
  schema:'GRAVICENTRA_I65_B4003_OPERATIVO_CLIENT_READ_AND_INDEX_DRYRUN_POINTER_V1',
  gate:'I6.5/B4-003',recordedDate:'2026-11-02',
  recordType:'ADDITIVE_TRANSVERSAL_ROLE_READ_FIX_AND_READONLY_COUNTRY_INDEX_DRYRUN_NO_RELEASE_AUTHORITY',
  status:'SOURCE_MULTIPLE_UID_ROLE_COUNTRY_REGRESSIONS_PASS_REAL_INDEX_DRYRUN_AND_AUTHENTICATED_PREVIEW_PENDING_RELEASE_HOLD',
  canonicalParentHead:BASE,sourceCommit:SOURCE,sourceTree:SOURCE_TREE,
  receiptPath:RECEIPT,operativeClientReadScope:'all_in_authorized_countries_only',
  advisorClientReadScope:'own_unchanged',
  moduleAndExplicitNoneDenialsPreserved:true,noOtherModulesOrWritesWidened:true,
  sourceFilesChanged:10,transversalClientListSyntheticChecks:39,
  frontBackReadParitySyntheticChecks:35,countryAuthoritySyntheticChecks:38,
  countryIndexDryrunSyntheticCases:18,countryIndexDryrunRealCompleted:false,
  countryIndexWritesAuthorized:false,insurerInferredClientsFromFrozenPhysicalAudit:64,
  countryUnresolvedClientsFromFrozenPhysicalAudit:3,physicalPolicyReferencesMissingClients:3,
  authenticatedMultiUidPreviewUatPassed:false,independentBackendNegativeUidUatPassed:false,
  firestoreRulesP0Closed:false,restoreDrillAccepted:false,sevenAdvisorsClassified:false,
  dataWrites:0,sharedRulesAuthIamMutation:false,liveHostingDeployed:false,
  liveFunctionsDeployed:false,productionAuthorized:false,b4003Closed:false,
  formalI6Percent:50,priorityP0Closed:1,priorityP0Total:6,
  currentGlobalImplementationPercent:null
 };
 need(pointer&&Object.entries(expected).every(([k,v])=>same(pointer[k],v)),
  'CONTROL_POINTER_MISMATCH');
 const receipt=json(RECEIPT);
 need(receipt.schema==='GRAVICENTRA_I65_B4003_OPERATIVO_CLIENT_READ_AND_INDEX_DRYRUN_SUCCESSOR_V1'&&
  receipt.repository==='paulaosoriof86/orbit360-core'&&
  receipt.canonicalBranch==='recovery/fase-a-clean-20260831'&&
  receipt.status===pointer.status&&receipt.canonicalParentHead===BASE&&
  receipt.sourceCommit===SOURCE&&receipt.sourceTree===SOURCE_TREE&&
  receipt.sourceFilesChanged===10&&
  receipt.rolePolicyDecision?.role==='Operativo'&&
  receipt.rolePolicyDecision?.collection==='clientes'&&
  receipt.rolePolicyDecision?.scope==='all'&&
  receipt.sourceQa?.clientCountryAuthoritySyntheticChecks===38&&
  receipt.sourceQa?.clientListTransversalSyntheticChecks===39&&
  receipt.sourceQa?.frontBackReadParitySyntheticChecks===35&&
  receipt.sourceQa?.countryIndexDryrunSyntheticCases===18&&
  receipt.sourceQa?.repositoryCoreTestsPassed===14&&
  receipt.sourceQa?.firestoreEmulatorActuallyExecuted===false&&
  receipt.sourceQa?.realMultiUidUatActuallyExecuted===false&&
  receipt.priorRealEvidenceImmutable?.insurerInferredClients===64&&
  receipt.priorRealEvidenceImmutable?.reflectsPreviousSourceOnly===true&&
  receipt.countryIndexDryrun?.realRunCompleted===false&&
  receipt.countryIndexDryrun?.applyAuthorized===false&&
  receipt.countryIndexDryrun?.executablePatchesExported===false&&
  receipt.releaseHold?.productionAuthorized===false&&
  receipt.releaseHold?.B4003Closed===false&&
  receipt.releaseHold?.formalI6Percent===50&&
  receipt.releaseHold?.priorityP0Closed===1&&
  receipt.releaseHold?.priorityP0Total===6&&
  receipt.releaseHold?.dataWrites===0&&
  receipt.releaseHold?.liveHostingDeployed===false&&
  receipt.releaseHold?.liveFunctionsDeployed===false,
  'SUCCESSOR_RECEIPT_OR_RELEASE_HOLD_DRIFT');
}
function verifySyntheticQa(){
 const suites=[
  ['tools/gravicentra-b4-003-client-country-authority.test.cjs','checks=38'],
  ['tools/gravicentra-b4-003-client-list-transversal-readonly.test.cjs','checks=39'],
  ['tools/gravicentra-b4-003-operativo-client-read-front-back-parity.test.cjs','checks=35'],
  ['tools/gravicentra-b4-003-client-country-index-dryrun-readonly.test.cjs','cases=18'],
  ['orbit360-platform/tools/orbit360-validar-product-readonly-route-rule-matrix-p0.mjs','"ok": true'],
  ['orbit360-platform/tools/orbit360-validar-product-readonly-smoke-catalog-p0.mjs','"ok": true']
 ];
 for(const [file,marker] of suites){
  const out=execFileSync('node',[file],{encoding:'utf8',maxBuffer:8*1024*1024});
  need(out.includes(marker),'SYNTHETIC_QA_FAILURE:'+file);
 }
}
export function runB4003OperativoClientReadSuccessorGuard(){
 if(!json(CONTROL)[KEY])return false;
 const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
 need(['governance','governance:1','i6'].includes(mode),'MODE_DENIED');
 const head=git('rev-parse','HEAD');
 need(git('rev-parse',BASE+'^{tree}')===BASE_TREE,'PREDECESSOR_TREE_DRIFT');
 need(git('rev-parse',SOURCE+'^{tree}')===SOURCE_TREE,'SOURCE_TREE_DRIFT');
 need(git('rev-parse',SOURCE+'^')===BASE,'SOURCE_PARENT_DRIFT');
 need(git('merge-base',SOURCE,head)===SOURCE,'SOURCE_NOT_ANCESTOR');
 need(same(changed(BASE,SOURCE),sourcePaths),'SOURCE_CHANGE_SET_DRIFT');
 need(same(changed(SOURCE,head),govPaths),'GOVERNANCE_CHANGE_SET_DRIFT');
 need(same(changed(BASE,head),[...sourcePaths,...govPaths].sort()),'TOTAL_CHANGE_SET_DRIFT');
 need(fs.readFileSync(GUARD,'utf8')===PREFIX+show(SOURCE,GUARD),
  'HISTORICAL_GUARD_NOT_APPEND_ONLY');
 for(const [file,sha] of Object.entries(SOURCE_BLOBS))
  need(blob(SOURCE,file)===sha&&blob(head,file)===sha&&hash(file)===sha,
   'SOURCE_BLOB_CHANGED:'+file);
 for(const file of govPaths)
  need(blob(head,file)===hash(file),'UNCOMMITTED_GOVERNANCE_DRIFT:'+file);
 need(!git('ls-files','--others','--exclude-standard'),'UNTRACKED_SOURCE');
 verifyControl();verifySyntheticQa();
 console.log('B4_003_OPERATIVO_TRANSVERSAL_CLIENT_READ=PASS roles_and_countries_frozen source_regressions_verified');
 console.log('B4_003_COUNTRY_INDEX_DRYRUN=PREPARED_REAL_READONLY_PENDING_APPLY_NOT_AUTHORIZED');
 console.log('B4_003_SECURITY_AND_RELEASE=HOLD');
 console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
 console.log('PRODUCT_SOURCE_DRIFT=false');
 return true;
}
