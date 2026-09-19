'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
if(!getApps().length)initializeApp();
const db=getFirestore(),REGION='us-central1';
const text=(v,m=400)=>String(v==null?'':v).trim().slice(0,m);
function tenant(v){v=text(v,120);if(!/^[A-Za-z0-9_-]{2,80}$/.test(v))throw new HttpsError('invalid-argument','EMPRESA_INVALIDA');return v;}
function roles(m){return[...new Set([].concat(m?.roles||[],m?.rolesAsignados||[],m?.assignedRoles||[],m?.role||[],m?.rol||[],m?.rolDefault||[],m?.defaultRole||[],m?.activeRole||[]).map(x=>text(x,80)).filter(Boolean))];}
function norm(v){return text(v,80).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');}
function manager(m){return roles(m).some(r=>['direccion','superadmin','admintenant','admin'].includes(norm(r)));}
function image(v){v=text(v,360000);if(!v)return'';if(/^assets\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|svg)$/i.test(v)&&!v.includes('..'))return v;if(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(v)&&v.length<=350000)return v;throw new HttpsError('invalid-argument','IMAGEN_INVALIDA');}
function publicRow(row){row=row||{};return{schemaVersion:'orbit360-tenant-branding-v1',displayName:text(row.displayName,120),legalName:text(row.legalName,180),logo:text(row.logo,350000),favicon:text(row.favicon,350000)};}
async function activeMember(tid,uid){const s=await db.collection('tenants').doc(tid).collection('members').doc(uid).get();if(!s.exists)throw new HttpsError('permission-denied','MEMBRESIA_NO_DISPONIBLE');const m=s.data()||{},st=norm(m.status||m.estado||'active');if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(st))throw new HttpsError('permission-denied','MEMBRESIA_INACTIVA');return m;}
exports.orbit360TenantBranding=onCall({region:REGION,cors:true,timeoutSeconds:30,memory:'256MiB'},async request=>{
  const data=request.data||{},tid=tenant(data.tenantId),action=norm(data.action||'get'),ref=db.collection('tenants').doc(tid).collection('config').doc('branding');
  if(action==='get'){const s=await ref.get();return{ok:true,tenantId:tid,branding:s.exists?publicRow(s.data()):null,source:s.exists?'tenant-config-live':'tenant-config-missing'};}
  if(action!=='save')throw new HttpsError('invalid-argument','ACCION_INVALIDA');
  if(!request.auth||!request.auth.uid)throw new HttpsError('unauthenticated','AUTENTICACION_REQUERIDA');
  const member=await activeMember(tid,request.auth.uid);if(!manager(member))throw new HttpsError('permission-denied','PERMISO_INSUFICIENTE');
  const patch=data.patch||{},eventRef=db.collection('tenants').doc(tid).collection('configEvents').doc();
  await db.runTransaction(async tx=>{
    const s=await tx.get(ref),before=s.exists?(s.data()||{}):{},next={
      schemaVersion:'orbit360-tenant-branding-v1',
      displayName:Object.prototype.hasOwnProperty.call(patch,'displayName')?text(patch.displayName,120):text(before.displayName,120),
      legalName:Object.prototype.hasOwnProperty.call(patch,'legalName')?text(patch.legalName,180):text(before.legalName,180),
      logo:Object.prototype.hasOwnProperty.call(patch,'logo')?image(patch.logo):text(before.logo,350000),
      favicon:Object.prototype.hasOwnProperty.call(patch,'favicon')?image(patch.favicon):text(before.favicon,350000),
      updatedAt:FieldValue.serverTimestamp(),updatedBy:request.auth.uid
    };
    if(!next.displayName)throw new HttpsError('invalid-argument','NOMBRE_REQUERIDO');
    tx.set(ref,next,{merge:false});
    tx.set(eventRef,{schemaVersion:'orbit360-branding-config-event-v1',tenantId:tid,action:'SAVE',actorUid:request.auth.uid,reason:text(data.reason,300),changedFields:Object.keys(patch).filter(k=>['displayName','legalName','logo','favicon'].includes(k)),createdAt:FieldValue.serverTimestamp(),containsPII:false},{merge:false});
  });
  const confirmed=await ref.get();
  if(!confirmed.exists)throw new HttpsError('internal','LECTURA_CANONICA_FALLIDA');
  return{ok:true,tenantId:tid,branding:publicRow(confirmed.data()),source:'tenant-config-live',canonicalReadback:true};
});