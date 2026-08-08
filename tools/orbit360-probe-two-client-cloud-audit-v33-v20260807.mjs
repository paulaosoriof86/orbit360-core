#!/usr/bin/env node
'use strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const TARGETS=['43a8841d19f7fec03ad6','a96956c63fdf22d44cfe'];
const V1=['BatchWrite','Commit','CreateDocument','DeleteDocument','UpdateDocument','Write'];
export const WRITE_METHODS=new Set([...V1.map(x=>`google.firestore.v1.Firestore.${x}`),...V1.map(x=>`google.firestore.v1beta1.Firestore.${x}`)]);
export const START='2026-07-24T00:00:00Z';
export const END='2026-08-08T05:00:00Z';
const PROJECT=process.env.ORBIT360_PROJECT_ID||'ays-orbit-360-lab';
const TENANT=process.env.ORBIT360_TENANT_ID||'alianzas-soluciones';
const OUT=process.env.ORBIT360_V33_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/v33-two-client-cloud-audit-sanitized-v20260807.json';
export const fingerprint=id=>crypto.createHash('sha256').update(`clientes:${id}`,'utf8').digest('hex').slice(0,20);
const esc=v=>String(v).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/`/g,'\\`');
export function buildCombinedFilter(resourceNames){
  if(!Array.isArray(resourceNames)||resourceNames.length!==2)throw new Error('AUDIT_RESOURCE_SET_INVALID');
  const methods=[...WRITE_METHODS].map(m=>`protoPayload.methodName="${esc(m)}"`).join(' OR ');
  const targetSearch=resourceNames.map(n=>'SEARCH("`'+esc(n)+'`")').join(' OR ');
  return `log_id("cloudaudit.googleapis.com/data_access") AND protoPayload.serviceName="firestore.googleapis.com" AND timestamp>="${START}" AND timestamp<="${END}" AND (${methods}) AND (${targetSearch})`;
}
export function actorClass(entry,serviceAccountEmail=''){const p=entry?.protoPayload?.authenticationInfo?.principalEmail||'';if(!p)return 'NO_PRINCIPAL_OR_REDACTED';if(serviceAccountEmail&&p===serviceAccountEmail)return 'RUNTIME_SERVICE_ACCOUNT';return p.endsWith('.gserviceaccount.com')?'OTHER_SERVICE_ACCOUNT':'USER_PRINCIPAL';}
export function mechanismClass(entry){const ua=String(entry?.protoPayload?.requestMetadata?.callerSuppliedUserAgent||'').toLowerCase();if(ua.includes('firebase-admin')||ua.includes('google-cloud-firestore'))return 'SERVER_ADMIN_SDK';if(ua.includes('fire/')||ua.includes('firebase')||ua.includes('gl-js'))return 'FIREBASE_CLIENT_SDK';return ua?'OTHER_IDENTIFIED_CLIENT':'CLIENT_NOT_IDENTIFIED';}
const containsExact=(entry,needle)=>JSON.stringify(entry).includes(needle);
export function sanitizeForTargets(entries,targets,serviceAccountEmail=''){
  return targets.map(({fingerprint:fp,resourceName})=>{
    const writes=(entries||[]).filter(e=>e?.protoPayload?.serviceName==='firestore.googleapis.com'&&WRITE_METHODS.has(String(e?.protoPayload?.methodName||''))&&containsExact(e,resourceName));
    if(!writes.length)return {fingerprint:fp,status:'AUDIT_NO_MATCHING_WRITE_ENTRY',writeEvents:0,actorClasses:[],mechanismClasses:[],firstEventAt:null,lastEventAt:null};
    const times=writes.map(e=>String(e.timestamp||'')).filter(Boolean).sort();
    return {fingerprint:fp,status:'AUDIT_WRITE_FOUND',writeEvents:writes.length,actorClasses:[...new Set(writes.map(e=>actorClass(e,serviceAccountEmail)))].sort(),mechanismClasses:[...new Set(writes.map(mechanismClass))].sort(),firstEventAt:times[0]||null,lastEventAt:times.at(-1)||null};
  });
}
export function classifyHttp(status){if(status===401||status===403)return 'AUDIT_UNAVAILABLE_OR_FORBIDDEN';if(status===404)return 'AUDIT_API_OR_PROJECT_NOT_AVAILABLE';return 'AUDIT_QUERY_FAILED';}
async function accessToken(sa){const {GoogleAuth}=await import('google-auth-library');const auth=new GoogleAuth({credentials:sa,scopes:['https://www.googleapis.com/auth/logging.read']});const c=await auth.getClient();const t=await c.getAccessToken();return typeof t==='string'?t:t?.token;}
async function loggingRead(token,filter,pageToken=''){
  const body={resourceNames:[`projects/${PROJECT}`],filter,orderBy:'timestamp asc',pageSize:100};if(pageToken)body.pageToken=pageToken;
  const r=await fetch('https://logging.googleapis.com/v2/entries:list',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok){const err=new Error(classifyHttp(r.status));err.httpStatus=r.status;throw err;}
  const j=await r.json();return {entries:Array.isArray(j.entries)?j.entries:[],nextPageToken:String(j.nextPageToken||'')};
}
function clientRefs(db){return db.collection('tenants').doc(TENANT).collection('data').doc('clientes').collection('items');}
export async function run(db,sa){
  const refs=await clientRefs(db).listDocuments();const located=new Map();for(const ref of refs){const fp=fingerprint(ref.id);if(TARGETS.includes(fp))located.set(fp,ref);}if(located.size!==2)throw new Error(`TARGET_LOCATOR_COUNT_${located.size}`);
  const targets=TARGETS.map(fp=>({fingerprint:fp,resourceName:`projects/${PROJECT}/databases/(default)/documents/tenants/${TENANT}/data/clientes/items/${located.get(fp).id}`}));
  const token=await accessToken(sa);if(!token)throw new Error('AUDIT_TOKEN_UNAVAILABLE');const filter=buildCombinedFilter(targets.map(t=>t.resourceName));
  let loggingReadOperations=0;let entries=[];let first;try{first=await loggingRead(token,filter);loggingReadOperations++;}catch(e){first={error:String(e.message||'AUDIT_QUERY_FAILED'),entries:[],nextPageToken:''};}
  if(first.error){const items=TARGETS.map(fp=>({fingerprint:fp,status:first.error,writeEvents:null,actorClasses:[],mechanismClasses:[],firstEventAt:null,lastEventAt:null}));return persist({items,loggingReadOperations,locatorReferencesObserved:refs.length,decision:'STOP_RETRY',classification:'ENVIRONMENT_FAILURE',rootCause:first.error});}
  entries.push(...first.entries);let incomplete=false;if(first.nextPageToken){const second=await loggingRead(token,filter,first.nextPageToken);loggingReadOperations++;entries.push(...second.entries);if(second.nextPageToken)incomplete=true;}
  if(incomplete){const items=TARGETS.map(fp=>({fingerprint:fp,status:'AUDIT_QUERY_INCOMPLETE_PAGINATION',writeEvents:null,actorClasses:[],mechanismClasses:[],firstEventAt:null,lastEventAt:null}));return persist({items,loggingReadOperations,locatorReferencesObserved:refs.length,decision:'STOP_RETRY',classification:'ENVIRONMENT_FAILURE',rootCause:'AUDIT_QUERY_INCOMPLETE_AFTER_MAX_TWO_PAGES'});}
  const items=sanitizeForTargets(entries,targets,sa.client_email);const found=items.filter(x=>x.status==='AUDIT_WRITE_FOUND').length;
  return persist({items,loggingReadOperations,locatorReferencesObserved:refs.length,decision:found===2?'AUDIT_EVIDENCE_AVAILABLE':'DATA_CONTRACT_EVIDENCE_ABSENT',classification:'DATA_CONTRACT_FAILURE',rootCause:found===2?null:'AUDIT_LOGS_RETURNED_NO_TARGET_WRITE_ENTRY'});
}
function persist(partial){const found=partial.items.filter(x=>x.status==='AUDIT_WRITE_FOUND').length;const unavailable=partial.items.filter(x=>/^AUDIT_(UNAVAILABLE|API|QUERY)/.test(x.status)).length;const out={schemaVersion:'orbit360-block1-two-client-cloud-audit-v33-v2',gateId:'block1-client360-insurers-lab-v20260717',contractVersion:'1.0.41',targetCount:2,locatorReferencesObserved:partial.locatorReferencesObserved,firestoreLocatorReadOperations:1,loggingReadOperations:partial.loggingReadOperations,items:partial.items,writeEventTargets:found,auditUnavailableTargets:unavailable,fullyAdjudicated:false,decision:partial.decision,classification:partial.classification,rootCause:partial.rootCause||null,auditEvidenceRequiresKnownOperationCorrelation:true,rawLogsPersisted:false,resourceNamesPersisted:false,documentIdsPersisted:false,principalEmailsPersisted:false,callerIpsPersisted:false,firestoreWrites:0,authReads:0,authWrites:0,operationalWrites:0,reimport:false,hostingTouched:false,browserExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:partial.decision==='AUDIT_EVIDENCE_AVAILABLE'};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');return out;}
async function main(){const key=process.env.GOOGLE_APPLICATION_CREDENTIALS;if(!key)throw new Error('CREDENTIAL_PATH_MISSING');const sa=JSON.parse(fs.readFileSync(key,'utf8'));if(sa.project_id!==PROJECT)throw new Error('PROJECT_MISMATCH');const {default:admin}=await import('firebase-admin');if(!admin.apps.length)admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT});const out=await run(admin.firestore(),sa);console.log(JSON.stringify({decision:out.decision,writeEventTargets:out.writeEventTargets,auditUnavailableTargets:out.auditUnavailableTargets,loggingReadOperations:out.loggingReadOperations,writes:0,ok:out.ok}));if(!out.ok)process.exitCode=42;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){main().catch(e=>{console.error(JSON.stringify({status:'STOP_RETRY',classification:'PIPELINE_MECHANISM_FAILURE',rootCause:String(e.message||e).slice(0,180),writes:0,containsPII:false}));process.exit(42);});}
