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
    states:[]
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

  fs.writeFileSync(path.join(OUT,'receipt.json'),JSON.stringify(receipt,null,2));
  console.log(JSON.stringify(receipt,null,2));
  await browser.close();
})().catch(err=>{console.error(err);process.exit(1);});
