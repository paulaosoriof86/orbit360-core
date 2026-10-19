'use strict';
// Gravicentra B4-003: read-only Cloud Logging and canonical membership schema probe.
// Existing service account only. No real-member token minting, no personal data output.
const fs=require('node:fs');
const {applicationDefault,initializeApp,getApps}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const project='ays-orbit-360-lab',tenant='alianzas-soluciones';
const file=process.env.GOOGLE_APPLICATION_CREDENTIALS;
if(!file||!fs.existsSync(file))throw Error('B4_003_READONLY_SERVICE_ACCOUNT_NOT_CONFIGURED');
const meta=JSON.parse(fs.readFileSync(file,'utf8'));
if(meta.project_id!==project||meta.type!=='service_account')throw Error('B4_003_SERVICE_PROJECT_DENIED');
const output=process.env.B4_003_AUTH_OBSERVABILITY_OUT;
if(!output)throw Error('B4_003_OUTPUT_PATH_REQUIRED');
const scopes=new Set(['none','ninguno','sin_acceso','sinacceso','own','propio','propios','mios','team','equipo','all','todos','global']);
const clean=x=>String(x==null?'':x).trim();
const normal=x=>clean(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_');
const counters={};
function increment(key){counters[key]=(counters[key]||0)+1;}
const report={
 schema:'GRAVICENTRA_B4_003_POST_AUTH_OBSERVABILITY_READONLY_V1',
 gate:'I6.5/B4-003',
 mode:'READ_ONLY_NO_CUSTOM_USER_TOKEN_NO_DATA_WRITES',
 previewRunId:39324152069,
 priorPreviewFunctionalUat:'HOLD',
 referenceWindowUtc:'2026-10-19T18:00:00Z_to_execution',
 membership:{status:'NOT_RUN',total:0,canonicalContract:{},counts:{}},
 cloudLogging:{status:'NOT_RUN',function:'orbit360ScopedPolicyReadPreview',windowStart:'2026-10-19T18:00:00Z',entriesAnalyzed:0,httpStatuses:{},knownFailureCodes:{},sampleCodes:[]},
 security:{realUserImpersonation:false,customTokens:0,operationalWrites:0,rulesDeploy:false,livePromotion:false,credentialPayloadPrinted:false,rawLogsExported:false,realSignedInUatAccepted:false}
};
const known=[
 'MEMBERSHIP_DENIED','MEMBERSHIP_NOT_FOUND','PROTECTED_BOOTSTRAP_MEMBERSHIP_INVALID',
 'PROTECTED_BOOTSTRAP_RESPONSE_INVALID','PROTECTED_BOOTSTRAP_CONFIG_INVALID',
 'SIGNED_ACTIVE_ROLE_MISMATCH','ROLE_DENIED','COUNTRY_DENIED','SCOPE_DEFAULT_MISSING',
 'SCOPE_INVALID','MODULE_DENIED','TEAM_DIRECTORY_DENIED','RESOURCE_EXHAUSTED',
 'DEADLINE_EXCEEDED','PERMISSION_DENIED','PAGE_SIZE_INVALID','INTERNAL',
 'SCOPED_DOCUMENT_READ_UNAVAILABLE','UNAUTHENTICATED','TIMEOUT'
];
async function membershipRead(){
 try{
  const app=getApps().length?getApps()[0]:initializeApp({credential:applicationDefault(),projectId:project});
  const snapshot=await getFirestore(app).collection('tenants').doc(tenant).collection('members').get();
  const counts={};
  const flag=k=>{counts[k]=(counts[k]||0)+1;};
  for(const doc of snapshot.docs){
   const m=doc.data()||{},roles=Array.isArray(m.roles)?m.roles:[],
       selected=clean(m.activeRole||m.rolActivo),
       countries=Array.isArray(m.countries)?m.countries:[],
       states=[m.status,m.estado].filter(x=>clean(x)).map(x=>clean(x).toLowerCase());
   if(!m.uid||m.uid!==doc.id)flag('uidMissingOrMismatch');
   if(!m.tenantId||m.tenantId!==tenant)flag('tenantMissingOrMismatch');
   if(!states.length||states.some(x=>!['active','activo'].includes(x)))flag('inactiveOrConflictingStatus');
   if(!roles.length)flag('rolesMissing');
   if(!selected||!roles.includes(selected))flag('activeRoleNotExactAssignedRole');
   if(!countries.length||countries.some(x=>!['GT','CO'].includes(clean(x).toUpperCase())))flag('countriesInvalid');
   const sc=m.dataScopes&&typeof m.dataScopes==='object'&&!Array.isArray(m.dataScopes)?m.dataScopes:{};
   const def=sc.default??sc['*']??m.scopeDatos??m.dataScope;
   if(!scopes.has(normal(def)))flag('defaultScopeInvalid');
   const modules=sc.modules&&typeof sc.modules==='object'&&!Array.isArray(sc.modules)?sc.modules:{};
   if(Object.values(modules).some(s=>!scopes.has(normal(s))))flag('moduleScopeInvalid');
   if(roles.length>1)flag('multiRoleMembers');
   if(roles.some(x=>['direccion','superadmin','admintenant','admin'].includes(normal(x))))flag('administrativeMembers');
  }
  report.membership={status:'SCHEMA_READBACK_COMPLETE_NOT_AUTHENTICATED_UAT',total:snapshot.size,
    counts,canonicalContract:{uidMatchesDocument:true,tenantExact:true,statusActiveOnly:true,roleAssignedExactly:true,memberCountryExplicit:true,scopeCanonicalizationRequired:true},
    note:'Aggregate metadata only; membership alone does not authenticate Firebase credentials, confirm active claims or prove real-user callable access'};
 }catch(error){report.membership.status='READ_FAILED';report.membership.errorType=clean(error&&error.code||'READ_UNAVAILABLE').replace(/[^a-z0-9_/.-]/gi,'').slice(0,70);}
}
async function loggingRead(){
 try{
  const credential=applicationDefault();
  const auth=await credential.getAccessToken();
  if(!auth||!auth.access_token)throw Error('LOGGING_TOKEN_UNAVAILABLE');
  let pageToken='',pages=0,total=0;
  const statuses={},failures={},sampleCodes=[];
  do{
   const filter='resource.type="cloud_run_revision" AND resource.labels.service_name:"orbit360scopedpolicyreadpreview" AND timestamp>="2026-10-19T18:00:00Z"';
   const body={resourceNames:['projects/'+project],filter,orderBy:'timestamp desc',pageSize:200};
   if(pageToken)body.pageToken=pageToken;
   const resp=await fetch('https://logging.googleapis.com/v2/entries:list',{
    method:'POST',headers:{Authorization:'Bearer '+auth.access_token,'Content-Type':'application/json'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(18000)
   });
   if(!resp.ok){
     report.cloudLogging.status=resp.status===403?'LOGGING_IAM_PERMISSION_DENIED':'LOGGING_HTTP_'+resp.status;
     return;
   }
   const data=await resp.json();pageToken=clean(data.nextPageToken);
   for(const entry of data.entries||[]){
     total++;
     const s=entry.httpRequest&&Number(entry.httpRequest.status)||0;
     if(s)statuses[String(s)]=(statuses[String(s)]||0)+1;
     // Raw server logs are examined only in memory; export only explicit code allowlist.
     const body=JSON.stringify(entry.jsonPayload||{})+' '+clean(entry.textPayload);
     const matched=known.filter(k=>body.toUpperCase().includes(k));
     for(const code of matched)failures[code]=(failures[code]||0)+1;
     if((s>=400||matched.length)&&sampleCodes.length<24)
       sampleCodes.push({timestamp:clean(entry.timestamp).slice(0,25),httpStatus:s||null,codes:matched,
         durationMs:entry.httpRequest&&entry.httpRequest.latency?Math.round(parseFloat(entry.httpRequest.latency)*1000):null});
   }
   pages++;
  }while(pageToken&&pages<4);
  report.cloudLogging.status=total?'LOGGING_READ_SUCCEEDED_NO_AUTHENTICATED_UAT':'LOGGING_AUTHORIZED_NO_MATCHING_ENTRIES';
  report.cloudLogging.entriesAnalyzed=total;
  report.cloudLogging.pages=pages;
  report.cloudLogging.httpStatuses=statuses;
  report.cloudLogging.knownFailureCodes=failures;
  report.cloudLogging.sampleCodes=sampleCodes;
 }catch(error){
  report.cloudLogging.status=error&&error.name==='TimeoutError'?'LOGGING_READ_TIMEOUT':'LOGGING_READ_UNAVAILABLE';
 }
}
(async()=>{
 await Promise.all([membershipRead(),loggingRead()]);
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log('B4_003_POST_AUTH_READONLY_MEMBERSHIP='+report.membership.status);
 console.log('B4_003_POST_AUTH_READONLY_LOGGING='+report.cloudLogging.status);
 console.log('B4_003_POST_AUTH_READONLY_AUTHENTICATED_UAT=HOLD');
 console.log('B4_003_POST_AUTH_READONLY_ZERO_WRITES=true');
})().catch(()=>{console.log('B4_003_POST_AUTH_READONLY_FATAL_ERROR_NO_UAT_PASS');process.exitCode=1;});
