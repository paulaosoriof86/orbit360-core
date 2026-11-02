'use strict';
// B4-003 physical index migration PLAN ONLY. Never writes, never prints IDs,
// names, UIDs, emails, raw records, or per-record patches. The migration itself
// requires a separately approved backup/rollback/verification workflow.
const fs=require('node:fs');
const {country,resolveClientCountry}=require('../functions/b4-003-client-country-authority');
const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const MAX={clients:2500,policies:5000,insurers:1000,policiesPerClient:100};
const PHYSICAL_READ_LIMITS=Object.freeze({
 clientes:MAX.clients,polizas:MAX.policies,aseguradoras:MAX.insurers
});
const clean=x=>String(x==null?'':x).trim();
const inc=(obj,key)=>{obj[key]=(obj[key]||0)+1;};
function physicalReadLimit(collection){
 const limit=PHYSICAL_READ_LIMITS[collection];
 if(!Number.isSafeInteger(limit)||limit<1)throw Error('DRYRUN_READ_COLLECTION_NOT_ALLOWLISTED');
 return limit;
}
function planCountryIndex({clients,policies,insurers,tenantId}){
 for(const [key,rows] of Object.entries({clients,policies,insurers})){
  if(!Array.isArray(rows)||rows.length>MAX[key])throw Error('DRYRUN_READ_BOUND_'+key.toUpperCase());
 }
 if(!clean(tenantId))throw Error('DRYRUN_TENANT_REQUIRED');
 const linked=new Map(),byInsurer=new Map();
 for(const insurer of insurers){
  const id=clean(insurer.id);
  if(!id||byInsurer.has(id))throw Error('DRYRUN_INSURER_IDENTITY_INVALID');
  byInsurer.set(id,insurer);
 }
 for(const policy of policies){
  const id=clean(policy.clienteId||policy.clientId);
  if(!id)throw Error('DRYRUN_POLICY_CLIENT_REQUIRED');
  if(!linked.has(id))linked.set(id,[]);
  linked.get(id).push(policy);
 }
 const byClient=new Set();
 const result={schema:'GRAVICENTRA_B4003_CLIENT_COUNTRY_INDEX_DRYRUN_AGGREGATE_V1',
  mode:'REAL_READONLY_OR_SYNTHETIC_PLAN_NO_APPLY',tenant:tenantId,
  counts:{clients:clients.length,policies:policies.length,insurers:insurers.length},
  indexedAlready:{GT:0,CO:0},indexUpdateCandidates:{GT:0,CO:0},
  candidateAuthority:{client:0,insurer:0},
  unresolvable:{},perClientPolicyBoundExceeded:0,
  distinctPolicyRefsMissingClient:0,
  sourceCountryNotCanonical:0,crossBorderClientExplicitPreserved:0,
  requiresBackupAndRollback:true,requiresSignedRoleCountryUat:true,
  applyAuthorized:false,executablePatchesExported:false,
  writes:0,authWrites:0,rulesWrites:0,hostingDeploys:0,
  gate:'B4_003_HOLD',production:'NO_GO'};
 for(const client of clients){
  const id=clean(client.id);
  if(!id||byClient.has(id))throw Error('DRYRUN_CLIENT_IDENTITY_INVALID');
  byClient.add(id);
  if(client._sourceIdMismatch===true){
   inc(result.unresolvable,'CLIENT_DOCUMENT_ID_CONFLICT');continue;
  }
  const owned=linked.get(id)||[];
  if(owned.length>MAX.policiesPerClient){
   result.perClientPolicyBoundExceeded++;
   inc(result.unresolvable,'POLICY_SCAN_BOUND_EXCEEDED');
   continue;
  }
  const resolved=resolveClientCountry({client,clientId:id,tenantId,
   policies:owned,insurers:byInsurer,completePolicySet:true});
  if(resolved.status!=='resolved'){
   inc(result.unresolvable,resolved.reason);continue;
  }
  if(resolved.source==='client')result.candidateAuthority.client++;
  else result.candidateAuthority.insurer++;
  const indexed=clean(client.pais).toUpperCase();
  if(indexed===resolved.country)result.indexedAlready[resolved.country]++;
  else{
   result.indexUpdateCandidates[resolved.country]++;
   if(!['GT','CO'].includes(indexed))result.sourceCountryNotCanonical++;
  }
  if(resolved.source==='client'&&owned.some(p=>{
   const policyCountry=country(p.pais||p.country);
   return !!policyCountry&&policyCountry!==resolved.country;
  }))result.crossBorderClientExplicitPreserved++;
 }
 result.distinctPolicyRefsMissingClient=[...linked.keys()].filter(id=>!byClient.has(id)).length;
 const checked=result.indexedAlready.GT+result.indexedAlready.CO+
  result.indexUpdateCandidates.GT+result.indexUpdateCandidates.CO+
  Object.values(result.unresolvable).reduce((sum,n)=>sum+n,0);
 if(checked!==clients.length)throw Error('DRYRUN_COUNT_NOT_RECONCILED');
 return Object.freeze(result);
}
async function runRealReadOnly(){
 const credentialPath=process.env.GOOGLE_APPLICATION_CREDENTIALS;
 if(!credentialPath||!fs.existsSync(credentialPath))throw Error('DRYRUN_READONLY_CREDENTIAL_MISSING');
 const credential=JSON.parse(fs.readFileSync(credentialPath,'utf8'));
 if(credential.type!=='service_account'||credential.project_id!==PROJECT)
  throw Error('DRYRUN_PROJECT_NOT_ALLOWLISTED');
 const {initializeApp,cert,deleteApp}=require('firebase-admin/app');
 const {getFirestore}=require('firebase-admin/firestore');
 const app=initializeApp({credential:cert(credential),projectId:PROJECT},'b4003-index-dryrun');
 try{
  const tenant=getFirestore(app).collection('tenants').doc(TENANT);
  const read=async name=>{
   const limit=physicalReadLimit(name);
   const snapshot=await tenant.collection('data').doc(name).collection('items')
    .limit(limit+1).get();
   if(snapshot.size>limit)throw Error('DRYRUN_READ_BOUND_'+name.toUpperCase());
   return snapshot.docs.map(doc=>({...(doc.data()||{}),id:doc.id,
    _sourceIdMismatch:!!(doc.data()?.id&&clean(doc.data().id)!==doc.id)}));
  };
  const [clients,policies,insurers]=await Promise.all([
   read('clientes'),read('polizas'),read('aseguradoras')]);
  if(clients.length!==443||policies.length!==1425||insurers.length!==33)
   throw Error('DRYRUN_FROZEN_INPUT_COUNT_DRIFT');
  const result=planCountryIndex({clients,policies,insurers,tenantId:TENANT});
  console.log('B4_003_COUNTRY_INDEX_DRYRUN_READONLY='+JSON.stringify(result));
  console.log('B4_003_COUNTRY_INDEX_APPLY=NOT_AUTHORIZED B4_003_PRODUCTION=NO_GO writes=0');
 }finally{await deleteApp(app);}
}
if(require.main===module){
 if(process.argv.includes('--real-readonly'))runRealReadOnly().catch(e=>{
  console.error('B4_003_COUNTRY_INDEX_DRYRUN_BLOCKED '+clean(e.code||e.message).slice(0,140));
  process.exitCode=1;
 });
 else{console.error('B4_003_COUNTRY_INDEX_DRYRUN_REQUIRES_REAL_READONLY_FLAG');process.exitCode=2;}
}
module.exports=Object.freeze({planCountryIndex,physicalReadLimit});
