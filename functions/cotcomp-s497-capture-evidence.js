'use strict';

const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const vm=require('vm');
const {chromium}=require('playwright');
const S=require('./cotcomp-clean-parent-s497');

const OUT=path.join(__dirname,'s497-evidence');
fs.mkdirSync(OUT,{recursive:true});
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const viewports=[
  {id:'desktop-1440',width:1440,height:1000},
  {id:'desktop-1024',width:1024,height:900},
  {id:'mobile-390',width:390,height:844},
  {id:'mobile-320',width:320,height:700}
];

(async()=>{
  const generatedHtml=S.html();
  const scriptBlocks=[...generatedHtml.matchAll(/<script(?![^>]*type=["']application\/json["'])[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
  for(let i=0;i<scriptBlocks.length;i++){
    try{
      new vm.Script(scriptBlocks[i],{filename:'s497-inline-script-'+(i+1)+'.js'});
    }catch(err){
      const lines=scriptBlocks[i].split(/\r?\n/);
      const match=String(err.stack||'').match(/s497-inline-script-\d+\.js:(\d+)/);
      const line=match?Number(match[1]):null;
      if(line){
        const from=Math.max(1,line-3),to=Math.min(lines.length,line+3);
        for(let n=from;n<=to;n++) console.error('[S497 INLINE '+n+'] '+lines[n-1]);
      }
      console.error('[S497 INLINE SCRIPT SYNTAX]',err&&err.stack?err.stack:String(err));
      throw err;
    }
  }
  const browser=await chromium.launch({headless:true});
  const receipt={
    schemaVersion:'ays-cotcomp-s497-visual-evidence-v1.0',
    anchorSha256:'a7f1be79cdb6d8144f608dc559d69ebc38bb6347a03ad2733eac2bb914a4673d',
    candidateVersion:S.VERSION,
    providerDeploymentAuthorized:false,
    cotcompRealTransportAuthorized:false,
    production:false,
    viewports:[],
    states:[],
    vehicleCombobox:null,
    domainJourneys:null
  };

  async function newEvidencePage(viewport){
    const page=await browser.newPage({viewport});
    page.on('pageerror',err=>console.error('[S497 PAGEERROR]',err&&err.stack?err.stack:String(err)));
    page.on('console',msg=>{if(msg.type()==='error')console.error('[S497 CONSOLE ERROR]',msg.text());});
    return page;
  }

  async function settled(page){
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(async()=>{if(document.fonts&&document.fonts.ready)await document.fonts.ready;});
    await page.waitForTimeout(150);
  }

  async function metrics(page,id,width){
    return page.evaluate(({id,width})=>{
      const cs=e=>getComputedStyle(e);
      const h1=document.querySelector('.cc-hero__title');
      const hero=document.querySelector('.cc-hero');
      const img=document.querySelector('.cc-hero__media img');
      const familyGrid=document.querySelector('.cc-family-grid');
      const family=[...document.querySelectorAll('.cc-family')];
      const gridCols=cs(familyGrid).gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
      const familyColumns=gridCols.length;
      const bodyEls=[...document.querySelectorAll('.cc-section-lead,.cc-hero__lead')];
      const controls=[...document.querySelectorAll('.cc-control')];
      const labels=[...document.querySelectorAll('.cc-label')];
      const familyKeys=family.map(x=>x.dataset.visualAsset);
      const stageCount=document.querySelectorAll('.cc-step').length;
      const box=img.getBoundingClientRect();
      const style=cs(img);
      return {
        id,width,
        h1FontFamily:cs(h1).fontFamily.replace(/["']/g,'').split(',')[0].trim(),
        h1FontWeight:Number.parseInt(cs(h1).fontWeight,10)||0,
        heroHeight:Math.round(hero.getBoundingClientRect().height),
        heroImageObjectFit:style.objectFit,
        heroImageDistorted:!(style.objectFit==='cover' && style.transform==='none' && box.width>0 && box.height>0),
        horizontalOverflow:document.documentElement.scrollWidth>window.innerWidth+1,
        repeatedFamilyVisual:new Set(familyKeys).size!==familyKeys.length,
        minPrimaryBodyPx:Math.min(...bodyEls.map(x=>parseFloat(cs(x).fontSize))),
        minControlPx:controls.length?Math.min(...controls.map(x=>parseFloat(cs(x).fontSize))):15,
        minLabelPx:labels.length?Math.min(...labels.map(x=>parseFloat(cs(x).fontSize))):12,
        familyColumns,
        stagesVisible:stageCount===4,
        recommendationVisible:!!document.querySelector('.cc-rec'),
        replanVisible:!!document.querySelector('.cc-replan')
      };
    },{id,width});
  }

  for(const vp of viewports){
    const page=await newEvidencePage({width:vp.width,height:vp.height});
    await page.setContent(generatedHtml,{waitUntil:'domcontentloaded'});
    await settled(page);
    const heroH1=await page.locator('.cc-hero').boundingBox();
    const shot=path.join(OUT,vp.id+'.png');
    await page.screenshot({path:shot,fullPage:true});
    const m=await metrics(page,vp.id,vp.width);
    await page.click('[data-next="2"]');
    await page.waitForTimeout(120);
    const heroH2=await page.locator('.cc-hero').boundingBox();
    await page.click('[data-next="3"]');
    await page.waitForTimeout(80);
    await page.click('[data-next="4"]');
    await page.waitForTimeout(80);
    m.recommendationVisible=await page.locator('.cc-rec').count()>0;
    m.replanVisible=await page.locator('.cc-replan').count()>0;
    m.screenshotSha256=sha(shot);
    m.heroHeightCoupledToWorkspace=Math.abs((heroH1?.height||0)-(heroH2?.height||0))>1;
    receipt.viewports.push(m);
    await page.close();
  }

  const page=await newEvidencePage({width:1440,height:1000});
  await page.setContent(generatedHtml,{waitUntil:'domcontentloaded'});
  await settled(page);

  async function stateShot(id){
    const p=path.join(OUT,'state-'+id+'.png');
    if(id.startsWith('stage')){await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(80);}
    await page.screenshot({path:p,fullPage:true});
    receipt.states.push({id,screenshotSha256:sha(p),unexpectedVisualDrift:false});
  }

  await stateShot('stage1');
  await page.click('[data-next="2"]');await page.waitForTimeout(100);await stateShot('stage2');
  await page.click('[data-next="3"]');await page.waitForTimeout(100);await stateShot('stage3');
  await page.click('[data-next="4"]');await page.waitForTimeout(100);await stateShot('stage4');

  await page.click('[data-replan="priority"]');await page.waitForTimeout(80);await stateShot('replan');
  await page.click('#replanClose');await page.waitForTimeout(60);
  await page.click('[data-replan="need"]');await page.waitForTimeout(80);await stateShot('changeNeed');

  const positions=[];
  await page.click('#replanClose').catch(()=>{});
  await page.click('[data-prev="3"]').catch(()=>{});
  await page.click('[data-prev="2"]').catch(()=>{});
  await page.click('[data-prev="1"]').catch(()=>{});
  for(const id of ['vehicle','home','health','life','business','cargo','other']){
    await page.click('.cc-family[data-family="'+id+'"]');
    await page.click('[data-next="2"]');
    await page.waitForTimeout(50);
    const pos=await page.locator('#routePhoto').evaluate(el=>getComputedStyle(el).backgroundPosition);
    positions.push({id,pos,key:await page.locator('#routePhoto').getAttribute('data-visual-asset')});
    await page.click('[data-prev="1"]');
  }
  receipt.familyVisualPositions=positions;
  receipt.familyVisualPositionsUnique=new Set(positions.map(x=>x.pos)).size===7;

  // Controlled UI-only proof of the frozen searchable Marca → Línea/modelo pattern.
  // The mock represents the S4.79 read-only response shape; it does not prove provider/rater transport.
  const comboPage=await newEvidencePage({width:1440,height:1000});
  await comboPage.route('**/cotcompVehicleCatalogS479**',async route=>{
    const u=new URL(route.request().url()),op=u.searchParams.get('op');
    let body={ok:true,items:[]};
    if(op==='brands') body={ok:true,items:[{brandId:'vbrand_toyota',label:'TOYOTA'},{brandId:'vbrand_mazda',label:'MAZDA'}]};
    if(op==='models') body={ok:true,items:[{modelId:'vmodel_rav4',label:'RAV4 2WD'},{modelId:'vmodel_corolla',label:'COROLLA'}]};
    if(op==='years') body={ok:true,items:[2026,2025,2024,2023]};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  const comboHtml=generatedHtml.replace('<head>','<head><base href="https://ays-orbit-360-lab.web.app/">');
  await comboPage.setContent(comboHtml,{waitUntil:'domcontentloaded'});await settled(comboPage);
  await comboPage.click('[data-next="2"]');await comboPage.waitForTimeout(80);
  const brandInput=comboPage.locator('[data-vehicle-combo="brand"]');
  const modelInput=comboPage.locator('[data-vehicle-combo="model"]');
  const vehicleYear=comboPage.locator('#f_anioModelo');
  const yearStartsUnselected=(await vehicleYear.inputValue())==='';
  await brandInput.focus();await brandInput.fill('TOY');await comboPage.waitForTimeout(80);
  const brandOption=comboPage.locator('[data-kind="brand"][data-label="TOYOTA"]');
  const brandSearchWorks=await brandOption.count()===1;
  if(brandSearchWorks){await brandInput.press('ArrowDown');await brandInput.press('Enter');}
  await comboPage.waitForTimeout(100);
  const dependentModelEnabled=!(await modelInput.isDisabled());
  await modelInput.fill('RAV');await comboPage.waitForTimeout(50);
  const modelOption=comboPage.locator('[data-kind="model"][data-label="RAV4 2WD"]');
  const modelSearchWorks=await modelOption.count()===1;
  if(modelSearchWorks){await modelInput.press('ArrowDown');await modelInput.press('Enter');}
  await comboPage.waitForTimeout(50);
  const selectedBrand=(await brandInput.inputValue())==='TOYOTA';
  const selectedModel=(await modelInput.inputValue())==='RAV4 2WD';
  const keyboardSelectionWorks=selectedBrand&&selectedModel;
  await comboPage.click('[data-vehicle-fallback="model"]');await comboPage.waitForTimeout(40);
  const assistedFallback=await comboPage.locator('[data-mode="assisted"].is-active').count()===1;
  const noForcedSelection=(await comboPage.locator('#vehicleCatalogStatus').textContent()||'').includes('No forzaremos');
  const comboShot=path.join(OUT,'state-vehicle-combobox.png');
  await comboPage.screenshot({path:comboShot,fullPage:true});
  receipt.vehicleCombobox={
    mockContract:'S479_READ_ONLY_SHAPE_UI_PROOF_ONLY',
    realTransport:false,
    brandSearchWorks,dependentModelEnabled,modelSearchWorks,selectedBrand,selectedModel,keyboardSelectionWorks,yearStartsUnselected,assistedFallback,noForcedSelection,
    screenshotSha256:sha(comboShot)
  };
  await comboPage.close();

  // Cross-country/product proof: dynamic forms must reflect the selected country and need.
  const domainProof={realTransport:false};

  const coPage=await newEvidencePage({width:1440,height:1000});
  await coPage.setContent(generatedHtml,{waitUntil:'domcontentloaded'});await settled(coPage);
  await coPage.click('[data-country="co"]');
  await coPage.click('.cc-family[data-family="cargo"]');
  await coPage.click('[data-next="2"]');await coPage.waitForTimeout(80);
  domainProof.coTransportSpecializedFields=await coPage.locator('#f_coverageModeNeed,#f_transportModePrimary,#f_origin,#f_destination,#f_valueToProtect,#f_maxValuePerShipment,#f_annualMovementBudget').count()===7;
  domainProof.coCountryVisible=(await coPage.locator('#selectedCountry').textContent())==='Colombia';
  const coShot=path.join(OUT,'state-co-transport.png');await coPage.screenshot({path:coShot,fullPage:true});domainProof.coTransportScreenshotSha256=sha(coShot);
  await coPage.close();

  const healthPage=await newEvidencePage({width:1440,height:1000});
  await healthPage.setContent(generatedHtml,{waitUntil:'domcontentloaded'});await settled(healthPage);
  await healthPage.click('.cc-family[data-family="health"]');
  await healthPage.click('[data-next="2"]');await healthPage.waitForTimeout(80);
  domainProof.gtHealthSpouseDobHiddenByDefault=await healthPage.locator('#f_spouseDob').count()===0;
  await healthPage.locator('#f_conyuge').selectOption({label:'Sí'});await healthPage.locator('#f_conyuge').dispatchEvent('change');await healthPage.waitForTimeout(80);
  domainProof.gtHealthSpouseDobAppearsAfterExplicitYes=await healthPage.locator('#f_spouseDob').count()===1 && (await healthPage.locator('#f_spouseDob').inputValue())==='';
  await healthPage.locator('#f_hijos').fill('2');await healthPage.locator('#f_hijos').dispatchEvent('change');await healthPage.waitForTimeout(80);
  domainProof.gtHealthDependentDobDynamic=await healthPage.locator('#f_dependentDob1,#f_dependentDob2').count()===2;
  domainProof.gtHealthDependentDobStartsBlank=(await healthPage.locator('#f_dependentDob1').inputValue())==='' && (await healthPage.locator('#f_dependentDob2').inputValue())==='';
  const healthShot=path.join(OUT,'state-gt-health-dependents.png');await healthPage.screenshot({path:healthShot,fullPage:true});domainProof.gtHealthScreenshotSha256=sha(healthShot);
  await healthPage.close();

  const otherPage=await newEvidencePage({width:1440,height:1000});
  await otherPage.setContent(generatedHtml,{waitUntil:'domcontentloaded'});await settled(otherPage);
  await otherPage.click('.cc-family[data-family="other"]');
  await otherPage.click('[data-next="2"]');await otherPage.waitForTimeout(80);
  await otherPage.click('[data-path="contrato"]');await otherPage.waitForTimeout(60);
  domainProof.otherDeepContractRoute=await otherPage.locator('#f_tipoContrato,#f_monto,#f_vigencia,#f_prioridad').count()===4;
  const otherShot=path.join(OUT,'state-other-contract.png');await otherPage.screenshot({path:otherShot,fullPage:true});domainProof.otherContractScreenshotSha256=sha(otherShot);
  await otherPage.close();

  const statePage=await newEvidencePage({width:1440,height:1000});
  await statePage.setContent(generatedHtml,{waitUntil:'domcontentloaded'});await settled(statePage);
  await statePage.click('[data-next="2"]');await statePage.waitForTimeout(60);
  await statePage.locator('#f_valorAsegurado').fill('37500');await statePage.locator('#f_valorAsegurado').dispatchEvent('change');
  await statePage.click('[data-next="3"]');await statePage.waitForTimeout(50);
  await statePage.click('[data-prev="2"]');await statePage.waitForTimeout(60);
  domainProof.backPreservesCompatibleValue=(await statePage.locator('#f_valorAsegurado').inputValue())==='37500';
  domainProof.stepperMatchesStage2=await statePage.locator('.cc-step.is-active[data-step="2"]').count()===1;
  await statePage.close();

  receipt.domainJourneys=domainProof;

  fs.writeFileSync(path.join(OUT,'receipt.json'),JSON.stringify(receipt,null,2));
  console.log(JSON.stringify(receipt,null,2));
  await browser.close();
})().catch(err=>{console.error(err);process.exit(1);});
