'use strict';
// B4-003 staged protected reader. The immutable backend package may contain
// both names, but the isolated Preview executor deploys ONLY the Preview name.
// The LIVE name must never be deployed until scoped Rules and the complete
// authenticated role/country/tenant security gate are independently certified.
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {HttpsError,onCall}=require('firebase-functions/v2/https');
const {scopedPolicyRead}=require('./b4-003-scoped-policy-reader');
const {readScopedRelatedDocument,readScopedRelatedList}=require('./b4-003-scoped-related-reader');
const {Denied}=require('./b4-003-scoped-access-boundary');
const {readBootstrap,readProtectedDirectory}=require('./b4-003-scoped-bootstrap-reader');
const REGION='us-east1';
const db=getFirestore(getApps()[0]||initializeApp());
async function handle(request){
  let auditCollection='unknown';
  try {
    if(!request||!request.auth||!request.auth.uid)
      throw new HttpsError('unauthenticated','AUTH_REQUIRED');
    const sourceRequest=request.data||{};
    const selectedCollection=String(sourceRequest.collection||'polizas').trim();
    auditCollection=/^[A-Za-z][A-Za-z0-9]{0,31}$/.test(selectedCollection)?selectedCollection:'invalid';
    const bootstrap=['bootstrap-membership','bootstrap-tenant-config'].includes(sourceRequest.mode);
    const result=bootstrap
      ? await readBootstrap({db,auth:request.auth,request:sourceRequest})
      : ['aseguradoras','asesores'].includes(selectedCollection)
        ? await readProtectedDirectory({db,auth:request.auth,request:sourceRequest})
      : selectedCollection==='polizas'
        ? await scopedPolicyRead({db,auth:request.auth,request:sourceRequest})
        : sourceRequest.mode==='list'
          ? await readScopedRelatedList({db,auth:request.auth,request:sourceRequest})
          : await readScopedRelatedDocument({db,auth:request.auth,request:sourceRequest});
    if(!result||result.ok!==true||result.serverScoped!==true||
      (bootstrap?(result.mode!==sourceRequest.mode||result.uid!==request.auth.uid||
        result.tenantId!==sourceRequest.tenantId):result.collection!==selectedCollection))
      throw new HttpsError('internal','SCOPED_READ_POSTCONDITION_FAILED');
    return result;
  }catch(e){
    if(e instanceof HttpsError){
      if(e.code==='permission-denied')
        console.warn('B4_003_SCOPED_POLICY_DENIED',{
          code:e.code,
          reason:/^[A-Z0-9_]{2,64}$/.test(e.message)?e.message:'UNSPECIFIED',
          collection:auditCollection
        });
      throw e;
    }
    if(e instanceof Denied){
      console.warn('B4_003_SCOPED_POLICY_DENIED',{code:e.code,collection:auditCollection});
      throw new HttpsError(e.code==='AUTH_REQUIRED'?'unauthenticated':'permission-denied',e.code);
    }
    // Do not leak policy data or internal exception details to browser.
    throw new HttpsError('internal','SCOPED_DOCUMENT_READ_UNAVAILABLE');
  }
}
const opts={region:REGION,cors:true,maxInstances:2,memory:'256MiB'};
module.exports={
  orbit360ScopedPolicyReadPreview:onCall(opts,handle),
  orbit360ScopedPolicyRead:onCall(opts,handle)
};
