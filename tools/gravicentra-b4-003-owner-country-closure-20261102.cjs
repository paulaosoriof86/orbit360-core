'use strict';
// B4-003: three explicit Direction country decisions after the 32-client
// insurer-backed correction. LAB-only. No names, IDs, UIDs or per-client data
// ever enter public CI/logs/artifacts; exact preimages stay in a Rules-denied
// private Firestore vault. All updates are one guarded transaction.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {resolveClientCountry}=require('../functions/b4-003-client-country-authority');
const {planCountryIndex,physicalReadLimit}=require('./gravicentra-b4-003-client-country-index-dryrun-readonly.cjs');
const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const BATCH='b4003-direction-country-closure-20261102';
const FIELDS=['pais','paisRequiereValidacion','paisFuente','countryRequiresValidation'];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const clean=x=>String(x==null?'':x).trim();
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
const fail=code=>{throw Error('OWNER_COUNTRY_STOP_'+code);};

const decisions=Object.freeze({
  country_missing:'GT',
  source_region_unreliable:'GT',
  source_geography_unreliable:'CO'
});
// Bind each Direction decision to the *specific* previously identified physical
// document, without shipping its ID/name to public GitHub source or CI output.
// A row with the same uncertain-country signature but a different identity
// must fail closed before the first write.
const OWNER_ID_HASHES=Object.freeze({
 country_missing:'eff5f0765336ea77e137fe36ea0ede5a6e298087035c4afb4085825391fa9fc7',
 source_region_unreliable:'570576d35ddf4e929e824ea0dcc79f20a84f280648c237b24731be6cc7ed7b13',
 source_geography_unreliable:'cc27d5139a26399d7a2b10f724a6cd7562bd7fd20c8ee425623eb51ab74148c7'
});

function selectOwnerDecisions({clients,policies,insurers},expectedIdHashes=OWNER_ID_HASHES){
 const insurerMap=new Map(insurers.map(row=>[clean(row.id),row]));
 const links=new Map();
 for(const p of policies){const id=clean(p.clienteId||p.clientId);if(!links.has(id))links.set(id,[]);links.get(id).push(p);}
 const unresolved=[];
 for(const c of clients){
  if(!c||!c.id||c._sourceIdMismatch===true||c.tenantId&&c.tenantId!==TENANT)fail('CLIENT_IDENTITY');
  const linked=links.get(c.id)||[];
  const r=resolveClientCountry({client:c,clientId:c.id,tenantId:TENANT,
   policies:linked,insurers:insurerMap,completePolicySet:true});
  if(r.status==='resolved')continue;
  if(r.reason!=='COMPLETE_POLICY_RELATION_REQUIRED'||linked.length)fail('OTHER_UNRESOLVED_CAUSE');
  unresolved.push(c);
 }
 if(unresolved.length!==3)fail('UNRESOLVED_CARDINALITY_CHANGED');
 const entries=[];
 for(const c of unresolved){
  const raw=clean(c.pais).toUpperCase(),source=clean(c.paisFuente).toLowerCase();
  const slot=raw==='REQUIERE_VALIDACION'?'country_missing':
   raw==='GT'&&c.paisRequiereValidacion===true&&source==='cod_region_ausente_o_no_confiable'?'source_region_unreliable':
   raw==='GT'&&c.paisRequiereValidacion===true&&source==='sin_evidencia_geografica_confiable'?'source_geography_unreliable':'';
  if(!slot||!decisions[slot])fail('OWNER_DECISION_SOURCE_NOT_UNIQUE');
  if(crypto.createHash('sha256').update(c.id).digest('hex')!==expectedIdHashes[slot])fail('OWNER_CLIENT_IDENTITY_CHANGED');
  const version=c._firestoreUpdateTime;
  if(!version||!Number.isSafeInteger(version.seconds)||!Number.isSafeInteger(version.nanoseconds))fail('VERSION_REQUIRED');
  const before=Object.fromEntries(FIELDS.map(key=>[key,{exists:own(c,key),value:own(c,key)?c[key]:null}]));
  if(before.pais.exists&&typeof before.pais.value!=='string')fail('PREVIOUS_COUNTRY_TYPE');
  const entry={clientId:c.id,slot,afterCountry:decisions[slot],before,
   versionSeconds:version.seconds,versionNanos:version.nanoseconds};
  const after={...c,...patchFor(entry)};
  const afterResult=resolveClientCountry({client:after,clientId:c.id,tenantId:TENANT,
   policies:[],insurers:insurerMap,completePolicySet:true});
  if(afterResult.status!=='resolved'||afterResult.source!=='client'||
     afterResult.country!==entry.afterCountry)fail('OWNER_DECISION_WOULD_NOT_CLOSE');
  entries.push(entry);
 }
 entries.sort((a,b)=>a.slot.localeCompare(b.slot));
 if(new Set(entries.map(e=>e.slot)).size!==3||new Set(entries.map(e=>e.clientId)).size!==3||
   entries.filter(e=>e.afterCountry==='GT').length!==2||entries.filter(e=>e.afterCountry==='CO').length!==1)
  fail('SLOT_BINDING_NOT_EXACT');
 return {entries,manifestDigest:digest(entries)};
}

function patchFor(entry){
 const patch={pais:entry.afterCountry,paisRequiereValidacion:false,
  paisFuente:'direccion_confirmada_20261102'};
 if(entry.before.countryRequiresValidation.exists)patch.countryRequiresValidation=false;
 return patch;
}
function restorePatch(entry,FieldValue){
 const patch={};
 for(const key of Object.keys(patchFor(entry))){
  const old=entry.before[key];
  patch[key]=old.exists?old.value:FieldValue.delete();
 }
 return patch;
}
function matchesBefore(data,entry){
 return FIELDS.every(key=>own(data,key)===entry.before[key].exists&&
  (!entry.before[key].exists||same(data[key],entry.before[key].value)));
}
function versionMatch(timestamp,entry){return !!timestamp&&timestamp.seconds===entry.versionSeconds&&timestamp.nanoseconds===entry.versionNanos;}
function approvedPost(aggregate){
 if(aggregate.counts?.clients!==443||aggregate.counts?.policies!==1425||aggregate.counts?.insurers!==33||
  aggregate.indexedAlready?.GT!==394||aggregate.indexedAlready?.CO!==49||
  aggregate.indexUpdateCandidates?.GT!==0||aggregate.indexUpdateCandidates?.CO!==0||
  Object.keys(aggregate.unresolvable||{}).length!==0||aggregate.distinctPolicyRefsMissingClient!==3||
  aggregate.candidateAuthority?.insurer!==64||aggregate.candidateAuthority?.client!==379)
   fail('POST_AGGREGATE_MISMATCH');
 return true;
}

async function run(mode){
 if(!['--preflight-readonly','--owner-approved-apply'].includes(mode))fail('MODE_DENIED');
 const credFile=process.env.GOOGLE_APPLICATION_CREDENTIALS;
 if(!credFile||!fs.existsSync(credFile))fail('LAB_CREDENTIAL_MISSING');
 const cred=JSON.parse(fs.readFileSync(credFile,'utf8'));
 if(cred.type!=='service_account'||cred.project_id!==PROJECT)fail('PROJECT_DENIED');
 const {initializeApp,cert,deleteApp}=require('firebase-admin/app');
 const {getFirestore,FieldValue}=require('firebase-admin/firestore');
 const app=initializeApp({credential:cert(cred),projectId:PROJECT},'b4003-direction-country');
 const db=getFirestore(app),tenant=db.collection('tenants').doc(TENANT);
 const vault=db.collection('__gravicentraPrivateMigrationVault').doc(BATCH);
 const read=async name=>{
  const lim=physicalReadLimit(name);
  const snap=await tenant.collection('data').doc(name).collection('items').limit(lim+1).get();
  if(snap.size>lim)fail('READ_LIMIT');
  return snap.docs.map(d=>({...d.data(),id:d.id,
   _sourceIdMismatch:!!(d.data()?.id&&clean(d.data().id)!==d.id),
   _firestoreUpdateTime:{seconds:d.updateTime.seconds,nanoseconds:d.updateTime.nanoseconds}}));
 };
 try{
  const [clients,policies,insurers]=await Promise.all([read('clientes'),read('polizas'),read('aseguradoras')]);
  if(clients.length!==443||policies.length!==1425||insurers.length!==33)fail('SOURCE_COUNTS_CHANGED');
  const agg=planCountryIndex({clients,policies,insurers,tenantId:TENANT});
  if(agg.indexedAlready?.GT!==392||agg.indexedAlready?.CO!==48||
   agg.indexUpdateCandidates?.GT!==0||agg.indexUpdateCandidates?.CO!==0||
   agg.unresolvable?.COMPLETE_POLICY_RELATION_REQUIRED!==3||
   agg.distinctPolicyRefsMissingClient!==3)fail('PREVIOUS_32_CORRECTIONS_NOT_VERIFIED');
  const exact=selectOwnerDecisions({clients,policies,insurers});
  console.log('B4_003_OWNER_COUNTRY_PREFLIGHT=PASS clients=443 policies=1425 insurers=33 decisions=3 GT=2 CO=1 orphanQA=3 identifiersExported=false');
  if(mode==='--preflight-readonly')return;
  if(process.env.GRAVICENTRA_B4003_DIRECTION_COUNTRY_APPROVAL_20261102!=='GT_GT_CO_APPROVED')fail('OWNER_APPLY_APPROVAL_MISSING');
  const backup={schema:'B4003_PRIVATE_DIRECTION_COUNTRY_BACKUP_V1',project:PROJECT,tenant:TENANT,
   manifestDigest:exact.manifestDigest,entries:exact.entries,sourceAggregateDigest:digest(agg),
   ownerDecisions:'GT_GT_CO_20261102',recoveryWindow:'PITR_7D',createdAt:FieldValue.serverTimestamp()};
  const existing=await vault.get();
  if(existing.exists)fail('BACKUP_VAULT_ALREADY_USED');
  await vault.create(backup);
  const check=await vault.get();
  if(!check.exists||check.data()?.manifestDigest!==exact.manifestDigest||
   !same(check.data()?.entries,exact.entries))fail('PRIVATE_BACKUP_READBACK');
  console.log('B4_003_OWNER_COUNTRY_PRIVATE_BACKUP=PASS preimages=3 rulesDeniedRootVault=true');

  const shadows=exact.entries.map(e=>vault.collection('restoreDrill').doc(e.slot));
  const stage=db.batch();
  for(let i=0;i<shadows.length;i++)stage.create(shadows[i],
   {...patchFor(exact.entries[i]),shadow:true,manifestDigest:exact.manifestDigest});
  await stage.commit();
  const restore=db.batch();
  for(let i=0;i<shadows.length;i++)restore.update(shadows[i],restorePatch(exact.entries[i],FieldValue));
  await restore.commit();
  const restored=await db.getAll(...shadows);
  if(restored.length!==3||restored.some((s,i)=>!s.exists||!matchesBefore(s.data(),exact.entries[i])||
   s.data()?.manifestDigest!==exact.manifestDigest))fail('SHADOW_RESTORE_READBACK');
  await vault.collection('events').doc('restore-drill').create({count:3,passed:true,manifestDigest:exact.manifestDigest,
   at:FieldValue.serverTimestamp()});
  console.log('B4_003_OWNER_COUNTRY_RESTORE_DRILL=PASS shadowRecords=3 realClientWrites=0');

  const refs=exact.entries.map(e=>tenant.collection('data').doc('clientes').collection('items').doc(e.clientId));
  const applied=vault.collection('events').doc('atomic-apply');
  await db.runTransaction(async tx=>{
   const [backupSnap,applySnap,...docs]=await Promise.all([tx.get(vault),tx.get(applied),...refs.map(r=>tx.get(r))]);
   if(!backupSnap.exists||backupSnap.data()?.manifestDigest!==exact.manifestDigest||applySnap.exists)fail('BACKUP_OR_REPLAY');
   for(let i=0;i<docs.length;i++)if(!docs[i].exists||!versionMatch(docs[i].updateTime,exact.entries[i])||
      !matchesBefore(docs[i].data(),exact.entries[i]))fail('CONCURRENT_RECORD_CHANGE');
   for(let i=0;i<docs.length;i++)tx.update(refs[i],patchFor(exact.entries[i]));
   tx.create(applied,{schema:'B4003_DIRECTION_COUNTRY_ATOMIC_APPLY_V1',manifestDigest:exact.manifestDigest,
    approvedDecisions:3,GT:2,CO:1,at:FieldValue.serverTimestamp()});
  });
  console.log('B4_003_OWNER_COUNTRY_ATOMIC_APPLY=COMMITTED updated=3 GT=2 CO=1');
  const [afterClients,afterPolicies,afterInsurers]=await Promise.all([read('clientes'),read('polizas'),read('aseguradoras')]);
  const after=planCountryIndex({clients:afterClients,policies:afterPolicies,insurers:afterInsurers,tenantId:TENANT});
  approvedPost(after);
  const versions=exact.entries.map(e=>{
   const row=afterClients.find(c=>c.id===e.clientId);
   if(!row||row.pais!==e.afterCountry||row.paisRequiereValidacion!==false||
    row.paisFuente!=='direccion_confirmada_20261102')fail('AFTER_READBACK');
   return {clientId:e.clientId,...row._firestoreUpdateTime};
  });
  await vault.collection('events').doc('post-apply-readback').create({schema:'B4003_DIRECTION_COUNTRY_POST_V1',
   manifestDigest:exact.manifestDigest,versions,correctlyIndexed:443,unresolved:0,orphanQA:3,
   at:FieldValue.serverTimestamp()});
  console.log('B4_003_OWNER_COUNTRY_POST_APPLY=PASS indexed=443 unresolved=0 orphanQA=3 policies=1425 production=HOLD');
 }finally{await deleteApp(app);}
}
if(require.main===module)run(process.argv[2]).catch(e=>{
 const m=/^OWNER_COUNTRY_STOP_([A-Z0-9_]+)$/.exec(String(e?.message||''));
 console.error('B4_003_OWNER_COUNTRY_STOPPED '+(m?m[1]:'SAFE_PRECONDITION_FAILED'));
 process.exitCode=1;
});
module.exports=Object.freeze({selectOwnerDecisions,patchFor,restorePatch,matchesBefore,approvedPost});
