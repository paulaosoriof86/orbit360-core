'use strict';
// I6.5/B4-003 · owner-authorized 2026-11-04 · ephemeral existing-UID signed reads.
// No membership, Auth user, rules, business data, Hosting, or function mutations.
const fs = require('node:fs');
const {initializeApp,cert,deleteApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore} = require('firebase-admin/firestore');

const PROJECT = 'ays-orbit-360-lab';
const TENANT = 'alianzas-soluciones';
const PREVIEW = 'https://ays-orbit-360-lab--gi-i65-b4-rc-41765742748-neoi3u7r.web.app';
const EXPECTED_SOURCE = 'b094619281c1f2ccef7e08335adedc76cf878bbc';
const EXPECTED_BUILD = 'gi-i65-b4-b094619281c1-57f234755dc1';
const URL = 'https://us-central1-ays-orbit-360-lab.cloudfunctions.net/orbit360AssignableAdvisorRoster';
const OUT = String(process.env.B4003_SIGNED_RECEIPT || '');
const people = [
  {label:'Paula',parts:['paula','osorio'],roles:['direccion','superadmin']},
  {label:'Carlos',parts:['carlos','castro'],roles:['operativo','asesor']},
  {label:'Samuel',parts:['samuel','daza'],roles:['admintenant','operativo','asesor']}
];
const receipt = {schema:'GI_I65_B4003_SIGNED_EXISTING_UID_SERVER_NEGATIVES_V1',
  gate:'I6.5/B4-003',ownerAuthorization:'EXPLICIT_2026-11-04_EXISTING_UID_EPHEMERAL_READ_ONLY',
  projectId:PROJECT,tenantId:TENANT,sourceSha:EXPECTED_SOURCE,buildId:EXPECTED_BUILD,
  immutableHostingArtifactId:13315537234,backend:'orbit360AssignableAdvisorRoster',
  status:'STARTED',identityCount:0,distinctIdentities:false,actors:[],anonymousDenial:null,
  realUserCustomTokensIssued:0,realUserIdTokensExchanged:0,tests:0,passes:0,failures:[],
  sensitiveTokensPersisted:false,uidOrEmailLogged:false,operationalWrites:0,
  authUserWrites:0,membershipWrites:0,rulesDeployed:false,hostingDeployed:false,
  functionDeployed:false,firestoreDirectRulesNegativeAcceptance:'NOT_TESTED_OWNER_TEMPORARY_EXCEPTION',
  notes:'Signed callable checks are not evidence of independent Firestore SDK Rules acceptance.'};
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const cleanRoles=m=>[...(Array.isArray(m.roles)?m.roles:[]),...(Array.isArray(m.rolesAsignados)?m.rolesAsignados:[]),
 ...(Array.isArray(m.assignedRoles)?m.assignedRoles:[]),...(Array.isArray(m.rolesDisponibles)?m.rolesDisponibles:[])]
 .map(x=>({raw:String(x),norm:norm(x)})).filter(x=>x.norm);
const active=m=>{
 if(!m||m.active===false||m.activo===false||m.inactivo===true||m.tenantId!==TENANT)return false;
 const states=[m.status,m.estado].filter(Boolean).map(norm);
 return states.length>0&&states.every(x=>x==='active'||x==='activo');
};
const requireTrue=(x,code)=>{if(!x)throw new Error(code);};
const allowedCountries=m=>{
 const raw=m.countries??m.paises??m.paisesAutorizados;
 return [...new Set((Array.isArray(raw)?raw:[]).map(x=>String(x).toUpperCase()))].filter(x=>x==='GT'||x==='CO');
};
async function hostedConfig(){
 const reply=await fetch(PREVIEW+'/product-runtime-config.js',{signal:AbortSignal.timeout(15000)});
 requireTrue(reply.ok,'PREVIEW_CONFIG_NOT_REACHABLE');
 const source=await reply.text();
 const match=source.match(/__ORBIT360_PRODUCT_PUBLIC_CONFIG__\s*=\s*Object\.freeze\((\{[\s\S]*?\})\);/);
 requireTrue(!!match,'HOSTED_CONFIG_FORMAT_UNEXPECTED');
 const cfg=JSON.parse(match[1]);
 requireTrue(cfg.projectId===PROJECT&&cfg.tenantHint===TENANT,'HOSTED_PROJECT_TENANT_MISMATCH');
 requireTrue(cfg.sourceSha===EXPECTED_SOURCE&&cfg.buildId===EXPECTED_BUILD,'HOSTED_IMMUTABLE_ARTIFACT_MISMATCH');
 requireTrue(/^AIza[\w-]{25,}$/.test(cfg.apiKey),'HOSTED_PUBLIC_API_KEY_INVALID');
 return cfg;
}
function credential(){
 for(const key of ['SA_LAB','SA_LAB_LEGACY','SA_DEFAULT']){
  try{
   const v=JSON.parse(process.env[key]||'');
   if(v.type==='service_account'&&v.project_id===PROJECT&&v.private_key&&v.client_email)return v;
  }catch{}
 }
 throw new Error('EXISTING_PROJECT_SERVICE_ACCOUNT_UNAVAILABLE');
}
async function findActors(db,auth){
 const docs=(await db.collection('tenants').doc(TENANT).collection('members').get()).docs;
 const found=[];
 for(const doc of docs){
  const m=doc.data()||{};
  if(!active(m)||(m.uid&&m.uid!==doc.id))continue;
  let user;
  try{user=await auth.getUser(doc.id);}catch{continue;}
  if(user.disabled||user.emailVerified!==true)continue;
  const labels=[m.nombre,m.name,m.displayName,m.nombreCompleto,m.fullName,
   [m.nombres,m.apellidos].filter(Boolean).join(' '),user.displayName,user.email];
  const index=labels.map(norm);
  const hits=people.filter(p=>p.parts.every(token=>index.some(x=>x.includes(token))));
  requireTrue(hits.length<=1,'IDENTITY_AMBIGUOUS_MATCH');
  if(hits.length)found.push({person:hits[0],uid:doc.id,member:m,roles:cleanRoles(m),countries:allowedCountries(m)});
 }
 for(const p of people)requireTrue(found.filter(x=>x.person.label===p.label).length===1,'REAL_USER_NOT_UNIQUELY_VERIFIED_'+p.label);
 requireTrue(new Set(found.map(x=>x.uid)).size===3,'THREE_DIFFERENT_REAL_UIDS_REQUIRED');
 found.forEach(x=>requireTrue(x.roles.length>0&&x.countries.length>0,'MEMBER_ROLE_OR_COUNTRY_MISSING_'+x.person.label));
 return found;
}
async function exchange(customToken,apiKey){
 const url='https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key='+encodeURIComponent(apiKey);
 const reply=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({token:customToken,returnSecureToken:true}),signal:AbortSignal.timeout(18000)});
 requireTrue(reply.ok,'CUSTOM_TOKEN_EXCHANGE_FAILED');
 const body=await reply.json();
 requireTrue(!!body.idToken&&body.expiresIn,'EXCHANGED_ID_TOKEN_ABSENT');
 return body.idToken;
}
async function invoke(token,body){
 const headers={'Content-Type':'application/json'};
 if(token)headers.Authorization='Bearer '+token;
 const response=await fetch(URL,{method:'POST',headers,body:JSON.stringify({data:body}),signal:AbortSignal.timeout(18000)});
 const payload=await response.json().catch(()=>({}));
 return{status:response.status,ok:response.ok,result:payload.result||null,errorStatus:payload.error?.status||''};
}
function pass(ok,code,actor){
 receipt.tests++;
 if(!ok){receipt.failures.push({code,actor});throw new Error(code);}
 receipt.passes++;
}
async function main(){
 let app;
 try{
  requireTrue(OUT&&process.env.GITHUB_REF==='refs/heads/recovery/fase-a-clean-20260831','CANONICAL_CI_CONTEXT_REQUIRED');
  const cfg=await hostedConfig();
  app=initializeApp({credential:cert(credential()),projectId:PROJECT},'b4003-real-uid-negative');
  const auth=getAuth(app),db=getFirestore(app),actors=await findActors(db,auth);
  receipt.identityCount=actors.length;receipt.distinctIdentities=true;
  const anon=await invoke('',{tenantId:TENANT,activeRole:'Operativo',country:'TODOS'});
  pass(!anon.ok&&[401,403].includes(anon.status),'ANONYMOUS_NOT_DENIED','anonymous');
  receipt.anonymousDenial={http:anon.status,errorStatus:anon.errorStatus};
  for(const actor of actors){
   const label=actor.person.label;
   const custom=await auth.createCustomToken(actor.uid,{giB4003SignedReadonly:true});
   receipt.realUserCustomTokensIssued++;
   const token=await exchange(custom,cfg.apiKey);
   receipt.realUserIdTokensExchanged++;
   const a={name:label,assignedRolesVerified:actor.roles.map(x=>x.norm),
    countriesAuthorized:actor.countries,positives:[],negatives:[]};
   receipt.actors.push(a);
   const expected=actor.person.roles.filter(r=>actor.roles.some(x=>x.norm===r));
   requireTrue(expected.length>0,'EXPECTED_ASSIGNED_ROLES_ABSENT_'+label);
   if(label==='Carlos')requireTrue(expected.includes('operativo')&&expected.includes('asesor'),'CARLOS_DUAL_ROLE_MISSING');
   for(const desired of expected){
    const role=actor.roles.find(x=>x.norm===desired).raw;
    const scope=desired==='asesor'?'self':'full';
    for(const country of [...actor.countries,'TODOS']){
     const result=await invoke(token,{tenantId:TENANT,activeRole:role,country});
     const rows=result.result?.rows;
     // A country filter selects an advisor who works in that country; the
     // advisor's other *authorized* countries remain visible in paises.
     // Requiring every paises element to equal the filter produces a false
     // failure on legitimate GT+CO advisor rows.
     const inCountry=Array.isArray(rows)&&rows.every(r=>Array.isArray(r.paises)&&
       r.paises.every(x=>actor.countries.includes(x))&&
       (country==='TODOS'||r.paises.includes(country)));
     const valid=result.ok&&result.result?.ok===true&&result.result.scope===scope&&inCountry;
     a.positives.push({role:desired,country,scope,http:result.status,
       errorStatus:result.errorStatus,returnedScope:result.result?.scope||null,
       count:Array.isArray(rows)?rows.length:null,pass:valid});
     pass(valid,
       'POSITIVE_READ_SCOPE_FAILED_'+label+'_'+desired+'_'+country,label);
    }
    if(desired==='asesor'){
     const home=await invoke(token,{tenantId:TENANT,activeRole:role,country:'TODOS'});
     const spoof=await invoke(token,{tenantId:TENANT,activeRole:role,country:'TODOS',
      advisorId:'B4003_OTHER_USER_NOT_ASSIGNED',scope:'all',role:'SuperAdmin'});
     const ids=r=>Array.isArray(r.result?.rows)?r.result.rows.map(x=>String(x.id)).sort().join('|'):null;
     pass(home.ok&&spoof.ok&&home.result.scope==='self'&&spoof.result.scope==='self'&&ids(home)===ids(spoof),
      'SELF_SCOPE_PARAM_SPOOF_ESCALATED_'+label,label);
     a.negatives.push({type:'advisor-scope-spoof',pass:true,withoutSensitiveRows:true});
    }
   }
   for(const [name,data] of [
    ['unassigned-role',{tenantId:TENANT,activeRole:'B4003_UNASSIGNED_ROLE',country:'TODOS'}],
    ['unauthorized-country',{tenantId:TENANT,activeRole:actor.roles[0].raw,country:'ZZ'}],
    ['cross-tenant',{tenantId:'b4003-unknown-tenant',activeRole:actor.roles[0].raw,country:'TODOS'}]
   ]){
    const result=await invoke(token,data);
    pass(!result.ok&&[401,403].includes(result.status),'NEGATIVE_ACCESS_NOT_DENIED_'+label+'_'+name,label);
    a.negatives.push({type:name,http:result.status,errorStatus:result.errorStatus,pass:true});
   }
  }
  receipt.status='SIGNED_EXISTING_UID_CALLABLE_ROLE_COUNTRY_TENANT_NEGATIVES_PASS';
 }catch(error){
  receipt.status='HOLD_SIGNED_NEGATIVE_NOT_FULLY_CERTIFIED';
  const code=String(error?.message||'UNKNOWN').replace(/[^A-Z0-9_-]/gi,'').slice(0,110);
  if(!receipt.failures.some(x=>x.code===code))receipt.failures.push({code});
  process.exitCode=1;
 }finally{
  if(app)await deleteApp(app).catch(()=>{});
  if(OUT)fs.writeFileSync(OUT,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
  console.log('GI_B4003_SIGNED_NEGATIVES_STATUS='+receipt.status);
  console.log('GI_B4003_SIGNED_NEGATIVES_TESTS='+receipt.passes+'/'+receipt.tests);
  console.log('GI_B4003_SIGNED_ACTORS='+receipt.identityCount);
  console.log('GI_B4003_SIGNED_ERRORS='+receipt.failures.map(x=>x.code).join(','));
 }
}
main();
