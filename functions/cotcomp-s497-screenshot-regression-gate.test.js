'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const G=require('./cotcomp-s497-screenshot-regression-gate');

const H='a'.repeat(64);
function good(){
  return {
    schemaVersion:'ays-cotcomp-s497-visual-evidence-v1.0',
    anchorSha256:'a7f1be79cdb6d8144f608dc559d69ebc38bb6347a03ad2733eac2bb914a4673d',
    providerDeploymentAuthorized:false,cotcompRealTransportAuthorized:false,production:false,
    viewports:G.REQUIRED_VIEWPORTS.map(v=>({
      id:v.id,width:v.width,screenshotSha256:H,h1FontFamily:'Archivo',h1FontWeight:900,
      heroImageObjectFit:'cover',heroImageDistorted:false,heroHeightCoupledToWorkspace:false,
      horizontalOverflow:false,repeatedFamilyVisual:false,minPrimaryBodyPx:14,minControlPx:15,minLabelPx:12,
      familyColumns:v.familyColumns,stagesVisible:true,recommendationVisible:true,replanVisible:true
    })),
    states:['stage1','stage2','stage3','stage4','replan','changeNeed'].map(id=>({id,screenshotSha256:H,unexpectedVisualDrift:false}))
  };
}

test('visual evidence gate fails closed with no evidence',()=>{
  const v=G.verify(null);
  assert.equal(v.ok,false);
  assert.equal(v.ownerReviewUrlAuthorized,false);
});

test('visual evidence gate requires all four breakpoints and journey states',()=>{
  const r=good();r.viewports.pop();r.states.pop();
  const v=G.verify(r);
  assert.equal(v.ok,false);
  assert.ok(v.failed.some(x=>x.code==='VIEWPORT_PRESENT'));
  assert.ok(v.failed.some(x=>x.code==='STATE_EVIDENCE'));
});

test('visual evidence gate rejects typography, distortion, repetition and overflow regressions',()=>{
  const r=good();
  r.viewports[0].h1FontFamily='Newsreader';
  r.viewports[0].heroImageDistorted=true;
  r.viewports[0].repeatedFamilyVisual=true;
  r.viewports[0].horizontalOverflow=true;
  const v=G.verify(r);
  assert.equal(v.ok,false);
  for(const code of ['H1_FONT','HERO_NOT_DISTORTED','NO_REPEATED_FAMILY_VISUAL','NO_HORIZONTAL_OVERFLOW']) assert.ok(v.failed.some(x=>x.code===code),code);
});

test('visual evidence gate authorizes Owner URL only after every contract check passes',()=>{
  const v=G.verify(good());
  assert.equal(v.ok,true,JSON.stringify(v.failed,null,2));
  assert.equal(v.ownerReviewUrlAuthorized,true);
});
