'use strict';
// Restore ONLY the B4 synthetic test logo left by signed QA run 43155920381.
// Run will stop on any different identity, fingerprint, path, date, or bytes.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const sdk=require('firebase-admin');
const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const ID='b4003qa_insurer_38102224750',BUCKET='gravicentra-insurance-assets-60e88ed5a1';
const B64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0nCy0AAAAASUVORK5CYII=';
const original=Buffer.from(B64,'base64');
const binaryHash=crypto.createHash('sha256').update(original).digest('hex');
const legacyHash=crypto.createHash('sha256').update(String(original),'utf8').digest('hex');
const assetRef='tenants/'+TENANT+'/assets/insurers/'+ID+'/logo-'+legacyHash.slice(0,20)+'.png';
const fields=['logo','logoAssetRef','logoContentHash','logoUpdatedAt','logoUpdatedByUid'];
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
async function main(){
  const sa=['SA_LAB','SA_ALT','SA_DEFAULT'].map(n=>process.env[n]).filter(Boolean)
    .map(v=>{try{return JSON.parse(v);}catch(_){return null;}})
    .find(v=>v?.type==='service_account'&&v.project_id===PROJECT&&v.private_key);
  assert.ok(sa,'GI_LOGO_FIXTURE_RESTORE_SAME_PROJECT_SIGNED_ACCOUNT_REQUIRED');
  sdk.initializeApp({credential:sdk.credential.cert(sa),projectId:PROJECT});
  const db=sdk.firestore(),root=db.collection('tenants').doc(TENANT);
  const fixture=root.collection('data').doc('aseguradoras').collection('items').doc(ID);
  const snap=await fixture.get(),row=snap.data()||{};
  assert.ok(snap.exists&&/B4 R20 Aseguradora QA/i.test(String(row.nombre||'')),'GI_LOGO_FIXTURE_RESTORE_SYNTHETIC_ONLY');
  assert.equal(row.logoAssetRef,assetRef,'GI_LOGO_FIXTURE_RESTORE_EXACT_ASSET_REF_REQUIRED');
  assert.equal(row.logoContentHash,legacyHash,'GI_LOGO_FIXTURE_RESTORE_EXACT_KNOWN_HASH_REQUIRED');
  const assetUrl='https://firebasestorage.googleapis.com/v0/b/'+encodeURIComponent(BUCKET)+'/o/'+encodeURIComponent(assetRef);
  assert.ok(String(row.logo||'').startsWith(assetUrl+'?alt=media&token='),'GI_LOGO_FIXTURE_RESTORE_EXACT_URL_REQUIRED');
  const update=typeof row.logoUpdatedAt?.toDate==='function'?row.logoUpdatedAt.toDate():new Date(0);
  assert.ok(+update>=+new Date('2026-11-12T04:35:00Z')&&+update<=+new Date('2026-11-12T04:41:00Z'),'GI_LOGO_FIXTURE_RESTORE_TIME_WINDOW_REQUIRED');
  const memberSnap=await root.collection('members').doc(String(row.logoUpdatedByUid||'')).get(),member=memberSnap.data()||{};
  const advisorId=String(member.advisorId||member.asesorId||'');
  const advisorSnap=advisorId?await root.collection('data').doc('asesores').collection('items').doc(advisorId).get():null;
  const advisor=advisorSnap?.data()||{};
  const authUser=await sdk.auth().getUser(String(row.logoUpdatedByUid||''));
  const displayedNames=[member.nombre,member.nombreCompleto,member.displayName,member.name,member.fullName,
    advisor.nombre,advisor.nombreCompleto,advisor.displayName,advisor.name,authUser.displayName];
  let identity=displayedNames.some(s=>norm(s).includes('paula')&&norm(s).includes('osorio'));
  if(!identity){
    const advisors=await root.collection('data').doc('asesores').collection('items').limit(400).get();
    assert.ok(advisors.size<400,'GI_LOGO_FIXTURE_RESTORE_ADVISOR_SCAN_BOUND');
    identity=advisors.docs.some(doc=>{
      const a=doc.data()||{};
      const owned=[a.authUid,a.uid,a.userId].some(x=>String(x||'')===String(row.logoUpdatedByUid));
      const named=[a.nombre,a.nombreCompleto,a.displayName,a.name].some(s=>norm(s).includes('paula')&&norm(s).includes('osorio'));
      return owned&&named;
    });
  }
  const countries=[].concat(member.countries||member.paises||[]).map(x=>String(x).toUpperCase());
  assert.ok(memberSnap.exists&&identity&&norm(member.activeRole)==='direccion'&&countries.includes('GT')&&authUser.disabled===false,'GI_LOGO_FIXTURE_RESTORE_ORIGINAL_DIRECTION_ACTOR_REQUIRED');
  const object=sdk.storage().bucket(BUCKET).file(assetRef),[metadata]=await object.getMetadata();
  assert.equal(metadata?.metadata?.tenantId,TENANT,'GI_LOGO_FIXTURE_RESTORE_ASSET_TENANT');
  assert.equal(metadata?.metadata?.insurerId,ID,'GI_LOGO_FIXTURE_RESTORE_ASSET_INSURER');
  assert.equal(metadata?.metadata?.assetKind,'insurer-logo','GI_LOGO_FIXTURE_RESTORE_ASSET_KIND');
  assert.equal(metadata?.metadata?.contentHash,legacyHash,'GI_LOGO_FIXTURE_RESTORE_ASSET_LEGACY_HASH');
  const [bytes]=await object.download();
  assert.ok(bytes.equals(original),'GI_LOGO_FIXTURE_RESTORE_EXACT_SYNTHETIC_IMAGE_BYTES');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),binaryHash,'GI_LOGO_FIXTURE_RESTORE_BINARY_HASH');
  await db.runTransaction(async tx=>{
    const current=(await tx.get(fixture)).data()||{};
    assert.equal(current.logoAssetRef,assetRef,'GI_LOGO_FIXTURE_RESTORE_CONCURRENT_ASSET_CHANGE_STOP');
    assert.equal(current.logoContentHash,legacyHash,'GI_LOGO_FIXTURE_RESTORE_CONCURRENT_HASH_CHANGE_STOP');
    assert.equal(current.logoUpdatedByUid,row.logoUpdatedByUid,'GI_LOGO_FIXTURE_RESTORE_CONCURRENT_ACTOR_CHANGE_STOP');
    assert.equal(current.logo,row.logo,'GI_LOGO_FIXTURE_RESTORE_CONCURRENT_URL_CHANGE_STOP');
    const del={};for(const key of fields)del[key]=sdk.firestore.FieldValue.delete();
    tx.update(fixture,del);
  });
  const after=(await fixture.get()).data()||{};
  for(const key of fields)assert.equal(Object.hasOwn(after,key),false,'GI_LOGO_FIXTURE_RESTORE_FIELD_PRESENCE:'+key);
  await object.delete();
  const [exists]=await object.exists();assert.equal(exists,false,'GI_LOGO_FIXTURE_RESTORE_ASSET_DELETION_READBACK');
  console.log('GI_I66_SIGNED_TEST_FIXTURE_EXACT_SOURCE_AND_ASSET_RESTORED_PASS');
  console.log(JSON.stringify({fixture:'B4 synthetic insurer only',fieldsRestored:fields.length,syntheticAssetRemoved:true,customerInsurersChanged:0,financialRecordsChanged:0,auditEventsPreserved:true}));
}
main().catch(e=>{console.error('GI_LOGO_FIXTURE_RESTORE_HOLD:'+String(e?.message||e).replace(/[\r\n]+/g,' ').slice(0,180));process.exit(1);});
