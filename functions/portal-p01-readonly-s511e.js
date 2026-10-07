'use strict';

const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {HttpsError,onCall}=require('firebase-functions/v2/https');
const p=require('./portal-p01-readonly-contract-s511');

const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const REGION='us-central1';
const VERSION='ays-portal-p01-s511e-protected-readonly-v1';

const app=getApps()[0]||initializeApp({projectId:PROJECT_ID});
const db=getFirestore(app);

function clean(v,m=300){return String(v==null?'':v).trim().slice(0,m);}

async function staffMemberExists(uid){
  const s=await db.collection('tenants').doc(TENANT_ID).collection('members').doc(uid).get();
  return s.exists;
}

function deps(){
  return {
    loadGrant:async uid=>{const s=await db.collection('tenants').doc(TENANT_ID).collection('portalCustomerAccessGrants').doc(uid).get();return s.exists?s.data():null;},
    loadClient:async id=>{const s=await db.collection('tenants').doc(TENANT_ID).collection('data').doc('clientes').collection('items').doc(id).get();return s.exists?{id:s.id,...s.data()}:null;},
    loadPolicies:async id=>{const s=await db.collection('tenants').doc(TENANT_ID).collection('data').doc('polizas').collection('items').where('clienteId','==',id).get();return s.docs.map(d=>({id:d.id,...d.data()}));},
    loadInsurers:async()=>{const s=await db.collection('tenants').doc(TENANT_ID).collection('data').doc('aseguradoras').collection('items').get();return s.docs.map(d=>({id:d.id,...d.data()}));},
    loadDocuments:async id=>{const s=await db.collection('tenantId').doc(TENANT_ID).collection('documentos').where('clienteId','==',id).get();return s.docs.map(d=>({id:d.id,...d.data()}));}
  };
}

async function handler(request){
  const auth=request&&request.auth;
  if(!auth||!auth.uid)throw new HttpsError('unauthenticated','Se requiere autenticación.');
  if(await staffMemberExists(auth.uid))throw new HttpsError('permission-denied','La identidad de staff no puede reutilizarse como PortalIdentity.');
  const token=auth.token||{};
  const provider=clean(token.firebase&&token.firebase.sign_in_provider||'firebase_auth_external_customer',80);
  const result=await p.makeReadOnlyHandler(deps(),{
    authUid:auth.uid,
    emailVerified:token.email_verified===true,
    provider,
    accountRef:clean(request.data&&request.data.accountRef,180),
    requestedClientId:clean(request.data&&request.data.requestedClientId,180),
    nowIso:new Date().toISOString()
  });
  if(!result.ok){
    const map={AUTH_REQUIRED:'unauthenticated',IDENTITY_DENY:'permission-denied',GRANT_DENY:'permission-denied',BROWSER_CLIENT_ID_DENY:'invalid-argument',ACCOUNT_SCOPE_DENY:'permission-denied',ACCOUNT_SCOPE_EMPTY:'failed-precondition',CLIENT_NOT_FOUND_OR_SCOPE_MISMATCH:'not-found'};
    throw new HttpsError(map[result.code]||'failed-precondition',result.code);
  }
  return {schemaVersion:VERSION,readOnly:true,tenantId:TENANT_ID,accountRef:result.accountRef,allowedAccountRefs:result.allowedAccountRefs,projection:result.projection};
}

const portalP01ReadOnlyS511E=onCall({region:REGION,cors:true,timeoutSeconds:30,memory:'256MiB'},handler);

module.exports=Object.freeze({VERSION,PROJECT_ID,TENANT_ID,REGION,deps,staffMemberExists,handler,portalP01ReadOnlyS511E});