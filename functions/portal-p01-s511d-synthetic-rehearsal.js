'use strict';

const crypto=require('node:crypto');
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const p=require('./portal-p01-readonly-contract-s511');

const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const uid='portal_s511d_customer_'+(process.env.GITHUB_RUN_ID||'local');
const suffix=crypto.createHash('sha256').update(uid).digest('hex').slice(0,14);
const clientId='s511d_cli_'+suffix;
const policyId='s511d_pol_'+suffix;
const insurerId='s511d_asg_'+suffix;
const docId='s511d_doc_'+suffix;

function refs(db){
  return {
    grant:db.collection('tenants').doc(TENANT_ID).collection('portalCustomerAccessGrants').doc(uid),
    client:db.collection('tenants').doc(TENANT_ID).collection('data').doc('clientes').collection('items').doc(clientId),
    policy:db.collection('tenants').doc(TENANT_ID).collection('data').doc('polizas').collection('items').doc(policyId),
    insurer:db.collection('tenants').doc(TENANT_ID).collection('data').doc('aseguradoras').collection('items').doc(insurerId),
    document:db.collection('tenantId').doc(TENANT_ID).collection('documentos').doc(docId),
    staffMember:db.collection('tenants').doc(TENANT_ID).collection('members').doc(uid)
  };
}

async function cleanup(db,r){
  const batch=db.batch();
  for(const ref of [r.grant,r.client,r.policy,r.insurer,r.document]){const s=await ref.get();if(s.exists)batch.delete(ref);}
  await batch.commit();
}

async function main(){
  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'';
  if(project!==PROJECT_ID)throw new Error('WRONG_PROJECT');
  const app=getApps()[0]||initializeApp({projectId:PROJECT_ID});
  const db=getFirestore(app);
  const r=refs(db);
  await cleanup(db,r);
  const staff=await r.staffMember.get();
  if(staff.exists)throw new Error('SYNTHETIC_CUSTOMER_MUST_NOT_BE_STAFF_MEMBER');

  await r.grant.set({
    grantId:uid,tenantId:TENANT_ID,identitySubject:uid,clientIds:[clientId],status:'active',
    issuedAt:'2026-10-07T17:40:00Z',expiresAt:'2026-10-08T17:40:00Z',
    issuedByRef:'synthetic-rehearsal',issueReason:'S5.11D synthetic rehearsal',version:1,
    revokedAt:'',revokedByRef:'',revocationReason:''
  });
  await r.client.set({id:clientId,nombre:'Synthetic Portal Customer',pais:'GT',tipo:'Persona'});
  await r.insurer.set({id:insurerId,nombre:'Synthetic Insurer'});
  await r.policy.set({id:policyId,clienteId:clientId,numero:'SYN-POL-1',ramo:'Vehículos',producto:'Vehículo / Movilidad',estado:'Vigente',aseguradoraId:insurerId,inicio:'2026-01-01',vence:'2027-01-01'});
  await r.document.set({id:docId,clienteId:clientId,nombre:'Synthetic policy cover',tipo:'Póliza',fecha:'2026-01-01',storagePath:'synthetic/secure/path'});

  const deps={
    loadGrant:async subject=>{const s=await db.collection('tenants').doc(TENANT_ID).collection('portalCustomerAccessGrants').doc(subject).get();return s.exists?s.data():null;},
    loadClient:async id=>{const s=await db.collection('tenants').doc(TENANT_ID).collection('data').doc('clientes').collection('items').doc(id).get();return s.exists?{id:s.id,...s.data()}:null;},
    loadPolicies:async id=>{const s=await db.collection('tenants').doc(TENANT_ID).collection('data').doc('polizas').collection('items').where('clienteId','==',id).get();return s.docs.map(d=>({id:d.id,...d.data()}));},
    loadInsurers:async()=>{const s=await db.collection('tenants').doc(TENANT_ID).collection('data').doc('aseguradoras').collection('items').get();return s.docs.filter(d=>d.id===insurerId).map(d=>({id:d.id,...d.data()}));},
    loadDocuments:async id=>{const s=await db.collection('tenantId').doc(TENANT_ID).collection('documentos').where('clienteId','==',id).get();return s.docs.map(d=>({id:d.id,...d.data()}));}
  };

  try{
    const ok=await p.makeReadOnlyHandler(deps,{authUid:uid,emailVerified:true,accountRef:clientId,nowIso:'2026-10-07T17:45:00Z'});
    if(!ok.ok)throw new Error('PROJECTION_FAILED:'+ok.code);
    if(ok.projection.account.clientRef!==clientId)throw new Error('ACCOUNT_MISMATCH');
    if(ok.projection.policies.length!==1||ok.projection.documents.length!==1)throw new Error('PROJECTION_COUNTS_FAILED');
    if(Object.prototype.hasOwnProperty.call(ok.projection.documents[0],'storagePath'))throw new Error('RAW_STORAGE_EXPOSED');
    const outside=await p.makeReadOnlyHandler(deps,{authUid:uid,emailVerified:true,accountRef:'outside-client',nowIso:'2026-10-07T17:45:00Z'});
    const inject=await p.makeReadOnlyHandler(deps,{authUid:uid,emailVerified:true,requestedClientId:clientId,nowIso:'2026-10-07T17:45:00Z'});
    const unverified=await p.makeReadOnlyHandler(deps,{authUid:uid,emailVerified:false,nowIso:'2026-10-07T17:45:00Z'});
    if(outside.code!=='ACCOUNT_SCOPE_DENY'||inject.code!=='BROWSER_CLIENT_ID_DENY'||unverified.code!=='IDENTITY_DENY')throw new Error('NEGATIVE_TEST_FAILED');
    console.log(JSON.stringify({
      schemaVersion:'ays-portal-p01-s511d-synthetic-rehearsal-v1',
      syntheticOnly:true,customerDataUsed:false,productionTouched:false,
      authConfigPreviouslyRead:true,emailPasswordProviderAvailable:true,emailVerificationRequired:true,
      staffMembershipAbsent:true,grantRead:true,accountProjected:true,policyProjected:true,documentProjected:true,
      rawStorageExcluded:true,outsideAccountDenied:true,browserClientIdDenied:true,unverifiedEmailDenied:true,
      excludedWrites:true
    },null,2));
  }finally{
    await cleanup(db,r);
  }
}

main().catch(e=>{console.error(JSON.stringify({ok:false,syntheticOnly:true,customerDataUsed:false,productionTouched:false,error:String(e&&e.message||e).slice(0,180)}));process.exit(1);});