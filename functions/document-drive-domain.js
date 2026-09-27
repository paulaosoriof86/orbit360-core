'use strict';

const crypto = require('node:crypto');
const { GoogleAuth } = require('google-auth-library');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { __productOperationalDomain } = require('./product-operational-domain');
const { __opsLeadsProductDomain } = require('./product-ops-leads-domain');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const PREVIEW_REGION = 'us-east1';
const SERVICE_ACCOUNT = process.env.ORBIT360_DRIVE_SERVICE_ACCOUNT ||
  'orbit360-secrets-lab@ays-orbit-360-lab.iam.gserviceaccount.com';
const VERSION = 'gravicentra-drive-document-domain-v1';
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

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive'] });

function clean(v,max=500){return String(v==null?'':v).trim().slice(0,max);}
function safeName(v){return clean(v,180).replace(/[\\/:*?"<>|\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim()||'Documento';}
function driveIdFromUrl(v){
  const s=clean(v,1000);
  const m=s.match(/\/folders\/([A-Za-z0-9_-]{20,})/)||s.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  return m?m[1]:'';
}
function base64Bytes(encoded){
  const raw=String(encoded||'').replace(/^data:[^,]+,/,'').replace(/\s+/g,'');
  if(!raw)throw new HttpsError('invalid-argument','Archivo requerido.');
  let bytes;try{bytes=Buffer.from(raw,'base64');}catch(e){throw new HttpsError('invalid-argument','Archivo inválido.');}
  if(!bytes.length||bytes.length>MAX_BYTES)throw new HttpsError('invalid-argument','El archivo supera el límite de 15 MB.');
  return bytes;
}
async function token(){
  const client=await auth.getClient();
  const out=await client.getAccessToken();
  const value=typeof out==='string'?out:out&&out.token;
  if(!value)throw new HttpsError('unavailable','No fue posible obtener credencial de Drive.');
  return value;
}
async function driveFetch(url,options={}){
  const accessToken=await token();
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
async function getMeta(id){
  return driveFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=id,name,mimeType,parents,webViewLink,trashed,capabilities(canAddChildren,canEdit,canShare)&supportsAllDrives=true');
}
async function listChildFolder(parentId,name){
  const q="'"+parentId.replace(/'/g,"\\'")+"' in parents and trashed=false and mimeType='application/vnd.google-apps.folder' and name='"+name.replace(/'/g,"\\'")+"'";
  const url='https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&fields=files(id,name,mimeType,parents,webViewLink)&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=10';
  const body=await driveFetch(url);
  return Array.isArray(body.files)&&body.files.length?body.files[0]:null;
}
async function createFolder(parentId,name){
  return driveFetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,parents,webViewLink&supportsAllDrives=true',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:safeName(name),mimeType:'application/vnd.google-apps.folder',parents:[parentId]})
  });
}
async function ensureFolder(parentId,name){
  const found=await listChildFolder(parentId,name);
  return found||createFolder(parentId,name);
}
async function multipartUpload(parentId,fileName,mimeType,bytes){
  const boundary='orbit360_'+crypto.randomBytes(12).toString('hex');
  const metadata=JSON.stringify({name:safeName(fileName),parents:[parentId]});
  const prefix=Buffer.from('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+metadata+'\r\n--'+boundary+'\r\nContent-Type: '+mimeType+'\r\n\r\n');
  const suffix=Buffer.from('\r\n--'+boundary+'--\r\n');
  const body=Buffer.concat([prefix,bytes,suffix]);
  return driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,parents,webViewLink,size,md5Checksum&supportsAllDrives=true',{
    method:'POST',
    headers:{'Content-Type':'multipart/related; boundary='+boundary,'Content-Length':String(body.length)},
    body
  });
}

async function authorizeTarget(request,tenantId,input){
  const entity=clean(input.entidad||input.entity,80).toLowerCase();
  const requestedClientId=clean(input.clienteId||input.clientId,180);
  if(entity==='gestion'||entity==='gestiones'){
    const ops=__opsLeadsProductDomain;
    const authz=await ops.authorize(request,'update_management');
    if(authz.tenantId!==tenantId)throw new HttpsError('permission-denied','Tenant fuera de alcance.');
    const managementId=clean(input.entidadId||input.entityId,180);
    if(!managementId)throw new HttpsError('invalid-argument','Gestión requerida para adjuntar documentos.');
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
    return {actor:authz.actor,row:Object.assign({},snap.data()||{},{id:clientId,tenantId}),ref,clientId,management};
  }
  const clientId=__productOperationalDomain.cleanId(requestedClientId,'clienteId');
  const d=__productOperationalDomain;
  const actor=await d.authorize(request,tenantId,[{collection:'clientes'}]);
  const ref=d.canonicalRef(tenantId,'clientes',clientId);
  const snap=await ref.get();
  if(!snap.exists)throw new HttpsError('not-found','Cliente no encontrado.');
  const row=Object.assign({},snap.data()||{},{id:clientId,tenantId});
  if(!d.withinScope(actor,'clientes','cliente360',row))throw new HttpsError('permission-denied','El alcance activo no autoriza este cliente.');
  return {actor,row,ref,clientId};
}

async function upload(request,previewOnly){
  const input=request.data||{};
  const tenantId=__productOperationalDomain.cleanId(input.tenantId,'tenantId');
  const target=await authorizeTarget(request,tenantId,input);
  const clientId=target.clientId;
  if(previewOnly===true && !/^b2[-_]/i.test(clientId))throw new HttpsError('permission-denied','Preview solo admite clientes sintéticos B2.');
  const {actor,row}=target;
  const mime=clean(input.mimeType,160).toLowerCase();
  if(!ALLOWED_MIME.has(mime))throw new HttpsError('invalid-argument','Tipo de archivo no permitido.');
  const bytes=base64Bytes(input.base64);
  const contentHash=crypto.createHash('sha256').update(bytes).digest('hex');
  const rootId=ROOT_BY_TENANT[tenantId];
  if(!rootId)throw new HttpsError('failed-precondition','Repositorio Drive no configurado para el tenant.');
  await getMeta(rootId);

  let clientFolderId=clean(input.driveFolderId,160)||clean(row.driveFolderId,160)||driveIdFromUrl(row.driveLink||row.driveUrl||'');
  let clientFolder=null;
  if(clientFolderId){
    clientFolder=await getMeta(clientFolderId);
    if(clientFolder.mimeType!=='application/vnd.google-apps.folder')throw new HttpsError('failed-precondition','La referencia Drive del cliente no es una carpeta.');
  }else{
    clientFolder=await ensureFolder(rootId,row.nombre||row.razonSocial||clientId);
    clientFolderId=clientFolder.id;
  }

  let destination=clientFolder;
  if(previewOnly===true){
    const qaRoot=await ensureFolder(rootId,'_GRAVICENTRA_PREVIEW_QA');
    destination=await ensureFolder(qaRoot.id,clientId);
  }
  const uploaded=await multipartUpload(destination.id,input.name||'Documento',mime,bytes);
  const readback=await getMeta(uploaded.id);
  if(!readback||readback.id!==uploaded.id||readback.trashed===true)throw new HttpsError('internal','Drive no confirmó el archivo.');

  return {
    ok:true,
    status:'disponible',
    documentRef:uploaded.id,
    fileId:uploaded.id,
    nombre:uploaded.name||safeName(input.name),
    mimeType:uploaded.mimeType||mime,
    size:Number(uploaded.size||bytes.length),
    driveUrl:uploaded.webViewLink||readback.webViewLink||('https://drive.google.com/file/d/'+uploaded.id+'/view'),
    externalUrl:uploaded.webViewLink||readback.webViewLink||('https://drive.google.com/file/d/'+uploaded.id+'/view'),
    folderId:destination.id,
    clientFolderId,
    clientFolderUrl:'https://drive.google.com/drive/folders/'+clientFolderId,
    contentHash,
    repository:'Google Drive',
    actorUid:actor.uid,
    activeRole:actor.activeRole,
    previewIsolated:previewOnly===true,
    canonicalReadback:true,
    version:VERSION
  };
}

async function status(request,previewOnly){
  const input=request.data||{};
  const tenantId=__productOperationalDomain.cleanId(input.tenantId,'tenantId');
  if(!request.auth||!request.auth.uid)return {ok:false,available:false,status:'unauthenticated',message:'Se requiere sesión activa.'};
  const rootId=ROOT_BY_TENANT[tenantId];
  if(!rootId)return {ok:false,available:false,status:'pendiente_conexion',message:'Repositorio Drive no configurado.'};
  try{
    const meta=await getMeta(rootId);
    const writable=!!(meta&&meta.capabilities&&meta.capabilities.canAddChildren===true);
    if(!writable)return {ok:false,available:false,status:'pendiente_permiso_drive',message:'La cuenta de servicio puede ver el repositorio, pero no puede crear documentos dentro de la carpeta Clientes.',rootFolderId:meta.id,rootName:meta.name,previewIsolated:previewOnly===true,serviceAccount:SERVICE_ACCOUNT};
    return {ok:true,available:true,status:'disponible',rootFolderId:meta.id,rootName:meta.name,previewIsolated:previewOnly===true,serviceAccount:SERVICE_ACCOUNT};
  }catch(error){
    return {ok:false,available:false,status:'pendiente_conexion',message:'La cuenta de servicio no tiene acceso de escritura al repositorio Drive.',code:error&&error.code||'',serviceAccount:SERVICE_ACCOUNT};
  }
}

exports.orbit360DocumentDriveStatus = onCall({region:REGION,cors:true,timeoutSeconds:30,memory:'256MiB',serviceAccount:SERVICE_ACCOUNT},r=>status(r,false));
exports.orbit360DocumentDriveUpload = onCall({region:REGION,cors:true,timeoutSeconds:90,memory:'512MiB',serviceAccount:SERVICE_ACCOUNT},r=>upload(r,false));
exports.orbit360DocumentDriveStatusPreview = onCall({region:PREVIEW_REGION,cors:true,timeoutSeconds:30,memory:'256MiB',serviceAccount:SERVICE_ACCOUNT},r=>status(r,true));
exports.orbit360DocumentDriveUploadPreview = onCall({region:PREVIEW_REGION,cors:true,timeoutSeconds:90,memory:'512MiB',serviceAccount:SERVICE_ACCOUNT},r=>upload(r,true));
exports.__documentDriveDomain=Object.freeze({VERSION,ROOT_BY_TENANT,MAX_BYTES,ALLOWED_MIME});
