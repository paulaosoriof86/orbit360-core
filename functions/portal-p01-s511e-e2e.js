'use strict';

const crypto=require('node:crypto');
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {getAuth}=require('firebase-admin/auth');

const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const REGION='us-central1';
const FUNCTION_URL='https://'+REGION+'-'+PROJECT_ID+'.cloudfunctions.net/portalP01ReadOnlyS511E';
const RUN=String(process.env.GITHUB_RUN_ID||Date.now());
const suffix=crypto.createHash('sha256').update(RUN).digest('hex').slice(0,14);
const email='portal-s511e-'+suffix+'@example.invalid';
const email2='portal-s511e-unverified-'+suffix+'@example.invalid';
const password='Synthetic-S511E-'+suffix+'!';
const clientId='s511e_cli_'+suffix;
const policyId='s511e_pol_'+suffix;
const insurerId='s511e_asg_'+suffix;
const docId='s511e_doc_'+suffix;

function refs(db,uid){return {
  grant:db.collection('tenants').doc(TENANT_ID).collection('portalCustomerAccessGrants').doc(uid),
  client:db.collection('tenants').doc(TENANT_ID).collection('data').doc('clientes').collection('items').doc(clientId),
  policy:db.collection('tenants').doc(TENANT_ID).collection('data').doc('polizas').collection('items').doc(policyId),
  insurer:db.collection('tenants').doc(TENANT_ID).collection('data').doc('aseguradoras').collection('items').doc(insurerId),
  document:db.collection('tenantId').doc(TENANT_ID).collection('documentos').doc(docId),
  staff:db.collection('tenants').doc(TENANT_ID).collection('members').doc(uid)
};}

async function apiKey(){
  const r=await fetch('https://'+PROJECT_ID+'.web.app/__/firebase/init.json',{headers:{'cache-control':'no-cache'}});
  if(!r.ok)throw new Error('FIREBASE_INIT_UNAVAILABLE');
  const j=await r.json();
  if(!j.apiKey)throw new Error('FIREBASE_API_KEY_MISSING');
  return j.apiKey;
}

async function signIn(key,userEmail,userPassword){
  const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+encodeURIComponent(key),{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:userEmail,password:userPassword,returnSecureToken:true})
  });
  const j=await r.json();
  if(!r.ok||!j.idToken)throw new Error('SYNTHETIC_SIGNIN_FAILED');
  return j.idToken;
}

async function callPortal(token,data){
  const r=await fetch(FUNCTION_URL,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify({data:data||{}})});
  const text=await r.text();
  let j={};try{j=JSON.parse(text||'{}');}catch{}
  return {httpStatus:r.status,ok:r.ok,body:j};
}

async function cleanup(db,auth,uid,uid2){
  if(uid){const r=refs(db,uid);const batch=db.batch();for(const ref of [r.grant,r.client,r.policy,r.insurer,r.document,r.staff]){const s=await ref.get();if(s.exists)batch.delete(ref);}await batch.commit();}
  for(const id of [uid,uid2].filter(Boolean)){try{await auth.deleteUser(id);}catch(e){}}
}

async function main(){
  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'';
  if(project!==PROJECT_ID)throw new Error('WRONG_PROJECT');
  const app=getApps()[0]||initializeApp({projectId:PROJECT_ID});
  const db=getFirestore(app),auth=getAuth(app);
  let uid='',uid2='';
  try{
    const u=await auth.createUser({email,password,emailVerified:true,disabled:false});uid=u.uid;
    const u2=await auth.createUser({email:email2,password,emailVerified:false,disabled:false});uid2=u2.uid;
    const r=refs(db,uid);
    await r.grant.set({grantId:uid,tenantId:TENANT_ID,identitySubject:uid,clientIds:[clientId],status:'active',issuedAt:'2026-10-07T17:45:00Z',expiresAt:'2026-10-08T17:45:00Z',issuedByRef:'synthetic-rehearsal',issueReason:'S5.11E E2E',version:1,revokedAt:'',revokedByRef:'',revocationReason:''});
    await r.client.set({id:clientId,nombre:'Synthetic Portal Customer',pais:'GT',tipo:'Persona'});
    await r.insurer.set({id:insurerId,nombre:'Synthetic Insurer'});
    await r.policy.set({id:policyId,clienteId:clientId,numero:'SYN-POL-E2E',ramo:'Vehículos',producto:'Vehículo / Movilidad',estado:'Vigente',aseguradoraId:insurerId,inicio:'2026-01-01',vence:'2027-01-01'});
    await r.document.set({id:docId,clienteId:clientId,nombre:'Synthetic document',tipo:'Póliza',fecha:'2026-01-01',storagePath:'synthetic/secure/path'});
    if((await r.staff.get()).exists)throw new Error('SYNTHETIC_CUSTOMER_IS_STAFF');

    const key=await apiKey();
    const token=await signIn(key,email,password);
    const token2=await signIn(key,email2,password);
    const success=await callPortal(token,{accountRef:clientId});
    if(!success.ok||!success.body.result||success.body.result.readOnly!==true)throw new Error('CALLABLE_SUCCESS_PATH_FAILED');
    const result=success.body.result;
    if(result.projection.account.clientRef!==clientId||result.projection.policies.length!==1||result.projection.documents.length!==1)throw new Error('CALLABLE_PROJECTION_FAILED');
    if(Object.prototype.hasOwnProperty.call(result.projection.documents[0],'storagePath'))throw new Error('CALLABLE_RAW_STORAGE_EXPOSED');

    const outside=await callPortal(token,{accountRef:'outside-client'});
    const injected=await callPortal(token,{requestedClientId:clientId});
    const unverified=await callPortal(token2,{});
    if(outside.ok||injected.ok||unverified.ok)throw new Error('CALLABLE_NEGATIVE_PATH_FAILED');

    await r.staff.set({uid,status:'active',active:true,roles:['SuperAdmin'],activeRole:'SuperAdmin',synthetic:true});
    const staffReuse=await callPortal(token,{accountRef:clientId});
    if(staffReuse.ok)throw new Error('STAFF_REUSE_NOT_DENIED');
    await r.staff.delete();

    console.log(JSON.stringify({
      schemaVersion:'ays-portal-p01-s511e-e2e-v1',
      syntheticOnly:true,customerDataUsed:false,productionTouched:false,
      functionInvoked:true,verifiedEmailSuccess:true,grantResolved:true,accountProjected:true,policyProjected:true,documentProjected:true,rawStorageExcluded:true,
      outsideAccountDenied:true,browserClientIdDenied:true,unverifiedEmailDenied:true,staffSessionReuseDenied:true,
      paymentsExcluded:result.projection.excluded.payments===true,claimsTransactionsExcluded:result.projection.excluded.claimsTransactions===true,uploadsExcluded:result.projection.excluded.uploads===true,policyChangesExcluded:result.projection.excluded.policyChanges===true
    },null,2));
  }finally{
    await cleanup(db,auth,uid,uid2);
  }
}

main().catch(e=>{console.error(JSON.stringify({ok:false,syntheticOnly:true,customerDataUsed:false,productionTouched:false,error:String(e&&e.message||e).slice(0,180)}));process.exit(1);});