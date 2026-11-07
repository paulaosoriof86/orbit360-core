#!/usr/bin/env node
/** Read only the three explicitly authorized B4-003 synthetic archive states.
 * No Firestore list/query, unmasked document, data write, deploy, or browser use.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const PIN=Object.freeze({
  repository:'paulaosoriof86/orbit360-core',branch:'recovery/fase-a-clean-20260831',
  project:'ays-orbit-360-lab',database:'(default)',
  collection:'tenants/alianzas-soluciones/data/negocios/items',
  ids:Object.freeze(['b4003qa_user_mw5htkgl_31u61t','b4003qa_user_mw5eas6v_lphfrl','b4003qa_user_mw5lmd7r_nu0l4r']),
  fields:Object.freeze(['archivado','previewWrite']),
  source:'857f1222f360a42a06e012810a1c01bce155a26f',
  build:'gi-i65-b4-857f1222f360-57f234755dc1',artifactId:13549460562,
  trigger:'test(b4-003): read three synthetic archive states'
});
const need=(v,c)=>{if(!v){const error=new Error(c);error.safeReadbackCode=c;throw error;}};
const eq=(a,b,c)=>need(a===b,c);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const errorCode=e=>typeof e?.safeReadbackCode==='string'?e.safeReadbackCode:'UNEXPECTED_TRANSPORT_OR_AUTH_ERROR';
export function documentName(id){
  need(PIN.ids.includes(id),'DOCUMENT_ID_NOT_AUTHORIZED');
  return 'projects/'+PIN.project+'/databases/'+PIN.database+'/documents/'+PIN.collection+'/'+id;
}
export function requestFor(id){
  const name=documentName(id),url=new URL('https://firestore.googleapis.com/v1/'+name);
  for(const field of PIN.fields)url.searchParams.append('mask.fieldPaths',field);
  return {id,name,method:'GET',url:url.toString(),fieldMask:[...PIN.fields]};
}
export function sanitizeDocument(id,data){
  eq(data?.name,documentName(id),'RETURNED_DOCUMENT_NAME_MISMATCH');
  const fields=data.fields||{};
  need(fields && typeof fields==='object' && !Array.isArray(fields),'INVALID_FIELDS');
  need(Object.keys(fields).every(k=>PIN.fields.includes(k)),'RESPONSE_EXCEEDS_FIELD_MASK');
  const allowed={};
  for(const key of PIN.fields){
    if(!Object.hasOwn(fields,key))continue;
    const value=fields[key];
    need(value && typeof value==='object' && Object.keys(value).length===1 &&
      typeof value.booleanValue==='boolean','MASKED_FIELD_NOT_BOOLEAN_'+key);
    allowed[key]={booleanValue:value.booleanValue};
  }
  const result={name:data.name,fields:allowed};
  for(const key of ['createTime','updateTime'])if(data[key]!==undefined){
    need(typeof data[key]==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(data[key]) &&
      Number.isFinite(Date.parse(data[key])),'INVALID_DOCUMENT_TIMESTAMP');
    result[key]=data[key];
  }
  return result;
}
export function validateControl(control,env){
  const cursor=control[env.B4_CURSOR_KEY||'b4003ActiveCertificationCursor20261106'];
  eq(cursor?.activeSourceSha,PIN.source,'CP_CURRENT_SOURCE_MISMATCH');
  eq(cursor?.activeBuildId,PIN.build,'CP_CURRENT_BUILD_MISMATCH');
  eq(Number(cursor?.activeImmutableArtifactId),PIN.artifactId,'CP_CURRENT_ARTIFACT_MISMATCH');
  eq(cursor?.b4003Closed,false,'CP_ALREADY_CLOSED');
  eq(cursor?.productionPromotionAuthorized,false,'CP_PROMOTION_SCOPE_CHANGED');
  const ids=cursor.currentThreeFixtureCleanup20261106?.currentFixtureIds;
  need(Array.isArray(ids) && ids.length===3,'CP_THREE_CURRENT_FIXTURES_REQUIRED');
  eq(JSON.stringify([...ids].sort()),JSON.stringify([...PIN.ids].sort()),'CP_FIXTURE_SET_MISMATCH');
  return {sourceSha:PIN.source,buildId:PIN.build,artifactId:PIN.artifactId,
    cursorKey:env.B4_CURSOR_KEY||'b4003ActiveCertificationCursor20261106',authorizedFixtureIds:[...PIN.ids]};
}
export function summarize(rows){
  const readPass=rows.length===3 && rows.every((r,i)=>r.id===PIN.ids[i] && r.httpStatus===200 && r.readStatus==='PASS');
  const archiveState=id=>{
    const r=rows.find(x=>x.id===id);
    return r?.readStatus==='PASS' && r.document?.fields?.archivado?.booleanValue===true;
  };
  const pair=readPass && PIN.ids.slice(0,2).every(archiveState);
  return {maskedReadPass:readPass,previouslyArchivedPairVerified:pair,
    allThreeArchived:readPass && PIN.ids.every(archiveState),
    archivedCount:rows.filter(r=>r.readStatus==='PASS' && r.document?.fields?.archivado?.booleanValue===true).length,
    thirdFixtureArchived:readPass?archiveState(PIN.ids[2]):null,
    status:!readPass?'THREE_SYNTHETIC_MASKED_READ_FAILED':!pair?
      'THREE_SYNTHETIC_MASKED_READ_PASS_OLDER_ARCHIVE_READBACK_HOLD':
      'THREE_SYNTHETIC_MASKED_READ_PASS_OLDER_ARCHIVE_PAIR_CONFIRMED'};
}

export async function main(){
  const env=process.env;
  const out=path.resolve(env.B4_ARCHIVE_READBACK_OUT||'.b4-preflight-temp/archive-readback');
  fs.mkdirSync(out,{recursive:true});
  const receipt={schema:'B4_003_THREE_SYNTHETIC_ARCHIVE_MASKED_READ_V1',status:'READ_NOT_STARTED',
    startedAtUtc:new Date().toISOString(),runId:env.GITHUB_RUN_ID,runnerCommit:env.GITHUB_SHA,
    scope:{projectId:PIN.project,databaseId:PIN.database,collection:PIN.collection,
      exactIds:[...PIN.ids],fieldMask:[...PIN.fields],firestoreMethod:'GET',
      firestoreListOrQuery:false,unmaskedRead:false,remoteWrites:0,dataWrites:0,
      hostingMutation:false,functionsDeployment:false,rulesOrAuthChanged:false},
    userAuthorization:'Paula expressly authorized read-only access to these three current synthetic B4-003 fixtures.',
    observations:[],requestCount:0,maskedReadPass:false,previouslyArchivedPairVerified:false,
    allThreeArchived:false,productionPromotionAuthorizedByThisReceipt:false,b4003Closed:false};
  const save=()=>fs.writeFileSync(path.join(out,'synthetic-archive-readback.json'),JSON.stringify(receipt,null,2)+'\n');
  save();
  try{
    eq(process.argv.length,2,'NO_ARGUMENTS_AUTHORIZED');
    eq(env.GITHUB_REPOSITORY,PIN.repository,'WRONG_REPOSITORY');
    eq(env.GITHUB_REF,'refs/heads/'+PIN.branch,'WRONG_BRANCH');
    eq(env.PROJECT_ID,PIN.project,'WRONG_PROJECT');
    eq(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),env.GITHUB_SHA,'CHECKOUT_MISMATCH');
    eq(execFileSync('git',['log','-1','--format=%B'],{encoding:'utf8'}).trim(),PIN.trigger,'WRONG_EXACT_TRIGGER');
    const source=fs.readFileSync(env.CONTROL);
    receipt.control=validateControl(JSON.parse(source.toString('utf8')),env);
    receipt.control.sha256=sha(source);
    async function freshHead(){
      need(env.GH_TOKEN,'GH_TOKEN_REQUIRED');
      const response=await fetch('https://api.github.com/repos/'+PIN.repository+'/git/ref/heads/'+PIN.branch,{
        method:'GET',headers:{Authorization:'Bearer '+env.GH_TOKEN,Accept:'application/vnd.github+json',
          'X-GitHub-Api-Version':'2022-11-28'},redirect:'error',signal:AbortSignal.timeout(15000)});
      eq(response.status,200,'HEAD_GET_FAILED');
      eq((await response.json()).object?.sha,env.GITHUB_SHA,'BRANCH_HEAD_MOVED');
    }
    await freshHead();
    const account=JSON.parse(fs.readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
    eq(account.type,'service_account','CREDENTIAL_TYPE_MISMATCH');
    eq(account.project_id,PIN.project,'CREDENTIAL_PROJECT_MISMATCH');
    const requireCli=createRequire(env.FIREBASE_CLI_PACKAGE);
    const {GoogleAuth}=requireCli('google-auth-library');
    const client=await new GoogleAuth({keyFile:env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes:['https://www.googleapis.com/auth/datastore']}).getClient();
    for(const id of PIN.ids){
      const req=requestFor(id);
      const observation={id,requestedName:req.name,fieldMask:req.fieldMask,
        httpStatus:null,readStatus:'FAIL',observedAtUtc:null};
      receipt.requestCount++;
      try{
        const response=await client.request({url:req.url,method:'GET',timeout:15000,
          retry:false,maxRedirects:0,headers:{Accept:'application/json'}});
        observation.httpStatus=response.status;
        eq(response.status,200,'UNEXPECTED_DOCUMENT_HTTP_STATUS');
        observation.document=sanitizeDocument(id,response.data);
        observation.readStatus='PASS';
      }catch(error){
        const status=error?.response?.status;
        if(Number.isInteger(status)){observation.httpStatus=status;observation.code='FIRESTORE_GET_'+status;}
        else observation.code=errorCode(error);
      }
      observation.observedAtUtc=new Date().toISOString();
      receipt.observations.push(observation);save();
    }
    await freshHead();
    receipt.canonicalHeadUnchanged=true;
    Object.assign(receipt,summarize(receipt.observations));
    if(!receipt.maskedReadPass || !receipt.previouslyArchivedPairVerified)process.exitCode=1;
  }catch(error){
    receipt.status='SCOPED_ARCHIVE_READBACK_BLOCKED';receipt.code=errorCode(error);process.exitCode=1;
  }finally{
    receipt.finishedAtUtc=new Date().toISOString();save();
    // No response bodies, credentials, comments, identities or unrelated fields in logs.
    console.log(JSON.stringify({status:receipt.status,code:receipt.code,requestCount:receipt.requestCount,
      maskedReadPass:receipt.maskedReadPass,previouslyArchivedPairVerified:receipt.previouslyArchivedPairVerified,
      allThreeArchived:receipt.allThreeArchived,rows:receipt.observations.map(r=>({id:r.id,
        httpStatus:r.httpStatus,readStatus:r.readStatus,archivado:r.document?.fields?.archivado?.booleanValue??null,
        previewWrite:r.document?.fields?.previewWrite?.booleanValue??null,code:r.code}))}));
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(e=>{console.error(errorCode(e));process.exitCode=1;});
}
