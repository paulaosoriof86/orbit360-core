'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { __productOperationalDomain } = require('./product-operational-domain');
const { __opsLeadsProductDomain } = require('./product-ops-leads-domain');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const PREVIEW_REGION = 'us-east1';
const VERSION = 'gravicentra-drive-document-domain-v4-r86-secret-bound-oauth-client';
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'ays-orbit-360-lab';
const SERVICE_ACCOUNT = process.env.ORBIT360_SECRETS_SERVICE_ACCOUNT || 'orbit360-secrets-lab@ays-orbit-360-lab.iam.gserviceaccount.com';
const DRIVE_OAUTH_CLIENT_PREVIEW_SECRET = 'ORBIT360_DRIVE_OAUTH_CLIENT_PREVIEW';
const DRIVE_OAUTH_CLIENT_PRODUCTION_SECRET = 'ORBIT360_DRIVE_OAUTH_CLIENT_PRODUCTION';
const ROOT_BY_TENANT = Object.freeze({
  'alianzas-soluciones': process.env.ORBIT360_DRIVE_CLIENTS_ROOT_FOLDER_ID || '13H7zMGwFC9f1UnHyfNqzzSfFex1jJRHE'
});
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png','image/jpeg','image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword','application/vnd.ms-excel',
  'text/plain','text/csv'
]);
const BOOTSTRAP_ROLES = new Set(['direccion','superadmin','super_admin','admin','admintenant','admin_tenant']);
const app = getApps()[0] || initializeApp();
const db = getFirestore(app);
const secrets = new SecretManagerServiceClient();

function clean(v,max=500){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function norm(v){return clean(v,160).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
function safeName(v){return clean(v,180).replace(/[\\/:*?"<>|\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim()||'Documento';}
function sha(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function previewSyntheticClient(clientId){return /^(?:b2[-_]|b3004qa_)/i.test(clean(clientId,180));}
function driveIdFromUrl(v){
  const s=clean(v,1000);
  const m=s.match(/\/(?:file\/d|folders)\/([A-Za-z0-9_-]{20,})/)||s.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  return m?m[1]:'';
}
function base64Bytes(encoded){
  const raw=String(encoded||'').replace(/^data:[^,]+,/,'').replace(/\s+/g,'');
  if(!raw)throw new HttpsError('invalid-argument','Archivo requerido.');
  let bytes;try{bytes=Buffer.from(raw,'base64');}catch(e){throw new HttpsError('invalid-argument','Archivo inválido.');}
  if(!bytes.length||bytes.length>MAX_BYTES)throw new HttpsError('invalid-argument','El archivo supera el límite de 15 MB.');
  return bytes;
}
function vaultSecretId(tenantId,previewOnly){return (previewOnly===true?'orbit360-drive-oauth-preview-':'orbit360-drive-oauth-')+tenantId;}
function vaultParent(tenantId,previewOnly){return 'projects/'+PROJECT_ID+'/secrets/'+vaultSecretId(tenantId,previewOnly);}
function vaultLatest(tenantId,previewOnly){return vaultParent(tenantId,previewOnly)+'/versions/latest';}
async function ensureVaultSecret(tenantId,previewOnly){
  try{await secrets.getSecret({name:vaultParent(tenantId,previewOnly)});}
  catch(e){
    if(Number(e&&e.code)!==5)throw e;
    try{await secrets.createSecret({parent:'projects/'+PROJECT_ID,secretId:vaultSecretId(tenantId,previewOnly),secret:{replication:{automatic:{}}}});}
    catch(createError){if(Number(createError&&createError.code)!==6)throw createError;}
  }
}
async function readVault(tenantId,previewOnly){
  const parent=vaultParent(tenantId,previewOnly);
  try{
    const[versions]=await secrets.listSecretVersions({parent,filter:'state=ENABLED',pageSize:1});
    if(!Array.isArray(versions)||versions.length===0)return null;
    const[v]=await secrets.accessSecretVersion({name:vaultLatest(tenantId,previewOnly)});
    const raw=v&&v.payload&&v.payload.data?Buffer.from(v.payload.data).toString('utf8'):'';
    if(!raw)return null;
    const out=JSON.parse(raw);
    if(!out||out.tenantId!==tenantId||!clean(out.refreshToken,4096))return null;
    return out;
  }catch(e){
    const code=Number(e&&e.code);
    if(code===5)return null;
    throw new HttpsError('unavailable','No fue posible consultar la conexión segura con Drive.',{vaultState:'read_failed',code:String(code||'')});
  }
}
async function writeVault(tenantId,vault,previewOnly){
  const out={
    schemaVersion:VERSION,
    tenantId,
    refreshToken:clean(vault.refreshToken,4096),
    googleAccountEmail:clean(vault.googleAccountEmail,320).toLowerCase(),
    googleAccountDisplayName:clean(vault.googleAccountDisplayName,220),
    rootFolderId:clean(vault.rootFolderId,180),
    connectedByUidHash:clean(vault.connectedByUidHash,80),
    connectedAt:new Date().toISOString()
  };
  if(!out.refreshToken)throw new HttpsError('failed-precondition','Google no entregó una autorización persistente.');
  try{
    await ensureVaultSecret(tenantId,previewOnly);
    await secrets.addSecretVersion({parent:vaultParent(tenantId,previewOnly),payload:{data:Buffer.from(JSON.stringify(out),'utf8')}});
  }catch(e){throw new HttpsError('unavailable','No fue posible guardar la conexión segura con Drive.');}
}
async function providerConfig(previewOnly){
  const secretName=previewOnly===true?DRIVE_OAUTH_CLIENT_PREVIEW_SECRET:DRIVE_OAUTH_CLIENT_PRODUCTION_SECRET;
  const raw=clean(process.env[secretName],12000);
  if(!raw)throw new HttpsError('failed-precondition','La configuración administrativa segura de Google no está disponible para la integración Drive.',{secretName});
  let body={};try{body=JSON.parse(raw);}catch(e){throw new HttpsError('failed-precondition','La configuración administrativa segura de Google es inválida.',{secretName});}
  if(!clean(body.clientId,1000)||!clean(body.clientSecret,2000)){
    throw new HttpsError('failed-precondition','La configuración administrativa segura de Google está incompleta.',{secretName});
  }
  return{clientId:clean(body.clientId,1000),clientSecret:clean(body.clientSecret,2000)};
}
function oauthRedirectUri(value,previewOnly){
  const raw=clean(value,1200);
  let u;try{u=new URL(raw);}catch(e){throw new HttpsError('invalid-argument','Origen OAuth inválido.');}
  const host=String(u.hostname||'').toLowerCase();
  const preview=/^ays-orbit-360-lab--[a-z0-9-]+\.web\.app$/.test(host);
  const live=host==='ays-orbit-360-lab.web.app'||host==='ays-orbit-360-lab.firebaseapp.com';
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||(previewOnly===true?!preview:!live)){
    throw new HttpsError('permission-denied','Origen OAuth fuera del entorno autorizado.');
  }
  return u.origin;
}
async function authorizationCodeTokens(code,redirectUri,previewOnly){
  const authorizationCode=clean(code,8192);
  if(!authorizationCode)throw new HttpsError('invalid-argument','Código de autorización de Google requerido.');
  const cfg=await providerConfig(previewOnly),safeRedirect=oauthRedirectUri(redirectUri,previewOnly);
  const form=new URLSearchParams({client_id:cfg.clientId,client_secret:cfg.clientSecret,code:authorizationCode,redirect_uri:safeRedirect,grant_type:'authorization_code'});
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
  const body=await r.json().catch(()=>({}));
  if(!r.ok||!clean(body.access_token,4096)){
    throw new HttpsError('failed-precondition','Google no pudo completar la conexión persistente con Drive.',{oauthError:clean(body.error||body.error_description||r.status,300)});
  }
  const refreshToken=clean(body.refresh_token,4096);
  if(!refreshToken){
    throw new HttpsError('failed-precondition','Google autorizó Drive pero no emitió credencial persistente. Debe repetirse la autorización con consentimiento completo.',{oauthError:'refresh_token_missing'});
  }
  return{accessToken:clean(body.access_token,4096),refreshToken,redirectUri:safeRedirect};
}
async function accessTokenFromRefresh(refreshToken,previewOnly){
  const cfg=await providerConfig(previewOnly);
  const form=new URLSearchParams({client_id:cfg.clientId,client_secret:cfg.clientSecret,refresh_token:clean(refreshToken,4096),grant_type:'refresh_token'});
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
  const body=await r.json().catch(()=>({}));
  if(!r.ok||!clean(body.access_token,4096))throw new HttpsError('failed-precondition','La conexión persistente con Google Drive debe volver a configurarse.');
  return clean(body.access_token,4096);
}
async function tenantDriveToken(tenantId,previewOnly){
  const vault=await readVault(tenantId,previewOnly);
  if(!vault)throw new HttpsError('failed-precondition','DRIVE_TENANT_SETUP_REQUIRED');
  return{accessToken:await accessTokenFromRefresh(vault.refreshToken,previewOnly),vault};
}
async function driveFetch(url,options={},accessToken){
  if(!accessToken)throw new HttpsError('failed-precondition','DRIVE_BACKEND_AUTH_REQUIRED');
  const response=await fetch(url,Object.assign({},options,{headers:Object.assign({},options.headers||{},{Authorization:'Bearer '+accessToken})}));
  const text=await response.text();
  let body={};try{body=text?JSON.parse(text):{};}catch(e){body={raw:text};}
  if(!response.ok){
    const msg=body&&body.error&&body.error.message?body.error.message:'Drive rechazó la operación.';
    const code=response.status===403?'permission-denied':response.status===404?'not-found':'failed-precondition';
    throw new HttpsError(code,msg,{driveStatus:response.status});
  }
  return body;
}
async function driveBinary(id,accessToken){
  const url='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?alt=media&supportsAllDrives=true';
  const r=await fetch(url,{headers:{Authorization:'Bearer '+accessToken}});
  if(!r.ok)throw new HttpsError(r.status===403?'permission-denied':r.status===404?'not-found':'failed-precondition','Drive no autorizó la lectura del documento.',{driveStatus:r.status});
  const ab=await r.arrayBuffer();
  const bytes=Buffer.from(ab);
  if(!bytes.length||bytes.length>MAX_BYTES)throw new HttpsError('resource-exhausted','El documento supera el límite de 15 MB para lectura segura.');
  return bytes;
}
async function getMeta(id,accessToken){
  return driveFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=id,name,mimeType,size,parents,webViewLink,trashed,capabilities(canAddChildren,canEdit,canShare,canDownload)&supportsAllDrives=true',{},accessToken);
}
async function listChildFolder(parentId,name,accessToken){
  const q="'"+parentId.replace(/'/g,"\\'")+"' in parents and trashed=false and mimeType='application/vnd.google-apps.folder' and name='"+name.replace(/'/g,"\\'")+"'";
  const url='https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&fields=files(id,name,mimeType,parents,webViewLink)&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=10';
  const body=await driveFetch(url,{},accessToken);
  return Array.isArray(body.files)&&body.files.length?body.files[0]:null;
}
async function createFolder(parentId,name,accessToken){
  return driveFetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,parents,webViewLink&supportsAllDrives=true',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:safeName(name),mimeType:'application/vnd.google-apps.folder',parents:[parentId]})},accessToken);
}
async function ensureFolder(parentId,name,accessToken){
  const found=await listChildFolder(parentId,name,accessToken);
  return found||createFolder(parentId,name,accessToken);
}
async function multipartUpload(parentId,fileName,mimeType,bytes,accessToken){
  const boundary='orbit360_'+crypto.randomBytes(12).toString('hex');
  const metadata=JSON.stringify({name:safeName(fileName),parents:[parentId]});
  const prefix=Buffer.from('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+metadata+'\r\n--'+boundary+'\r\nContent-Type: '+mimeType+'\r\n\r\n');
  const suffix=Buffer.from('\r\n--'+boundary+'--\r\n');
  const body=Buffer.concat([prefix,bytes,suffix]);
  return driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,parents,webViewLink,size,md5Checksum&supportsAllDrives=true',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary,'Content-Length':String(body.length)},body},accessToken);
}
async function driveIdentity(accessToken){
  const about=await driveFetch('https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,permissionId)',{},accessToken);
  const user=about&&about.user||{};
  const email=clean(user.emailAddress,320).toLowerCase();
  if(!email)throw new HttpsError('failed-precondition','Drive no devolvió identidad de la cuenta del tenant.');
  return{email,displayName:clean(user.displayName,220),permissionId:clean(user.permissionId,220)};
}
async function authorizeTarget(request,tenantId,input,mode){
  mode=mode||'read';
  const entity=clean(input.entidad||input.entity,80).toLowerCase();
  const requestedClientId=clean(input.clienteId||input.clientId,180);
  if(entity==='gestion'||entity==='gestiones'){
    const ops=__opsLeadsProductDomain;
    const authz=await ops.authorize(request,'update_management');
    if(authz.tenantId!==tenantId)throw new HttpsError('permission-denied','Tenant fuera de alcance.');
    const managementId=clean(input.entidadId||input.entityId,180);
    if(!managementId)throw new HttpsError('invalid-argument','Gestión requerida para acceder a documentos.');
    const ms=await ops.dataRef(tenantId,'gestiones',managementId).get();
    if(!ms.exists)throw new HttpsError('not-found','Gestión no encontrada.');
    const management=Object.assign({},ms.data()||{},{id:managementId});
    if(!ops.advisorAllowed(authz.member,management.asesorId))throw new HttpsError('permission-denied','La gestión está fuera del alcance activo.');
    const clientId=clean(management.clienteId||requestedClientId,180);
    if(!clientId)throw new HttpsError('failed-precondition','La gestión no tiene cliente vinculado.');
    if(requestedClientId&&requestedClientId!==clientId)throw new HttpsError('failed-precondition','El cliente del documento no coincide con la gestión.');
    const ref=__productOperationalDomain.canonicalRef(tenantId,'clientes',clientId);
    const snap=await ref.get();
    if(!snap.exists)throw new HttpsError('not-found','Cliente vinculado no encontrado.');
    return{actor:authz.actor,row:Object.assign({},snap.data()||{},{id:clientId,tenantId}),ref,clientId,management};
  }
  const clientId=__productOperationalDomain.cleanId(requestedClientId,'clienteId');
  const d=__productOperationalDomain;
  const actor=mode==='write'?await d.authorize(request,tenantId,[{collection:'clientes'}]):await d.authorizeRead(request,tenantId,'clientes');
  const ref=d.canonicalRef(tenantId,'clientes',clientId);
  const snap=await ref.get();
  if(!snap.exists)throw new HttpsError('not-found','Cliente no encontrado.');
  const row=Object.assign({},snap.data()||{},{id:clientId,tenantId});
  if(!d.withinScope(actor,'clientes','cliente360',row))throw new HttpsError('permission-denied','El alcance activo no autoriza este cliente.');
  return{actor,row,ref,clientId};
}
function refsFrom(row){
  const out=[];
  for(const key of ['documentos','adjuntos','attachments','files']){
    for(const item of (Array.isArray(row&&row[key])?row[key]:[])){
      if(typeof item==='string')out.push(driveIdFromUrl(item)||clean(item,180));
      else if(item&&typeof item==='object')out.push(clean(item.documentRef||item.fileId||item.archivoRef,180)||driveIdFromUrl(item.driveUrl||item.externalUrl||item.url||''));
    }
  }
  if(row&&typeof row==='object')out.push(clean(row.documentRef||row.fileId||row.archivoRef,180)||driveIdFromUrl(row.driveUrl||row.externalUrl||row.url||''));
  return new Set(out.filter(Boolean));
}
async function authorizeDocument(request,previewOnly,mode){
  const input=request.data||{};
  const tenantId=__productOperationalDomain.cleanId(input.tenantId,'tenantId');
  const target=await authorizeTarget(request,tenantId,input,mode||'read');
  if(previewOnly===true&&!previewSyntheticClient(target.clientId))throw new HttpsError('permission-denied','Preview documental automatizado solo admite expedientes sintéticos autorizados.');
  const fileId=clean(input.documentRef||input.fileId||input.archivoRef,180)||driveIdFromUrl(input.driveUrl||input.externalUrl||input.url||'');
  if(!/^[A-Za-z0-9_-]{20,}$/.test(fileId))throw new HttpsError('invalid-argument','Referencia documental inválida.');
  const bound=new Set([...refsFrom(target.row),...refsFrom(target.management||{})]);
  if(!bound.has(fileId))throw new HttpsError('permission-denied','El documento no pertenece al expediente autorizado.');
  return{tenantId,target,fileId};
}
async function audit(tenantId,actor,action,detail,previewOnly){
  const payload={schemaVersion:VERSION,tenantId,action,actorUidHash:sha(actor.uid),activeRole:clean(actor.activeRole,80),clientId:clean(detail&&detail.clientId,180),documentRefHash:sha(clean(detail&&detail.documentRef,180)),outcome:clean(detail&&detail.outcome||'ok',60),containsSecrets:false,createdAt:new Date().toISOString()};
  if(previewOnly===true){console.info('GRAVICENTRA_PREVIEW_DRIVE_AUDIT '+JSON.stringify(payload));return;}
  await db.collection('tenants').doc(tenantId).collection('auditEvents').add(Object.assign({},payload,{createdAt:FieldValue.serverTimestamp()}));
}
async function bootstrap(request,previewOnly){
  const input=request.data||{};
  const tenantId=__productOperationalDomain.cleanId(input.tenantId,'tenantId');
  const actor=await __productOperationalDomain.authorizeRead(request,tenantId,'clientes');
  if(!BOOTSTRAP_ROLES.has(norm(actor.activeRole)))throw new HttpsError('permission-denied','Solo Dirección o administración del tenant puede configurar Drive.');
  if(clean(input.oauthRefreshToken,4096))throw new HttpsError('invalid-argument','La credencial persistente de Drive no puede ingresar desde el navegador.');
  const tokens=await authorizationCodeTokens(input.authorizationCode,input.redirectUri,previewOnly);
  const accessToken=tokens.accessToken,refreshToken=tokens.refreshToken;
  const rootId=ROOT_BY_TENANT[tenantId];
  const [user,root]=await Promise.all([driveIdentity(accessToken),getMeta(rootId,accessToken)]);
  if(!root||root.mimeType!=='application/vnd.google-apps.folder')throw new HttpsError('failed-precondition','La carpeta Clientes configurada no está disponible.');
  if(!root.capabilities||root.capabilities.canAddChildren!==true)throw new HttpsError('permission-denied','La cuenta administrativa de Drive no tiene permiso de escritura en Clientes.');
  await writeVault(tenantId,{refreshToken,googleAccountEmail:user.email,googleAccountDisplayName:user.displayName,rootFolderId:root.id,connectedByUidHash:sha(actor.uid)},previewOnly);
  const verify=await tenantDriveToken(tenantId,previewOnly),verifyRoot=await getMeta(root.id,verify.accessToken);
  if(!verifyRoot||verifyRoot.capabilities?.canAddChildren!==true)throw new HttpsError('internal','No fue posible confirmar la conexión persistente con Drive.');
  await audit(tenantId,actor,'drive.tenant_bootstrap',{clientId:'',documentRef:'',outcome:'connected'},previewOnly);
  return{ok:true,status:'disponible',available:true,configured:true,backendPersistent:true,googleAccountEmail:user.email,rootFolderId:root.id,rootName:root.name,uploadAvailable:true,previewIsolated:previewOnly===true};
}
async function status(request,previewOnly){
  const input=request.data||{};
  const tenantId=__productOperationalDomain.cleanId(input.tenantId,'tenantId');
  if(!request.auth||!request.auth.uid)return{ok:false,available:false,status:'unauthenticated',message:'Se requiere sesión activa.'};
  let actor;
  try{actor=await __productOperationalDomain.authorizeRead(request,tenantId,'clientes');}
  catch(error){return{ok:false,available:false,status:'sin_permiso',message:'El rol activo no tiene acceso al expediente documental.'};}
  const rootId=ROOT_BY_TENANT[tenantId];
  if(!rootId)return{ok:false,available:false,status:'pendiente_conexion',message:'Repositorio Drive no configurado.'};
  const vault=await readVault(tenantId,previewOnly);
  if(!vault){
    let bootstrapClientId='';
    if(BOOTSTRAP_ROLES.has(norm(actor.activeRole))){
      try{bootstrapClientId=(await providerConfig(previewOnly)).clientId;}catch(error){bootstrapClientId='';}
    }
    return{ok:false,available:false,configured:false,backendPersistent:true,bootstrapRequired:true,bootstrapClientId,status:'tenant_setup_required',message:'Drive requiere una configuración administrativa única para este tenant.'};
  }
  try{
    const accessToken=await accessTokenFromRefresh(vault.refreshToken,previewOnly),meta=await getMeta(rootId,accessToken);
    const writable=!!(meta&&meta.capabilities&&meta.capabilities.canAddChildren===true);
    return{ok:true,available:true,readAvailable:true,uploadAvailable:writable,configured:true,backendPersistent:true,status:writable?'disponible':'solo_lectura',rootFolderId:meta.id,rootName:meta.name,googleAccountEmail:clean(vault.googleAccountEmail,320),previewIsolated:previewOnly===true};
  }catch(error){
    const raw=String(error&&((error.details&&error.details.driveStatus)||error.code||error.message)||'');
    return{ok:false,available:false,configured:true,backendPersistent:true,status:'tenant_connection_invalid',message:'La conexión administrativa con Drive necesita revisión.',code:raw};
  }
}
async function upload(request,previewOnly){
  const input=request.data||{},tenantId=__productOperationalDomain.cleanId(input.tenantId,'tenantId');
  const target=await authorizeTarget(request,tenantId,input,'write'),clientId=target.clientId;
  if(previewOnly===true&&!previewSyntheticClient(clientId))throw new HttpsError('permission-denied','Preview documental automatizado solo admite expedientes sintéticos autorizados.');
  const auth=await tenantDriveToken(tenantId,previewOnly),accessToken=auth.accessToken,vault=auth.vault,{actor,row}=target;
  const mime=clean(input.mimeType,160).toLowerCase();
  if(!ALLOWED_MIME.has(mime))throw new HttpsError('invalid-argument','Tipo de archivo no permitido.');
  const bytes=base64Bytes(input.base64),contentHash=crypto.createHash('sha256').update(bytes).digest('hex'),rootId=ROOT_BY_TENANT[tenantId];
  if(!rootId)throw new HttpsError('failed-precondition','Repositorio Drive no configurado para el tenant.');
  const rootMeta=await getMeta(rootId,accessToken);
  if(!rootMeta||!rootMeta.capabilities||rootMeta.capabilities.canAddChildren!==true)throw new HttpsError('permission-denied','La conexión administrativa de Drive no tiene permiso de escritura en Clientes.');
  let clientFolderId='',clientFolder=null,destination=null;
  if(previewOnly===true){
    const qaRoot=await ensureFolder(rootId,'_GRAVICENTRA_PREVIEW_QA',accessToken);
    destination=await ensureFolder(qaRoot.id,clientId,accessToken);clientFolder=destination;clientFolderId=destination.id;
  }else{
    clientFolderId=clean(input.driveFolderId,160)||clean(row.driveFolderId,160)||driveIdFromUrl(row.driveLink||row.driveUrl||'');
    if(clientFolderId){clientFolder=await getMeta(clientFolderId,accessToken);if(clientFolder.mimeType!=='application/vnd.google-apps.folder')throw new HttpsError('failed-precondition','La referencia Drive del cliente no es una carpeta.');}
    else{clientFolder=await ensureFolder(rootId,row.nombre||row.razonSocial||clientId,accessToken);clientFolderId=clientFolder.id;}
    destination=clientFolder;
  }
  const provisional=input.provisional===true;
  const uploadDestination=provisional?await ensureFolder(destination.id,'_PAGOS_EN_PROCESO',accessToken):destination;
  const uploaded=await multipartUpload(uploadDestination.id,input.name||'Documento',mime,bytes,accessToken),readback=await getMeta(uploaded.id,accessToken);
  if(!readback||readback.id!==uploaded.id||readback.trashed===true)throw new HttpsError('internal','Drive no confirmó el archivo.');
  const canonicalFolderUrl='https://drive.google.com/drive/folders/'+clientFolderId;
  if(!provisional){
    await target.ref.set({driveFolderId:clientFolderId,driveLink:canonicalFolderUrl,driveUrl:canonicalFolderUrl,driveRepository:'Google Drive',driveLinkedAt:new Date().toISOString()},{merge:true});
    const folderReadback=await target.ref.get(),folderRow=folderReadback.exists?(folderReadback.data()||{}):{};
    if(clean(folderRow.driveFolderId,160)!==clientFolderId)throw new HttpsError('internal','Drive guardó el archivo, pero no se confirmó el vínculo documental del cliente.');
  }
  await audit(tenantId,actor,provisional?'drive.document_stage':'drive.document_upload',{clientId,documentRef:uploaded.id,outcome:'ok'},previewOnly);
  return{ok:true,status:provisional?'staged':'disponible',provisional,documentRef:uploaded.id,fileId:uploaded.id,nombre:uploaded.name||safeName(input.name),mimeType:uploaded.mimeType||mime,size:Number(uploaded.size||bytes.length),driveUrl:uploaded.webViewLink||readback.webViewLink||('https://drive.google.com/file/d/'+uploaded.id+'/view'),externalUrl:uploaded.webViewLink||readback.webViewLink||('https://drive.google.com/file/d/'+uploaded.id+'/view'),folderId:uploadDestination.id,stagingFolderId:provisional?uploadDestination.id:'',clientFolderId,clientFolderUrl:canonicalFolderUrl,contentHash,repository:'Google Drive',actorUid:actor.uid,activeRole:actor.activeRole,driveUserEmail:clean(vault.googleAccountEmail,320),previewIsolated:previewOnly===true,canonicalReadback:true,backendPersistent:true,version:VERSION};
}
async function moveDriveFile(fileId,fromParent,toParent,accessToken){
  const query='?addParents='+encodeURIComponent(toParent)+'&removeParents='+encodeURIComponent(fromParent)+'&fields=id,name,mimeType,parents,webViewLink,trashed&supportsAllDrives=true';
  return driveFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(fileId)+query,{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'},accessToken);
}
async function finalizeDocument(request,previewOnly){
  const input=request.data||{},tenantId=__productOperationalDomain.cleanId(input.tenantId,'tenantId');
  const target=await authorizeTarget(request,tenantId,input,'write'),clientId=target.clientId;
  if(previewOnly===true&&!previewSyntheticClient(clientId))throw new HttpsError('permission-denied','Preview documental automatizado solo admite expedientes sintéticos autorizados.');
  const fileId=clean(input.documentRef||input.fileId||input.archivoRef,180)||driveIdFromUrl(input.driveUrl||input.externalUrl||input.url||'');
  const clientFolderId=clean(input.clientFolderId,180),stagingFolderId=clean(input.stagingFolderId||input.folderId,180);
  if(!fileId||!clientFolderId||!stagingFolderId)throw new HttpsError('invalid-argument','Referencia provisional incompleta.');
  const auth=await tenantDriveToken(tenantId,previewOnly),accessToken=auth.accessToken,meta=await getMeta(fileId,accessToken),parents=Array.isArray(meta&&meta.parents)?meta.parents:[];
  if(!meta||meta.trashed===true||!parents.includes(stagingFolderId))throw new HttpsError('failed-precondition','El documento provisional no está en la etapa autorizada.');
  const moved=stagingFolderId===clientFolderId?meta:await moveDriveFile(fileId,stagingFolderId,clientFolderId,accessToken);
  if(!moved||!Array.isArray(moved.parents)||!moved.parents.includes(clientFolderId))throw new HttpsError('internal','Drive no confirmó el vínculo final del documento.');
  const canonicalFolderUrl='https://drive.google.com/drive/folders/'+clientFolderId;
  await target.ref.set({driveFolderId:clientFolderId,driveLink:canonicalFolderUrl,driveUrl:canonicalFolderUrl,driveRepository:'Google Drive',driveLinkedAt:new Date().toISOString()},{merge:true});
  const rb=await target.ref.get(),row=rb.exists?(rb.data()||{}):{};
  if(clean(row.driveFolderId,180)!==clientFolderId)throw new HttpsError('internal','No fue posible confirmar el vínculo documental del expediente.');
  await audit(tenantId,target.actor,'drive.document_finalize',{clientId,documentRef:fileId,outcome:'ok'},previewOnly);
  return{ok:true,status:'finalized',documentRef:fileId,fileId,clientFolderId,canonicalReadback:true,backendPersistent:true,previewIsolated:previewOnly===true};
}
async function quarantineDocument(request,previewOnly){
  const input=request.data||{},tenantId=__productOperationalDomain.cleanId(input.tenantId,'tenantId');
  const target=await authorizeTarget(request,tenantId,input,'write'),clientId=target.clientId;
  if(previewOnly===true&&!previewSyntheticClient(clientId))throw new HttpsError('permission-denied','Preview documental automatizado solo admite expedientes sintéticos autorizados.');
  const fileId=clean(input.documentRef||input.fileId||input.archivoRef,180)||driveIdFromUrl(input.driveUrl||input.externalUrl||input.url||'');
  const clientFolderId=clean(input.clientFolderId,180),stagingFolderId=clean(input.stagingFolderId||input.folderId,180);
  if(!fileId||!clientFolderId||!stagingFolderId)throw new HttpsError('invalid-argument','Referencia provisional incompleta.');
  const auth=await tenantDriveToken(tenantId,previewOnly),accessToken=auth.accessToken,meta=await getMeta(fileId,accessToken),parents=Array.isArray(meta&&meta.parents)?meta.parents:[];
  if(!meta||meta.trashed===true)throw new HttpsError('not-found','Documento provisional no disponible.');
  if(!parents.includes(stagingFolderId))return{ok:true,status:'already_outside_staging',documentRef:fileId,fileId,quarantined:false,backendPersistent:true};
  const quarantine=await ensureFolder(clientFolderId,'_PAGOS_REQUIEREN_RECUPERACION',accessToken);
  const moved=await moveDriveFile(fileId,stagingFolderId,quarantine.id,accessToken);
  if(!moved||!Array.isArray(moved.parents)||!moved.parents.includes(quarantine.id))throw new HttpsError('internal','Drive no confirmó la cuarentena documental.');
  await audit(tenantId,target.actor,'drive.document_quarantine',{clientId,documentRef:fileId,outcome:'quarantined'},previewOnly);
  return{ok:true,status:'quarantined',documentRef:fileId,fileId,quarantineFolderId:quarantine.id,quarantined:true,backendPersistent:true,previewIsolated:previewOnly===true};
}

async function readDocument(request,previewOnly,downloadMode){
  const authz=await authorizeDocument(request,previewOnly,'read'),auth=await tenantDriveToken(authz.tenantId,previewOnly),accessToken=auth.accessToken;
  const meta=await getMeta(authz.fileId,accessToken);
  if(!meta||meta.trashed===true)throw new HttpsError('not-found','Documento no disponible en Drive.');
  const parents=Array.isArray(meta.parents)?meta.parents:[],clientFolderId=clean(authz.target.row&&authz.target.row.driveFolderId,180);
  if(clientFolderId&&parents.length&&!parents.includes(clientFolderId))throw new HttpsError('permission-denied','El documento no pertenece a la carpeta del cliente autorizado.');
  if(meta.capabilities&&meta.capabilities.canDownload===false)throw new HttpsError('permission-denied','Drive no permite descargar este documento.');
  const bytes=await driveBinary(authz.fileId,accessToken),mime=clean(meta.mimeType,160)||'application/octet-stream';
  const previewAvailable=/^(application\/pdf|image\/|text\/)/i.test(mime);
  await audit(authz.tenantId,authz.target.actor,downloadMode?'drive.document_download':'drive.document_read',{clientId:authz.target.clientId,documentRef:authz.fileId,outcome:'ok'},previewOnly);
  return{ok:true,status:'disponible',documentRef:authz.fileId,fileId:authz.fileId,nombre:safeName(meta.name||'Documento'),mimeType:mime,size:bytes.length,base64:bytes.toString('base64'),previewAvailable:downloadMode?false:previewAvailable,downloadAvailable:true,externalUrl:meta.webViewLink||('https://drive.google.com/file/d/'+authz.fileId+'/view'),driveUrl:meta.webViewLink||('https://drive.google.com/file/d/'+authz.fileId+'/view'),backendPersistent:true,previewIsolated:previewOnly===true};
}

const PROD={region:REGION,cors:true,serviceAccount:SERVICE_ACCOUNT,secrets:[DRIVE_OAUTH_CLIENT_PRODUCTION_SECRET]};
const PREVIEW={region:PREVIEW_REGION,cors:true,serviceAccount:SERVICE_ACCOUNT,secrets:[DRIVE_OAUTH_CLIENT_PREVIEW_SECRET]};
exports.orbit360DocumentDriveStatus = onCall(Object.assign({},PROD,{timeoutSeconds:30,memory:'256MiB'}),r=>status(r,false));
exports.orbit360DocumentDriveUpload = onCall(Object.assign({},PROD,{timeoutSeconds:90,memory:'512MiB'}),r=>upload(r,false));
exports.orbit360DocumentDriveRead = onCall(Object.assign({},PROD,{timeoutSeconds:60,memory:'512MiB'}),r=>readDocument(r,false,false));
exports.orbit360DocumentDriveDownload = onCall(Object.assign({},PROD,{timeoutSeconds:60,memory:'512MiB'}),r=>readDocument(r,false,true));
exports.orbit360DocumentDriveFinalize = onCall(Object.assign({},PROD,{timeoutSeconds:60,memory:'256MiB'}),r=>finalizeDocument(r,false));
exports.orbit360DocumentDriveQuarantine = onCall(Object.assign({},PROD,{timeoutSeconds:60,memory:'256MiB'}),r=>quarantineDocument(r,false));
exports.orbit360DocumentDriveBootstrap = onCall(Object.assign({},PROD,{timeoutSeconds:60,memory:'256MiB'}),r=>bootstrap(r,false));
exports.orbit360DocumentDriveStatusPreview = onCall(Object.assign({},PREVIEW,{timeoutSeconds:30,memory:'256MiB'}),r=>status(r,true));
exports.orbit360DocumentDriveUploadPreview = onCall(Object.assign({},PREVIEW,{timeoutSeconds:90,memory:'512MiB'}),r=>upload(r,true));
exports.orbit360DocumentDriveReadPreview = onCall(Object.assign({},PREVIEW,{timeoutSeconds:60,memory:'512MiB'}),r=>readDocument(r,true,false));
exports.orbit360DocumentDriveDownloadPreview = onCall(Object.assign({},PREVIEW,{timeoutSeconds:60,memory:'512MiB'}),r=>readDocument(r,true,true));
exports.orbit360DocumentDriveFinalizePreview = onCall(Object.assign({},PREVIEW,{timeoutSeconds:60,memory:'256MiB'}),r=>finalizeDocument(r,true));
exports.orbit360DocumentDriveQuarantinePreview = onCall(Object.assign({},PREVIEW,{timeoutSeconds:60,memory:'256MiB'}),r=>quarantineDocument(r,true));
exports.orbit360DocumentDriveBootstrapPreview = onCall(Object.assign({},PREVIEW,{timeoutSeconds:60,memory:'256MiB'}),r=>bootstrap(r,true));
exports.__documentDriveDomain=Object.freeze({VERSION,ROOT_BY_TENANT,MAX_BYTES,ALLOWED_MIME,oauthDelegated:false,tenantPersistentBackend:true,credentialStore:'SecretManager',serviceAccount:SERVICE_ACCOUNT});
