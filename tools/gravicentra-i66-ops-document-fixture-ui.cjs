'use strict';
// Replay the document form ONLY on the exact existing isolated record created
// by the authenticated Preview button. No new business, client or policy.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const tenant='alianzas-soluciones',project='ays-orbit-360-lab';
const origin='https://ays-orbit-360-lab--gi-i66-rc-45093054745-631rjml6.web.app';
const source='0e7dcdb04cf66f427f160b1642715a6382d05aba';
const fixture='b4003qa_user_mwsm9tay_obiqrj',created='2026-11-23T01:58:30.950Z';
const fileName='Gravicentra_I66_prueba_Ops.txt';
const bytes=Buffer.from('Gravicentra Insurance I6.6. Archivo controlado para validar la carga, recuperacion y retirada del adjunto de prueba en Ops. Sin datos de clientes.\n');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const report={fixture,origin,source,fileName,sha256:sha(bytes),fileSize:bytes.length,savedClick:false,network:[],operationalWrites:0};
const service=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>{try{return JSON.parse(process.env[k]);}catch{return null;}})
  .find(v=>v?.type==='service_account'&&v.project_id===project);
assert.ok(service&&!process.env.FIRESTORE_EMULATOR_HOST);
assert.equal(process.env.GITHUB_REF,'refs/heads/recovery/fase-a-clean-20260831');
assert.equal(process.env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core');
assert.equal(report.sha256,'8ee8a79311b818cf9c4ee13bf08ffa0d12210929e7c723791724b1ebd86ee0f8');
admin.initializeApp({credential:admin.credential.cert(service),projectId:project});
const root=admin.firestore().collection('tenants').doc(tenant);
const ref=root.collection('data').doc('negocios').collection('items').doc(fixture);
const comments=row=>[].concat(row?.comentarios||[]);
const linkedFiles=row=>comments(row).filter(x=>x?.attachment?.documentRef);
function match(d){
  const r=d.data();assert.equal(d.id,fixture);assert.equal(r.id,fixture);assert.equal(r.tenantId,tenant);
  assert.equal(r.previewWrite,true);assert.equal(r.previewSource,'hosting-preview-uat');
  assert.equal(d.createTime.toDate().toISOString(),created);assert.equal(r.pais,'GT');
  assert.equal(r.nombre,'Prueba documental Ops/Leads (no operativa)');
  assert.ok(r.createdByUid&&!r.clienteId&&!r.polizaId&&!r.negocioId);return r;
}
async function reopen(page){
  await page.waitForFunction(id=>Boolean(window.Orbit?.ciclo?.openNegocio&&Orbit.store?.get('negocios',id)),fixture,{timeout:30000});
  // Standard renderer used only to reopen this known fixture. This is not
  // counted as normal Leads navigation. Every tested document action is a click.
  await page.evaluate(id=>Orbit.ciclo.openNegocio(id),fixture);
  await page.getByRole('heading',{name:/Prueba documental Ops\/Leads/}).waitFor({timeout:8000});
}
async function run(){
  const initial=await ref.get();
  if(!initial.exists){report.alreadyAbsent=true;return;}
  const row=match(initial);
  if(row.archivado===true){report.alreadyArchived=true;return;}
  const uid=row.createdByUid;
  const marker=await fetch(origin+'/__recovery__/build.json').then(r=>r.json());
  assert.equal(marker.sourceSha,source);
  const [member,user]=await Promise.all([root.collection('members').doc(uid).get(),admin.auth().getUser(uid)]);
  assert.equal(member.exists,true);assert.equal(String(member.get('activeRole')).toLowerCase(),'operativo');
  assert.ok(user.emailVerified&&!user.disabled&&member.get('active')!==false&&member.get('activo')!==false);
  assert.ok([].concat(member.get('countries')||member.get('paises')||[]).includes('GT'));
  report.actorRole='Operativo';report.creatorVerified=true;
  let browser,page,confirmedUpload=false;
  try{
    browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1280,height:900}});
    const responses=[];
    page.on('response',res=>{
      const h=new URL(res.url());
      if(!h.hostname.endsWith('.cloudfunctions.net')||res.request().method()!=='POST'||!/(?:DocumentDrive|OpsLeadsCommand)/i.test(h.pathname))return;
      responses.push((async()=>{let data={};try{data=await res.json();}catch{}
        const out=data.result||data.data||{},err=data.error||{};
        if(/upload/i.test(h.pathname)&&out.ok===true)confirmedUpload=true;
        if(h.pathname.endsWith('/orbit360DocumentDriveCleanupPreview')&&out.ok===true&&out.deleted===true)report.driveFileDeleted=true;
        report.network.push({endpoint:h.pathname.slice(1),status:res.status(),ok:out.ok===true,error:String(err.status||''),
          reason:String(err.message||'').replace(/[\w.+-]+@[\w.-]+/g,'[redacted]').slice(0,170),requestId:out.requestId||null});})());
    });
    await page.goto(origin+'/#/leads',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!Orbit.productAppP0);
    const login=await page.evaluate(async t=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
      await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);await c.modules.auth.signInWithCustomToken(c.auth,t);
      const x=await Orbit.productAppP0.activate();return {started:x?.started===true,preview:p.isI66PreviewHost(),role:Orbit.session.rol(),edit:Orbit.access.can('leads','edit')};},await admin.auth().createCustomToken(uid));
    assert.ok(login.started&&login.preview&&login.edit&&String(login.role).toLowerCase()==='operativo');
    await reopen(page);
    if(!comments(row).length){
      await page.locator('#ng-com-new').fill('I6.6 · Verificación documental controlada de Ops.');
      await page.locator('#ng-com-file').setInputFiles({name:fileName,mimeType:'text/plain',buffer:bytes});
      await page.getByText('Adjunto seleccionado:',{exact:false}).waitFor();
      const submit=page.locator('#ng-com-add');
      report.beforeSubmit={count:await submit.count(),visible:await submit.isVisible(),enabled:await submit.count()===1&&await submit.isEnabled()};
      await submit.click();
      report.savedClick=true;
      await page.waitForFunction(()=>!document.querySelector('#ng-com-add[aria-busy="true"]'),null,{timeout:35000});
      await Promise.all(responses);
    }
    const post=match(await ref.get());report.afterClick={comments:comments(post).length,documentRefs:linkedFiles(post).length};
    report.operationalWrites=report.savedClick&&comments(post).length===comments(row).length+1?1:0;
    if(linkedFiles(post).length===1){
      await page.reload();await reopen(page);
      const attachment=page.locator('#ng-coms [data-collab-doc]').filter({hasText:fileName});
      report.reloadAttachmentVisible=await attachment.count()===1&&await attachment.isVisible();
      if(report.reloadAttachmentVisible){
        assert.equal(await attachment.getAttribute('data-collab-doc'),linkedFiles(post)[0].attachment.documentRef);
        const [download]=await Promise.all([page.waitForEvent('download',{timeout:12000}),attachment.click()]);
        report.openClick=true;
        assert.equal(download.suggestedFilename(),fileName);
        const localFile=await download.path();
        report.downloadSha256=sha(fs.readFileSync(localFile));
        await Promise.all(responses);
      }
    }
    page.once('dialog',async dlg=>{
      if(dlg.type()==='confirm'&&/archivar este negocio sintético/.test(dlg.message()))await dlg.accept();else await dlg.dismiss();
    });
    const close=page.getByRole('button',{name:'Limpiar documentos y archivar prueba'});
    if(await close.count()===1){await close.click();report.cleanupClick=true;
      await page.waitForFunction(()=>!document.querySelector('#ng-preview-attachment-cleanup')||!document.querySelector('#ng-preview-attachment-cleanup').disabled,null,{timeout:25000}).catch(()=>{});
      await Promise.all(responses);}
  }catch(e){report.uiHold=String(e.message||e).split('\n')[0].slice(0,170);}
  finally{
    if(browser)await browser.close();
    const last=await ref.get();
    if(!last.exists){report.removed=true;return;}
    const r=match(last);report.archived=r.archivado===true;report.finalDocumentRefs=linkedFiles(r).length;
    if(!report.archived &&!confirmedUpload &&!linkedFiles(r).length&&!comments(r).length){
      // Existing I6.6 synthetic restore contract. Retain a reversible copy and
      // use the exact committed update time. Immutable Preview requests remain.
      const witness=root.collection('operationalRequests').doc('i66_documentary_fixture_restore_'+fixture);
      await admin.firestore().runTransaction(async tx=>{const [current,audit]=await tx.getAll(ref,witness);
        assert.ok(current.exists&&!audit.exists&&current.updateTime.isEqual(last.updateTime));const item=match(current);
        assert.equal(item.createdByUid,uid);assert.equal(comments(item).length,0);assert.ok(!item.archivado);
        tx.create(witness,{type:'PREVIEW_SYNTHETIC_RESTORE',sourceRun:process.env.GITHUB_RUN_ID,fixtureId:fixture,before:item,restoredAt:admin.firestore.FieldValue.serverTimestamp()});
        tx.delete(ref,{lastUpdateTime:current.updateTime});});
      report.removed=!(await ref.get()).exists;report.restoreAudit=(await witness.get()).exists;
    }
    assert.ok(report.archived||report.removed,'FIXTURE_RESTORE_REQUIRES_REVIEW');
  }
}
run().catch(e=>{report.error=String(e.message||e).split('\n')[0].slice(0,170);process.exitCode=1;}).finally(()=>{
  const success=name=>report.network.some(r=>r.endpoint===name&&r.status===200&&r.ok);
  const accepted=!report.error&&!report.uiHold&&report.savedClick&&report.afterClick?.documentRefs===1&&
    report.afterClick.comments===1&&report.operationalWrites===1&&success('orbit360DocumentDriveUploadPreview')&&
    success('orbit360DocumentDriveFinalizePreview')&&report.reloadAttachmentVisible&&report.openClick&&
    success('orbit360DocumentDriveDownloadPreview')&&report.downloadSha256===report.sha256&&
    report.cleanupClick&&report.driveFileDeleted&&success('orbit360DocumentDriveCleanupPreview')&&(report.archived||report.removed);
  report.functionalStatus=accepted?'PASS':'HOLD';
  if(!accepted)process.exitCode=1;
  console.log('I66_FOCAL_OPS_DOCUMENT_FORM='+JSON.stringify(report));fs.writeFileSync(process.env.RUNNER_TEMP+'/i66-ops-document-form.json',JSON.stringify(report,null,2));
});
