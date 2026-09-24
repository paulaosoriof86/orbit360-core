'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { resolveProductActiveRole } = require('./product-active-role-contract');

const REGION='us-central1';
const PREVIEW_REGION='us-east1';
const VERSION='gravicentra-product-insurer-credentials-v3';
const PROJECT_ID=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'ays-orbit-360-lab';
const SERVICE_ACCOUNT=process.env.ORBIT360_SECRETS_SERVICE_ACCOUNT||'orbit360-secrets-lab@ays-orbit-360-lab.iam.gserviceaccount.com';
const app=getApps()[0]||initializeApp();
const db=getFirestore(app),secrets=new SecretManagerServiceClient();
const VIEW_ROLES=new Set(['direccion','superadmin','super_admin','admin','admintenant','admin_tenant','operativo']);
const MANAGE_ROLES=new Set(['direccion','superadmin','super_admin','admin','admintenant','admin_tenant','operativo']);
const REF_RE=/^cred_[a-f0-9]{32}$/;
const text=(v,max=800)=>String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);
const norm=v=>text(v,160).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sha=v=>crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');

function tenantId(v){
  const t=text(v,63);
  if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(t))throw new HttpsError('invalid-argument','Tenant inválido.');
  return t;
}
function scopeFor(auditMode){return auditMode==='cloudlog'?'preview':'production';}
function secretId(t,scope){return scope==='preview'?'orbit360-insurer-credentials-preview-'+t:'orbit360-insurer-credentials-'+t;}
function latest(t,scope){return 'projects/'+PROJECT_ID+'/secrets/'+secretId(t,scope)+'/versions/latest';}
function parent(t,scope){return 'projects/'+PROJECT_ID+'/secrets/'+secretId(t,scope);}
function empty(t){return{schemaVersion:VERSION,tenantId:t,updatedAt:new Date().toISOString(),records:{}};}

async function readVaultScope(t,scope){
  try{
    const[v]=await secrets.accessSecretVersion({name:latest(t,scope)});
    const raw=v&&v.payload&&v.payload.data?Buffer.from(v.payload.data).toString('utf8'):'';
    if(!raw)return empty(t);
    const out=JSON.parse(raw);
    if(!out||out.tenantId!==t)throw new HttpsError('failed-precondition','Bóveda incompatible con el tenant.');
    out.records=out.records&&typeof out.records==='object'?out.records:{};
    return out;
  }catch(e){
    if(e instanceof HttpsError)throw e;
    if(Number(e&&e.code)===5)return empty(t);
    throw new HttpsError('unavailable','No fue posible consultar la bóveda segura.');
  }
}
async function readEffectiveVault(t,scope){
  if(scope!=='preview')return readVaultScope(t,'production');
  const rows=await Promise.all([readVaultScope(t,'production'),readVaultScope(t,'preview')]),base=rows[0],overlay=rows[1];
  return Object.assign({},base,{schemaVersion:VERSION,tenantId:t,records:Object.assign({},base.records||{},overlay.records||{})});
}
async function ensureSecret(t,scope){
  try{
    await secrets.getSecret({name:parent(t,scope)});
  }catch(e){
    if(Number(e&&e.code)!==5)throw e;
    try{
      await secrets.createSecret({parent:'projects/'+PROJECT_ID,secretId:secretId(t,scope),secret:{replication:{automatic:{}}}});
    }catch(createError){
      if(Number(createError&&createError.code)!==6)throw createError;
    }
  }
}
async function writeVault(t,vault,scope){
  vault.schemaVersion=VERSION;vault.tenantId=t;vault.updatedAt=new Date().toISOString();
  const data=Buffer.from(JSON.stringify(vault),'utf8');
  if(data.byteLength>62000)throw new HttpsError('resource-exhausted','La bóveda alcanzó su límite operativo.');
  try{
    await ensureSecret(t,scope);
    await secrets.addSecretVersion({parent:parent(t,scope),payload:{data}});
  }catch(e){
    throw new HttpsError('unavailable','No fue posible guardar la credencial segura en el entorno autorizado.');
  }
}
async function authorize(request,t,manage){
  if(!request.auth||!request.auth.uid)throw new HttpsError('unauthenticated','Autenticación requerida.');
  const snap=await db.collection('tenants').doc(t).collection('members').doc(request.auth.uid).get(),m=snap.exists?snap.data():null;
  if(!m||text(m.tenantId,160)!==t||!['active','activo'].includes(norm(m.status)))throw new HttpsError('permission-denied','Membresía activa requerida.');
  let roleState;
  try{roleState=resolveProductActiveRole(m,request.data&&request.data.activeRole);}
  catch(error){throw new HttpsError('permission-denied',error&&error.code==='PRODUCT_ASSIGNED_ROLES_MISSING'?'La membresía no tiene roles asignados.':'Rol activo no asignado.');}
  const allowed=(manage?MANAGE_ROLES:VIEW_ROLES).has(roleState.activeRole);
  if(!allowed)throw new HttpsError('permission-denied','El rol activo no permite esta acción.');
  return{uid:request.auth.uid,activeRole:roleState.activeRole};
}
function stableRef(t,insurerId,portalId){return 'cred_'+sha(t+'|'+text(insurerId,160)+'|'+text(portalId,160)).slice(0,32);}
function auditPayload(t,actor,action,detail){
  detail=detail||{};
  return{schemaVersion:VERSION,tenantId:t,action,actorUidHash:sha(actor.uid),activeRole:actor.activeRole,insurerId:text(detail.insurerId,160),portalId:text(detail.portalId,160),credentialRef:REF_RE.test(text(detail.credentialRef,80))?text(detail.credentialRef,80):'',outcome:text(detail.outcome||'ok',60),containsSecrets:false};
}
async function audit(t,actor,action,detail,mode){
  const payload=auditPayload(t,actor,action,detail);
  if(mode==='cloudlog'){console.info('GRAVICENTRA_PREVIEW_CREDENTIAL_AUDIT '+JSON.stringify(Object.assign({},payload,{createdAt:new Date().toISOString()})));return;}
  await db.collection('tenants').doc(t).collection('auditEvents').add(Object.assign({},payload,{createdAt:FieldValue.serverTimestamp()}));
}
async function execute(request,auditMode){
  const d=request.data||{},t=tenantId(d.tenantId),op=norm(d.operation),scope=scopeFor(auditMode);
  if(!['import','status','reveal','copy','delete_preview'].includes(op))throw new HttpsError('invalid-argument','Operación segura inválida.');
  if(op==='delete_preview'&&scope!=='preview')throw new HttpsError('permission-denied','La limpieza sintética solo está disponible en Preview.');
  const actor=await authorize(request,t,op==='import'||op==='delete_preview');
  if(op==='import'){
    const items=[].concat(d.items||[]);
    if(!items.length||items.length>100)throw new HttpsError('invalid-argument','Cantidad de credenciales inválida.');
    const vault=await readVaultScope(t,scope),base=scope==='preview'?await readVaultScope(t,'production'):vault,mappings=[];
    for(const item of items){
      const insurerId=text(item.insurerId,160),portalId=text(item.portalId||item.resourceId,160),username=text(item.username,320),password=text(item.password,512);
      if(!insurerId||!portalId||(!username&&!password))throw new HttpsError('invalid-argument','Credencial incompleta.');
      const ref=REF_RE.test(text(item.credentialRef,80))?text(item.credentialRef,80):stableRef(t,insurerId,portalId),before=vault.records[ref]||base.records[ref]||{};
      vault.records[ref]={schemaVersion:VERSION,tenantId:t,insurerId,portalId,username:username||text(before.username,320),password:password||text(before.password,512),sourceHash:text(d.sourceHash||before.sourceHash,80),updatedAt:new Date().toISOString(),scope};
      mappings.push({insurerId,portalId,resourceId:portalId,credentialRef:ref,available:true,usernameAvailable:!!vault.records[ref].username,passwordAvailable:!!vault.records[ref].password});
    }
    await writeVault(t,vault,scope);
    await audit(t,actor,'credential.import',{outcome:scope==='preview'?'stored_preview_isolated':'stored'},auditMode);
    return{ok:true,status:scope==='preview'?'stored_preview_isolated':'stored_securely',imported:mappings.length,mappings,containsSecrets:false,previewIsolated:scope==='preview'};
  }
  const ref=text(d.credentialRef,80),insurerId=text(d.insurerId,160);
  if(!REF_RE.test(ref))throw new HttpsError('invalid-argument','Referencia de credencial inválida.');
  if(op==='delete_preview'){
    const previewVault=await readVaultScope(t,'preview'),record=previewVault.records[ref],match=!!(record&&(!insurerId||record.insurerId===insurerId));
    if(match)delete previewVault.records[ref];
    await writeVault(t,previewVault,'preview');
    await audit(t,actor,'credential.preview_cleanup',{insurerId,credentialRef:ref,outcome:match?'removed':'not_found'},auditMode);
    return{ok:true,removed:match,containsSecrets:false,previewIsolated:true};
  }
  const vault=await readEffectiveVault(t,scope),record=vault.records[ref],match=!!(record&&(!insurerId||record.insurerId===insurerId));
  if(op==='status'){
    await audit(t,actor,'credential.status',{insurerId,credentialRef:ref,outcome:match?'available':'not_found'},auditMode);
    return{ok:true,status:match?'disponible':'no_disponible',available:match,revealAvailable:match,copyAvailable:match,requiresReauth:true,containsSecrets:false,previewIsolated:scope==='preview'};
  }
  if(!match)throw new HttpsError('not-found','Credencial no disponible.');
  const value=text(record.password,512);
  if(!value)throw new HttpsError('not-found','Contraseña no disponible.');
  await audit(t,actor,'credential.'+op,{insurerId:record.insurerId,portalId:record.portalId,credentialRef:ref,outcome:'ok'},auditMode);
  return{ok:true,value,expiresInMs:6000,containsSecrets:true,previewIsolated:scope==='preview'};
}

exports.orbit360ProductInsurerCredentialCommand=onCall({region:REGION,cors:true,timeoutSeconds:30,memory:'256MiB',serviceAccount:SERVICE_ACCOUNT},request=>execute(request,'firestore'));
exports.orbit360ProductInsurerCredentialCommandPreview=onCall({region:PREVIEW_REGION,cors:true,timeoutSeconds:30,memory:'256MiB',serviceAccount:SERVICE_ACCOUNT},request=>execute(request,'cloudlog'));
exports.__productInsurerCredentials=Object.freeze({
  VERSION,
  secretPattern:'orbit360-insurer-credentials-{tenantId}',
  previewSecretPattern:'orbit360-insurer-credentials-preview-{tenantId}',
  multiTenant:true,
  production:{callable:'orbit360ProductInsurerCredentialCommand',region:REGION,audit:'firestore'},
  preview:{callable:'orbit360ProductInsurerCredentialCommandPreview',region:PREVIEW_REGION,audit:'cloudlog',writesOperationalData:false,importEnabled:true,isolatedSecretManager:true}
});
