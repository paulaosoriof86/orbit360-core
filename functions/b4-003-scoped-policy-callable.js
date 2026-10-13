'use strict';
// B4-003 PREVIEW-ONLY CANDIDATE. Not exported from functions/bootstrap.
// Do NOT expose until signed active-role attestation and Firestore Rules denial
// are independently verified. Firestore writes and live targets are excluded.
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {HttpsError,onCall}=require('firebase-functions/v2/https');
const {scopedPolicyRead}=require('./b4-003-scoped-policy-reader');
const {readScopedRelatedDocument}=require('./b4-003-scoped-related-reader');
const {Denied}=require('./b4-003-scoped-access-boundary');
const REGION='us-east1';
const db=getFirestore(getApps()[0]||initializeApp());
async function handle(request){
  try {
    if(!request||!request.auth||!request.auth.uid)
      throw new HttpsError('unauthenticated','AUTH_REQUIRED');
    const sourceRequest=request.data||{};
    const selectedCollection=String(sourceRequest.collection||'polizas').trim();
    const result=selectedCollection==='polizas'
      ? await scopedPolicyRead({db,auth:request.auth,request:sourceRequest})
      : await readScopedRelatedDocument({db,auth:request.auth,request:sourceRequest});
    if(!result||result.serverScoped!==true||result.collection!==selectedCollection||result.ok!==true)
      throw new HttpsError('internal','SCOPED_READ_POSTCONDITION_FAILED');
    return result;
  }catch(e){
    if(e instanceof HttpsError)throw e;
    if(e instanceof Denied)throw new HttpsError(
      e.code==='AUTH_REQUIRED'?'unauthenticated':'permission-denied',e.code);
    // Do not leak policy data or internal exception details to browser.
    throw new HttpsError('internal','SCOPED_DOCUMENT_READ_UNAVAILABLE');
  }
}
module.exports={orbit360ScopedPolicyReadPreview:onCall({
  region:REGION,cors:true,maxInstances:2,memory:'256MiB'
},handle)};
