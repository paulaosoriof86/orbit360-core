'use strict';
// Owner-directed LAB-only physical country index migration. Never prints PII,
// UIDs, client IDs, per-record patches or private backups in CI output.
// A private root-level Firestore vault (explicitly denied by the deployed
// Firestore catch-all Rules) holds exact before-images for rollback.
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {resolveClientCountry}=require('../functions/b4-003-client-country-authority');
const {planCountryIndex,physicalReadLimit}=require('./gravicentra-b4-003-client-country-index-dryrun-readonly.cjs');

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const BATCH='b4003-country-index-20261102';
const SOURCE='43da054e64d93338a655998e2e82ef529c5fe064';
const AGGREGATE_PATH='artifacts/orbit360-recovery/release-control/I6_5_B4_003_REAL_COUNTRY_INDEX_DRYRUN_AGGREGATE_20261102.json';
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const clean=x=>String(x==null?'':x).trim();
const idOk=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{4,180}$/.test(x);
const exactCountry=x=>clean(x).toUpperCase();
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const fail=why=>{throw Error('COUNTRY_INDEX_SAFE_APPLY_'+why);};

function computeExactCandidates({clients,policies,insurers}){
 const frozen=JSON.parse(fs.readFileSync(AGGREGATE_PATH,'utf8'));
 const planned=planCountryIndex({clients,policies,insurers,tenantId:TENANT});
 assert.deepStrictEqual(planned,frozen,'COUNTRY_INDEX_FROZEN_AGGREGATE_CHANGED');
 const byInsurer=new Map(insurers.map(i=>[clean(i.id),i]));
 const linked=new Map();
 for(const p of policies){const cid=clean(p.clienteId||p.clientId);if(!linked.has(cid))linked.set(cid,[]);linked.get(cid).push(p);}
 const entries=[];
 for(const c of clients){
  const id=clean(c.id);
  if(!idOk(id)||c._sourceIdMismatch===true)fail('CLIENT_ID_OR_DOCUMENT_MISMATCH');
  const r=resolveClientCountry({client:c,clientId:id,tenantId:TENANT,policies:linked.get(id)||[],insurers:byInsurer,completePolicySet:true});
  if(r.status!=='resolved'||exactCountry(c.pais)===r.country)continue;
  if(!['GT','CO'].includes(r.country)||!['client','insurer'].includes(r.source))fail('COUNTRY_AUTHORITY_NOT_EXACT');
  if(own(c,'pais')&&c.pais!==null&&typeof c.pais!=='string')fail('PREVIOUS_COUNTRY_TYPE_UNSAFE');
  const v=c._firestoreUpdateTime;
  if(!v||!Number.isSafeInteger(v.seconds)||!Number.isSafeInteger(v.nanoseconds))fail('SOURCE_VERSION_MISSING');
  entries.push({clientId:id,hadPais:own(c,'pais'),beforePais:own(c,'pais')?c.pais:null,
   afterPais:r.country,authority:r.source,versionSeconds:v.seconds,versionNanos:v.nanoseconds});
 }
 entries.sort((a,b)=>a.clientId.localeCompare(b.clientId));
 if(entries.length!==32||entries.filter(e=>e.afterPais==='GT').length!==1||
   entries.filter(e=>e.afterPais==='CO').length!==31||
   new Set(entries.map(e=>e.clientId)).size!==32)fail('CANDIDATE_COUNT_OR_COUNTRY_DRIFT');
 return Object.freeze({entries,aggregate:planned,manifestDigest:digest(entries)});
}

function previousPaisEqual(data,entry){
 return own(data,'pais')===entry.hadPais&&
  (!entry.hadPais||data.pais===entry.beforePais);
}
function versionEqual(timestamp,entry){
 return !!timestamp&&timestamp.seconds===entry.versionSeconds&&
  timestamp.nanoseconds===entry.versionNanos;
}
function restorationPatch(entry,FieldValue){
 return {pais:entry.hadPais?entry.beforePais:FieldValue.delete()};
}
function expectedPostAggregate(after){
 if(after.counts?.clients!==443||after.counts?.policies!==1425||
   after.counts?.insurers!==33||after.indexedAlready?.GT!==392||
   after.indexedAlready?.CO!==48||after.indexUpdateCandidates?.GT!==0||
   after.indexUpdateCandidates?.CO!==0||
   after.unresolvable?.COMPLETE_POLICY_RELATION_REQUIRED!==3||
   after.distinctPolicyRefsMissingClient!==3||
   after.candidateAuthority?.insurer!==64||
   after.candidateAuthority?.client!==376||after.crossBorderClientExplicitPreserved!==1)
  fail('POST_APPLY_AGGREGATE_MISMATCH');
 return true;
}

async function realRun(mode){
 const credentialPath=process.env.GOOGLE_APPLICATION_CREDENTIALS;
 if(!credentialPath||!fs.existsSync(credentialPath))fail('LAB_CREDENTIAL_MISSING');
 const service=JSON.parse(fs.readFileSync(credentialPath,'utf8'));
 if(service.type!=='service_account'||service.project_id!==PROJECT)fail('PROJECT_NOT_ALLOWLISTED');
 const {initializeApp,cert,deleteApp}=require('firebase-admin/app');
 const {getFirestore,FieldValue}=require('firebase-admin/firestore');
 const app=initializeApp({credential:cert(service),projectId:PROJECT},'b4003-safe-country-migration');
 const db=getFirestore(app),tenant=db.collection('tenants').doc(TENANT);
 const vault=db.collection('__gravicentraPrivateMigrationVault').doc(BATCH);
 try{
  const read=async name=>{
   const lim=physicalReadLimit(name),snap=await tenant.collection('data').doc(name).collection('items').limit(lim+1).get();
   if(snap.size>lim)fail('COLLECTION_READ_BOUND_'+name);
   return snap.docs.map(d=>({...d.data(),id:d.id,
    _sourceIdMismatch:!!(d.data()?.id&&clean(d.data().id)!==d.id),
    _firestoreUpdateTime:{seconds:d.updateTime.seconds,nanoseconds:d.updateTime.nanoseconds}}));
  };
  if(mode==='--real-lab-owner-approved-rollback-20261102'){
   if(process.env.GRAVICENTRA_B4003_OWNER_COUNTRY_ROLLBACK_20261102!=='APPROVED')
    fail('EXPLICIT_OWNER_ROLLBACK_INTENT_REQUIRED');
   const [backupSnap,appliedSnap,readbackSnap]=await Promise.all([
    vault.get(),vault.collection('events').doc('atomic-apply').get(),
    vault.collection('events').doc('post-apply-readback').get()]);
   if(!backupSnap.exists||!appliedSnap.exists||!readbackSnap.exists)fail('ROLLBACK_PROOF_MISSING');
   const backup=backupSnap.data()||{},readback=readbackSnap.data()||{};
   if(backup.schema!=='B4003_PRIVATE_COUNTRY_INDEX_BACKUP_V1'||backup.entries?.length!==32||
    appliedSnap.data()?.manifestDigest!==backup.manifestDigest||
    readback.manifestDigest!==backup.manifestDigest||readback.versions?.length!==32)
    fail('ROLLBACK_MANIFEST_INVALID');
   const byId=new Map(readback.versions.map(x=>[x.clientId,x]));
   const entries=backup.entries;
   if(entries.some(x=>!idOk(x.clientId)||!byId.has(x.clientId)))fail('ROLLBACK_CLIENT_BINDING_INVALID');
   const refs=entries.map(x=>tenant.collection('data').doc('clientes').collection('items').doc(x.clientId));
   const rolled=vault.collection('events').doc('guarded-rollback');
   await db.runTransaction(async tx=>{
    const [rollSnap,...snaps]=await Promise.all([tx.get(rolled),...refs.map(x=>tx.get(x))]);
    if(rollSnap.exists)fail('ROLLBACK_ALREADY_COMPLETED');
    for(let i=0;i<entries.length;i++){
     const snap=snaps[i],entry=entries[i],expected=byId.get(entry.clientId);
     if(!snap.exists||snap.data()?.pais!==entry.afterPais||
       !versionEqual(snap.updateTime,{versionSeconds:expected.versionSeconds,versionNanos:expected.versionNanos}))
      fail('ROLLBACK_CONCURRENT_CHANGE_ABORT');
    }
    for(let i=0;i<entries.length;i++)tx.update(refs[i],restorationPatch(entries[i],FieldValue));
    tx.create(rolled,{schema:'B4003_COUNTRY_INDEX_ROLLBACK_V1',manifestDigest:backup.manifestDigest,
     clientsRestored:32,at:FieldValue.serverTimestamp()});
   });
   const [cs,ps,ins]=await Promise.all([read('clientes'),read('polizas'),read('aseguradoras')]);
   const frozen=JSON.parse(fs.readFileSync(AGGREGATE_PATH,'utf8'));
   assert.deepStrictEqual(planCountryIndex({clients:cs,policies:ps,insurers:ins,tenantId:TENANT}),frozen);
   console.log('B4_003_COUNTRY_INDEX_GUARDED_ROLLBACK=PASS restored=32 frozen_aggregate_restored=true');
   return;
  }
  const [clients,policies,insurers]=await Promise.all([read('clientes'),read('polizas'),read('aseguradoras')]);
  if(clients.length!==443||policies.length!==1425||insurers.length!==33)fail('FROZEN_PHYSICAL_COUNTS_CHANGED');
  const exact=computeExactCandidates({clients,policies,insurers});
  console.log('B4_003_COUNTRY_INDEX_PREFLIGHT=PASS clients=443 policies=1425 insurers=33 candidates=32 GT=1 CO=31 privateIdsExported=false');
  if(mode==='--real-lab-preflight-readonly')return;
  if(mode!=='--real-lab-owner-approved-apply-20261102'||
    process.env.GRAVICENTRA_B4003_OWNER_COUNTRY_APPLY_20261102!=='APPROVED')
   fail('EXPLICIT_OWNER_APPLY_INTENT_REQUIRED');
  const backup={schema:'B4003_PRIVATE_COUNTRY_INDEX_BACKUP_V1',project:PROJECT,tenant:TENANT,
   sourceSha:SOURCE,manifestDigest:exact.manifestDigest,entries:exact.entries,
   recoveryWindow:'FIRESTORE_PITR_SEVEN_DAYS_CONFIRMED_IN_AUTHENTICATED_CONSOLE',
   backupOnly:false,sourceAggregateDigest:digest(exact.aggregate)};
  const existing=await vault.get();
  if(!existing.exists){
   await vault.create({...backup,createdAt:FieldValue.serverTimestamp()});
  }else{
   const old=existing.data()||{};
   for(const k of Object.keys(backup))if(!same(old[k],backup[k]))fail('PRIVATE_BACKUP_DIFFERENT_OR_ALREADY_USED');
  }
  const verified=await vault.get();
  if(!verified.exists||verified.data()?.manifestDigest!==exact.manifestDigest||
    !same(verified.data()?.entries,exact.entries))fail('PRIVATE_BACKUP_READBACK_MISMATCH');
  console.log('B4_003_COUNTRY_INDEX_PRIVATE_BACKUP=PASS restricted_root_vault=true preimages=32 identitiesLogged=false');

  // Restore exercise on 32 isolated, Rules-denied shadow documents.
  // No client/policy document is modified by this exercise.
  const shadows=exact.entries.map(e=>vault.collection('restoreDrill').doc(e.clientId));
  const prior=await db.getAll(...shadows);
  const staged=db.batch();let stagedCount=0;
  for(let i=0;i<prior.length;i++)if(!prior[i].exists){
   staged.create(shadows[i],{pais:exact.entries[i].afterPais,manifestDigest:exact.manifestDigest,shadow:true});stagedCount++;
  }else if(prior[i].data()?.manifestDigest!==exact.manifestDigest||prior[i].data()?.shadow!==true)
   fail('ISOLATED_RESTORE_SHADOW_CONFLICT');
  if(stagedCount)await staged.commit();
  const restored=db.batch();
  for(let i=0;i<exact.entries.length;i++)restored.update(shadows[i],restorationPatch(exact.entries[i],FieldValue));
  await restored.commit();
  const postDrill=await db.getAll(...shadows);
  if(postDrill.length!==32||postDrill.some((s,i)=>!s.exists||
    s.data()?.manifestDigest!==exact.manifestDigest||!previousPaisEqual(s.data(),exact.entries[i])))
   fail('ISOLATED_RESTORE_DRILL_READBACK_MISMATCH');
  const drillEvent=vault.collection('events').doc('isolated-restore-passed');
  if(!(await drillEvent.get()).exists)
   await drillEvent.create({schema:'B4003_RESTORE_DRILL_V1',count:32,manifestDigest:exact.manifestDigest,passed:true,at:FieldValue.serverTimestamp()});
  console.log('B4_003_COUNTRY_INDEX_ISOLATED_RESTORE_DRILL=PASS shadowRecords=32 realClientWrites=0');

  const clientRefs=exact.entries.map(e=>tenant.collection('data').doc('clientes').collection('items').doc(e.clientId));
  const applied=vault.collection('events').doc('atomic-apply');
  await db.runTransaction(async tx=>{
   const [backupSnap,applySnap,...docs]=await Promise.all([tx.get(vault),tx.get(applied),...clientRefs.map(r=>tx.get(r))]);
   if(!backupSnap.exists||backupSnap.data()?.manifestDigest!==exact.manifestDigest)fail('BACKUP_NOT_ANCHORED');
   if(applySnap.exists)fail('ALREADY_APPLIED_NO_DOUBLE_WRITE');
   for(let i=0;i<docs.length;i++){
    const s=docs[i],entry=exact.entries[i];
    if(!s.exists||!versionEqual(s.updateTime,entry)||!previousPaisEqual(s.data()||{},entry))
     fail('CONCURRENT_CLIENT_CHANGE_ABORT');
   }
   for(let i=0;i<docs.length;i++)tx.update(clientRefs[i],{pais:exact.entries[i].afterPais});
   tx.create(applied,{schema:'B4003_COUNTRY_INDEX_ATOMIC_APPLY_V1',manifestDigest:exact.manifestDigest,
    sourceSha:SOURCE,clientsUpdated:32,GT:1,CO:31,backupVerified:true,restoreDrillVerified:true,
    at:FieldValue.serverTimestamp()});
  });
  console.log('B4_003_COUNTRY_INDEX_ATOMIC_APPLY=COMMITTED updates=32 transactional=true');

  const [afterClients,afterPolicies,afterInsurers]=await Promise.all([
   read('clientes'),read('polizas'),read('aseguradoras')]);
  const after=planCountryIndex({clients:afterClients,policies:afterPolicies,
   insurers:afterInsurers,tenantId:TENANT});
  expectedPostAggregate(after);
  const evidence=vault.collection('events').doc('post-apply-readback');
  await evidence.create({schema:'B4003_COUNTRY_INDEX_READBACK_V1',manifestDigest:exact.manifestDigest,
   clients:443,correctlyIndexed:440,unresolved:3,candidatesRemaining:0,
   versions:exact.entries.map(e=>{
    const row=afterClients.find(c=>c.id===e.clientId);
    if(!row||!row._firestoreUpdateTime)fail('POST_APPLY_VERSION_NOT_FOUND');
    return {clientId:e.clientId,versionSeconds:row._firestoreUpdateTime.seconds,
     versionNanos:row._firestoreUpdateTime.nanoseconds};
   }),at:FieldValue.serverTimestamp()});
  console.log('B4_003_COUNTRY_INDEX_POST_APPLY=PASS indexed=440 unresolved=3 candidates=0 orphanQAB2=3 production=HOLD');
 }finally{await deleteApp(app);}
}

if(require.main===module){
 const mode=process.argv[2];
 if(!['--real-lab-preflight-readonly','--real-lab-owner-approved-apply-20261102',
   '--real-lab-owner-approved-rollback-20261102'].includes(mode)){
  console.error('B4_003_COUNTRY_INDEX_ONLY_EXPLICIT_LAB_MODE_ALLOWED');process.exitCode=2;
 }else realRun(mode).catch(e=>{
  // Never put thrown server details, IDs or document content into public logs.
  const message=String(e?.message||'');const safe=/^COUNTRY_INDEX_SAFE_APPLY_([A-Z0-9_]+)$/.exec(message);
  console.error('B4_003_COUNTRY_INDEX_STOPPED '+(safe?safe[1]:'FROZEN_INPUT_OR_TRANSACTION_FAILED'));
  process.exitCode=1;
 });
}
module.exports=Object.freeze({computeExactCandidates,previousPaisEqual,versionEqual,restorationPatch,expectedPostAggregate});
