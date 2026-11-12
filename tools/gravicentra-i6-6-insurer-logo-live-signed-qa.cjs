'use strict';
// Authenticated LIVE write/read test ONLY against the previously-approved
// synthetic B4 insurer fixture. No real insurer or financial record changes.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const sdk=require('firebase-admin');
const {chromium}=require('playwright');

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const FIXTURE='b4003qa_insurer_38102224750';
const ORIGIN='https://app.aysseguros.com';
const IMAGE_BASE64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0nCy0AAAAASUVORK5CYII=';
const IMAGE=Buffer.from(IMAGE_BASE64,'base64');
const IMAGE_HASH=crypto.createHash('sha256').update(IMAGE).digest('hex');
const FIELDS=['logo','logoAssetRef','logoContentHash','logoUpdatedAt','logoUpdatedByUid'];
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

async function main(){
  const service=['SA_LAB','SA_ALT','SA_DEFAULT'].map(name=>process.env[name]).filter(Boolean)
    .map(value=>{try{return JSON.parse(value);}catch(_){return null;}})
    .find(row=>row?.type==='service_account'&&row.project_id===PROJECT&&row.private_key);
  assert.ok(service,'GI_LOGO_QA_PROJECT_CREDENTIAL_UNAVAILABLE');
  sdk.initializeApp({credential:sdk.credential.cert(service),projectId:PROJECT});
  const db=sdk.firestore(),auth=sdk.auth(),root=db.collection('tenants').doc(TENANT);
  const ref=root.collection('data').doc('aseguradoras').collection('items').doc(FIXTURE);
  const beforeSnap=await ref.get();assert.ok(beforeSnap.exists,'GI_LOGO_QA_FIXTURE_MISSING');
  const before=beforeSnap.data()||{};
  assert.match(String(before.nombre||''),/B4 R20 Aseguradora QA/i,'GI_LOGO_QA_NOT_A_SYNTHETIC_FIXTURE');
  assert.ok(!before.logo&&!before.logoAssetRef,'GI_LOGO_QA_FIXTURE_ALREADY_HAS_ASSET_STOP');
  const expectedRef='tenants/'+TENANT+'/assets/insurers/'+FIXTURE+'/logo-'+IMAGE_HASH.slice(0,20)+'.png';
  for(const bucket of [PROJECT+'.firebasestorage.app',PROJECT+'.appspot.com']){
    try{
      const [exists]=await sdk.storage().bucket(bucket).file(expectedRef).exists();
      assert.equal(exists,false,'GI_LOGO_QA_ASSET_ALREADY_EXISTS_STOP:'+bucket);
    }catch(error){
      if(error?.code===404)continue;
      throw error;
    }
  }

  const [members,advisors]=await Promise.all([root.collection('members').limit(150).get(),root.collection('data').doc('asesores').collection('items').limit(400).get()]);
  assert.ok(members.size<150&&advisors.size<400,'GI_LOGO_QA_IDENTITY_SCAN_BOUNDS');
  const advisorIds=new Set(),uids=new Set();
  for(const doc of advisors.docs){
    const a=doc.data()||{};
    if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(v=>normalize(v).includes('paula')&&normalize(v).includes('osorio'))){
      advisorIds.add(doc.id);for(const x of [a.authUid,a.uid,a.userId])if(x)uids.add(String(x));
    }
  }
  const candidates=members.docs.filter(doc=>{
    const m=doc.data()||{};
    const named=[m.nombre,m.nombreCompleto,m.displayName,m.name,m.fullName].some(v=>normalize(v).includes('paula')&&normalize(v).includes('osorio'))||advisorIds.has(String(m.advisorId||m.asesorId||''))||uids.has(doc.id);
    return named&&normalize(m.activeRole).includes('direccion')&&[].concat(m.countries||m.paises||[]).map(x=>String(x).toUpperCase()).includes('GT')&&m.active!==false&&m.activo!==false&&!['inactivo','inactive','blocked','bloqueado'].includes(normalize(m.status||m.estado));
  });
  assert.equal(candidates.length,1,'GI_LOGO_QA_PAULA_DIRECTION_MEMBER_NOT_UNIQUE');
  const user=await auth.getUser(candidates[0].id);
  assert.ok(!user.disabled&&user.emailVerified,'GI_LOGO_QA_DIRECTION_AUTH_NOT_ACTIVE');
  const token=await auth.createCustomToken(user.uid);
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  let uploadResult=null,readResult=null,completed=false,restoreStatus='NOT_NEEDED';
  try{
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    const page=await context.newPage();
    await page.goto(ORIGIN+'/#/aseguradoras',{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const role=await page.evaluate(async customToken=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
      await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);
      await c.modules.auth.signInWithCustomToken(c.auth,customToken);
      const a=await Orbit.productAppP0.activate();
      if(a?.started!==true)throw Error('GI_LOGO_QA_PRODUCT_ACTIVATION_FAILED');
      return String(Orbit.session?.rol?.()||'');
    },token);
    assert.equal(normalize(role),'direccion','GI_LOGO_QA_ACTIVE_ROLE_NOT_DIRECTION');
    uploadResult=await page.evaluate(async params=>{
      return await Orbit.productRuntimeBrowserProvidersP0.callFunction('orbit360ProductAssetUpload',
        {tenantId:params.tenantId,activeRole:params.activeRole,insurerId:params.insurerId,fileName:'gi-i66-synthetic-1px.png',mimeType:'image/png',base64:params.base64},'us-central1');
    },{tenantId:TENANT,activeRole:role,insurerId:FIXTURE,base64:IMAGE_BASE64});
    assert.equal(uploadResult?.ok,true,'GI_LOGO_QA_UPLOAD_NOT_CONFIRMED');
    assert.equal(uploadResult?.contentHash,IMAGE_HASH,'GI_LOGO_QA_UPLOAD_HASH_MISMATCH');
    const prefix='tenants/'+TENANT+'/assets/insurers/'+FIXTURE+'/logo-';
    assert.ok(String(uploadResult?.assetRef||'').startsWith(prefix)&&String(uploadResult?.assetRef).endsWith('.png'),'GI_LOGO_QA_ASSET_SCOPE_INVALID');
    const writtenSnap=await ref.get();
    assert.equal(writtenSnap.data()?.logoAssetRef,uploadResult.assetRef,'GI_LOGO_QA_FIRESTORE_ASSET_READBACK_FAILED');
    assert.equal(writtenSnap.data()?.logo,uploadResult.url,'GI_LOGO_QA_FIRESTORE_URL_READBACK_FAILED');
    readResult=await page.evaluate(async params=>{
      return await Orbit.productRuntimeBrowserProvidersP0.callFunction('orbit360ProductAssetRead',params,'us-central1');
    },{tenantId:TENANT,activeRole:role,insurerId:FIXTURE,assetRef:uploadResult.assetRef});
    assert.equal(readResult?.ok,true,'GI_LOGO_QA_READ_NOT_CONFIRMED');
    assert.equal(readResult?.base64,IMAGE_BASE64,'GI_LOGO_QA_IMAGE_CONTENT_NOT_IDENTICAL');
    assert.equal(readResult?.contentHash,IMAGE_HASH,'GI_LOGO_QA_READ_HASH_MISMATCH');
    completed=true;
  } finally {
    await browser.close();
    const current=await ref.get(),row=current.data()||{};
    // The exact synthetic upload is the only permissible target to restore;
    // never overwrite a concurrent human edit or preexisting insurer asset.
    if(current.exists&&row.logoAssetRef===expectedRef&&row.logoContentHash===IMAGE_HASH){
      await db.runTransaction(async tx=>{
        const inside=await tx.get(ref),actual=inside.data()||{};
        if(actual.logoAssetRef!==expectedRef||actual.logoContentHash!==IMAGE_HASH)throw Error('GI_LOGO_QA_FIXTURE_CONCURRENT_CHANGE_STOP');
        const restore={};for(const field of FIELDS)restore[field]=Object.hasOwn(before,field)?before[field]:sdk.firestore.FieldValue.delete();
        tx.update(ref,restore);
      });
      const after=(await ref.get()).data()||{};
      for(const field of FIELDS){
        assert.equal(Object.hasOwn(after,field),Object.hasOwn(before,field),'GI_LOGO_QA_RESTORE_FIELD_PRESENCE:'+field);
        if(Object.hasOwn(before,field))assert.deepEqual(after[field],before[field],'GI_LOGO_QA_RESTORE_FIELD_VALUE:'+field);
      }
      restoreStatus='FIRESTORE_FIXTURE_EXACT_RESTORE_PASS';
      const bucket=String(row.logo||'').match(/\/v0\/b\/([^/]+)\/o\//i)?.[1];
      assert.ok(bucket,'GI_LOGO_QA_UPLOADED_BUCKET_MISSING');
      await sdk.storage().bucket(decodeURIComponent(bucket)).file(expectedRef).delete({ignoreNotFound:true});
      restoreStatus='FIRESTORE_AND_TEST_STORAGE_ASSET_RESTORED';
    } else if(uploadResult){
      throw Error('GI_LOGO_QA_POSTUPLOAD_ASSET_CHANGED_NO_UNSAFE_RESTORE');
    }
  }
  assert.ok(completed,'GI_LOGO_QA_UPLOAD_AND_READ_NOT_COMPLETED');
  assert.equal(restoreStatus,'FIRESTORE_AND_TEST_STORAGE_ASSET_RESTORED');
  console.log('GI_I66_INSURER_LOGO_LIVE_AUTHENTICATED_DIRECTION_UPLOAD_READ_HASH_PERSIST_RESTORE_PASS');
  console.log(JSON.stringify({gate:'I6.6',module:'Aseguradoras',target:'synthetic B4 QA insurer only',actorRole:'Direccion',upload:true,read:true,hashSame:true,firestoreCanonicalReadback:true,restore:restoreStatus,realInsurerWrites:0,financialWrites:0,credentialsChanged:false,fullModuleAcceptance:false}));
}
main().catch(error=>{console.error('GI_LOGO_QA_HOLD:'+String(error?.message||error).replace(/[\r\n]+/g,' ').slice(0,200));process.exit(1);});
