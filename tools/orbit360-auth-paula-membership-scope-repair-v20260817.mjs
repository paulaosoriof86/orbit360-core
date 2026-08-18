#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT=process.env.ORBIT360_PROJECT_ID||'ays-orbit-360-lab';
const TENANT=process.env.ORBIT360_TENANT_ID||'alianzas-soluciones';
const TARGET_HASH=process.env.ORBIT360_TARGET_EMAIL_HASH||'9b663847979724e9491e1c655da32a7cb17a5f6ed26dba352de1eb811254b23f';
const ADVISOR=process.env.ORBIT360_TARGET_ADVISOR_ID||'ase-paula-osorio';
const EXPECTED_SCOPE='all';
const FIELD_PATH='dataScopes.default';
const RUN_ID=String(process.env.ORBIT360_RECON_RUN_ID||'').trim();
const OUT=process.env.ORBIT360_RECON_EVIDENCE||'';
const CONFIG_PATH='orbit360-artifacts/fase-a-product/data/tenant-config/alianzas-soluciones.asesores.json';
const VALIDATOR_REVISION='canonical-scope-repair-v1-semantic-noexpansion';
const VALID_SCOPES=new Set(['own','team','all','none']);
const ROLE_FALLBACK=Object.freeze({'Dirección':'all','SuperAdmin':'all','AdminTenant':'all','Operativo':'team','Finanzas':'all','Marketing':'team','Asesor':'own','Comercial':'own','Asistente':'team'});
const text=v=>String(v==null?'':v).trim();
const sha=v=>crypto.createHash('sha256').update(String(v==null?'':v),'utf8').digest('hex');
const emailHash=v=>sha(text(v).toLowerCase().replace(/\s+/g,''));
const uniq=a=>[...new Set([].concat(a||[]).map(text).filter(Boolean))];
const normScope=v=>({propios:'own',propio:'own',own:'own',mios:'own',equipo:'team',team:'team',todos:'all',all:'all',global:'all',ninguno:'none',none:'none',sin_acceso:'none',sinacceso:'none'}[text(v).toLowerCase()]||text(v).toLowerCase());
const stable=v=>{if(v==null)return v;if(Array.isArray(v))return v.map(stable);if(typeof v?.toDate==='function')return v.toDate().toISOString();if(typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;};
const digest=v=>sha(JSON.stringify(stable(v)));
function clone(v){return JSON.parse(JSON.stringify(stable(v)));}
function withoutTarget(v){const c=clone(v||{});if(c.dataScopes&&typeof c.dataScopes==='object')delete c.dataScopes.default;return c;}
function write(payload){if(!OUT)throw new Error('REPAIR_EVIDENCE_PATH_NOT_BOUND');fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,runId:RUN_ID,validatorRevision:VALIDATOR_REVISION,projectId:PROJECT,tenantIdHash:sha(TENANT),targetAdvisorId:ADVISOR,targetEmailHash:TARGET_HASH,fieldPath:FIELD_PATH,containsPII:false,containsSecrets:false,containsPassword:false,containsActionLink:false,authWrites:0,deployExecuted:false,productionTouched:false,mainTouched:false,mergeExecuted:false},null,2)+'\n','utf8');}
function fail(code,classification='DATA_CONTRACT_FAILURE'){const e=new Error(code);e.classification=classification;throw e;}
let app,firestoreWrites=0,firestoreWriteAttempts=0;
let audit={beforeStoredDefaultPresent:false,beforeStoredDefaultScope:'',beforeEffectiveDefaultScope:'',afterStoredDefaultScope:'',afterEffectiveDefaultScope:'',semanticAccessExpansion:false,readbackUnchangedExceptTarget:false,configScopeCanonical:false,alreadyCanonical:false};
try{
  if(!RUN_ID) fail('REPAIR_RUN_ID_NOT_BOUND','PIPELINE_MECHANISM_FAILURE');
  if(!OUT) fail('REPAIR_EVIDENCE_PATH_NOT_BOUND','PIPELINE_MECHANISM_FAILURE');
  if(!process.env.GOOGLE_APPLICATION_CREDENTIALS) fail('PROVIDER_CREDENTIAL_NOT_BOUND','ENVIRONMENT_FAILURE');
  const cfg=JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8').replace(/^\uFEFF/,''));
  const advisors=(cfg.advisors||[]).filter(a=>text(a.id)===ADVISOR);
  if(advisors.length!==1) fail('AUTHORITATIVE_ADVISOR_CONFIG_NOT_UNIQUE','DATA_CONTRACT_FAILURE');
  if(normScope(advisors[0].scopeDatos)!==EXPECTED_SCOPE) fail('AUTHORITATIVE_SCOPE_NOT_ALL','DATA_CONTRACT_FAILURE');
  if(text(advisors[0].estado).toLowerCase()!=='activo') fail('AUTHORITATIVE_ADVISOR_NOT_ACTIVE','DATA_CONTRACT_FAILURE');
  audit.configScopeCanonical=true;

  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
  const auth=getAuth(app),db=getFirestore(app);
  const users=[];let token;
  do{const page=await auth.listUsers(1000,token);users.push(...page.users);token=page.pageToken;}while(token);
  const matches=users.filter(u=>emailHash(u.email)===TARGET_HASH);
  if(matches.length!==1) fail(`TARGET_AUTH_IDENTITY_MATCH_${matches.length}`);
  const user=matches[0];
  if(user.disabled) fail('TARGET_AUTH_IDENTITY_DISABLED');
  if(user.emailVerified!==true) fail('TARGET_AUTH_EMAIL_NOT_VERIFIED');

  const ref=db.collection('tenants').doc(TENANT).collection('members').doc(user.uid);
  const snap=await ref.get();
  if(!snap.exists) fail('TARGET_MEMBERSHIP_NOT_FOUND');
  const before=stable(snap.data()||{});
  if(text(before.uid||before.userId)&&text(before.uid||before.userId)!==user.uid) fail('TARGET_MEMBERSHIP_UID_MISMATCH','SECURITY_FAILURE');
  if(text(before.tenantId||before.tenant)!==TENANT) fail('TARGET_MEMBERSHIP_TENANT_MISMATCH','SECURITY_FAILURE');
  if(text(before.status||before.estado).toLowerCase()!=='active') fail('TARGET_MEMBERSHIP_NOT_ACTIVE');
  const roles=uniq(Array.isArray(before.roles)?before.roles:(before.role||before.rol?[before.role||before.rol]:[]));
  const defaultRole=text(before.defaultRole||before.rolDefault||before.roleDefault||roles[0]);
  const activeRole=text(before.activeRole||before.rolActivo||defaultRole);
  if(activeRole!=='SuperAdmin'||defaultRole!=='SuperAdmin') fail('REPAIR_BASIS_ROLE_DRIFT','SECURITY_FAILURE');
  if(!roles.includes('SuperAdmin')) fail('REPAIR_BASIS_SUPERADMIN_NOT_ASSIGNED','SECURITY_FAILURE');
  const advisor=text(before.advisorId||before.asesorId||before.teamId);
  if(roles.includes('Asesor')&&advisor!==ADVISOR) fail('TARGET_MEMBERSHIP_ADVISOR_MISMATCH','SECURITY_FAILURE');
  const countries=uniq(before.countries||before.paises);
  if(!countries.length||countries.some(c=>!['GT','CO'].includes(c))) fail('TARGET_MEMBERSHIP_COUNTRIES_INVALID','DATA_CONTRACT_FAILURE');

  if(!before.dataScopes||typeof before.dataScopes!=='object'||Array.isArray(before.dataScopes)) fail('TARGET_DATASCOPES_NOT_OBJECT');
  const storedRaw=before.dataScopes.default??before.dataScopes['*'];
  const stored=normScope(storedRaw);
  audit.beforeStoredDefaultPresent=storedRaw!==undefined&&storedRaw!==null&&text(storedRaw)!=='';
  audit.beforeStoredDefaultScope=VALID_SCOPES.has(stored)?stored:'';
  const fallback=ROLE_FALLBACK[activeRole]||'none';
  const beforeEffective=VALID_SCOPES.has(stored)?stored:fallback;
  audit.beforeEffectiveDefaultScope=beforeEffective;
  if(beforeEffective!==EXPECTED_SCOPE) fail('REPAIR_WOULD_CHANGE_EFFECTIVE_DEFAULT_SCOPE','SECURITY_FAILURE');
  const modules=before.dataScopes.modules&&typeof before.dataScopes.modules==='object'&&!Array.isArray(before.dataScopes.modules)?before.dataScopes.modules:{};
  for(const [moduleKey,value] of Object.entries(modules)){
    if(!text(moduleKey)) fail('TARGET_MEMBERSHIP_SCOPE_MODULE_KEY_INVALID');
    if(!VALID_SCOPES.has(normScope(value))) fail('TARGET_MEMBERSHIP_MODULE_SCOPE_INVALID');
  }

  if(audit.beforeStoredDefaultPresent&&audit.beforeStoredDefaultScope===EXPECTED_SCOPE){
    audit.alreadyCanonical=true;audit.afterStoredDefaultScope=EXPECTED_SCOPE;audit.afterEffectiveDefaultScope=EXPECTED_SCOPE;audit.readbackUnchangedExceptTarget=true;
    write({schemaVersion:'orbit360-auth-paula-membership-scope-repair-v1',ok:true,status:'TARGET_MEMBERSHIP_SCOPE_ALREADY_CANONICAL',classification:'PASS',...audit,firestoreWrites,firestoreWriteAttempts,operationalWrites:0,authReads:true,firestoreReads:true,changedFieldCount:0});
    console.log(JSON.stringify({ok:true,status:'TARGET_MEMBERSHIP_SCOPE_ALREADY_CANONICAL',firestoreWrites}));
  } else {
    if(audit.beforeStoredDefaultPresent&&audit.beforeStoredDefaultScope!==EXPECTED_SCOPE) fail('REPAIR_WOULD_OVERRIDE_VALID_NONALL_SCOPE','SECURITY_FAILURE');
    const nonTargetBefore=digest(withoutTarget(before));
    const modulesBefore=digest(modules);
    firestoreWriteAttempts=1;
    await ref.update({[FIELD_PATH]:EXPECTED_SCOPE});
    firestoreWrites=1;
    const afterSnap=await ref.get();
    if(!afterSnap.exists) fail('REPAIR_READBACK_MEMBERSHIP_MISSING','SECURITY_FAILURE');
    const after=stable(afterSnap.data()||{});
    const afterStored=normScope(after.dataScopes&&after.dataScopes.default);
    audit.afterStoredDefaultScope=afterStored;
    audit.afterEffectiveDefaultScope=VALID_SCOPES.has(afterStored)?afterStored:(ROLE_FALLBACK[activeRole]||'none');
    if(afterStored!==EXPECTED_SCOPE) fail('REPAIR_READBACK_TARGET_NOT_CANONICAL','SECURITY_FAILURE');
    if(audit.afterEffectiveDefaultScope!==beforeEffective) fail('REPAIR_READBACK_EFFECTIVE_ACCESS_CHANGED','SECURITY_FAILURE');
    if(digest(withoutTarget(after))!==nonTargetBefore) fail('REPAIR_READBACK_NON_TARGET_DRIFT','SECURITY_FAILURE');
    const modulesAfter=after.dataScopes&&after.dataScopes.modules&&typeof after.dataScopes.modules==='object'?after.dataScopes.modules:{};
    if(digest(modulesAfter)!==modulesBefore) fail('REPAIR_READBACK_MODULE_SCOPES_DRIFT','SECURITY_FAILURE');
    audit.semanticAccessExpansion=false;
    audit.readbackUnchangedExceptTarget=true;
    write({schemaVersion:'orbit360-auth-paula-membership-scope-repair-v1',ok:true,status:'TARGET_MEMBERSHIP_SCOPE_CANONICAL_REPAIR_PASS',classification:'PASS',...audit,firestoreWrites,firestoreWriteAttempts,operationalWrites:1,authReads:true,firestoreReads:true,changedFieldCount:1});
    console.log(JSON.stringify({ok:true,status:'TARGET_MEMBERSHIP_SCOPE_CANONICAL_REPAIR_PASS',firestoreWrites,semanticAccessExpansion:false}));
  }
}catch(e){
  try{write({schemaVersion:'orbit360-auth-paula-membership-scope-repair-v1',ok:false,status:'TARGET_MEMBERSHIP_SCOPE_CANONICAL_REPAIR_STOP',classification:e.classification||'DATA_CONTRACT_FAILURE',failedCheck:text(e.message||e).slice(0,180),...audit,firestoreWrites,firestoreWriteAttempts,operationalWrites:firestoreWrites,authReads:true,firestoreReads:true,changedFieldCount:firestoreWrites});}catch{}
  console.error(text(e.message||e).slice(0,180));process.exitCode=41;
}finally{try{if(app)await deleteApp(app);}catch{}}
