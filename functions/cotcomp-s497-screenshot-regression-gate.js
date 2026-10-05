'use strict';

const REQUIRED_VIEWPORTS=Object.freeze([
  {id:'desktop-1440',width:1440,height:1000,familyColumns:4,heroMin:350,heroMax:410},
  {id:'desktop-1024',width:1024,height:900,familyColumns:4,heroMin:350,heroMax:420},
  {id:'mobile-390',width:390,height:844,familyColumns:1,heroMin:500,heroMax:680},
  {id:'mobile-320',width:320,height:700,familyColumns:1,heroMin:500,heroMax:700}
]);

const SHA=/^[a-f0-9]{64}$/;

function verify(receipt){
  const checks=[];
  const add=(ok,code,detail)=>checks.push({ok,code,detail});
  add(!!receipt && receipt.schemaVersion==='ays-cotcomp-s497-visual-evidence-v1.0','SCHEMA','visual evidence schema');
  add(!!receipt && receipt.anchorSha256==='a7f1be79cdb6d8144f608dc559d69ebc38bb6347a03ad2733eac2bb914a4673d','ANCHOR','S4.10/S4.18 forensic anchor');
  add(!!receipt && receipt.providerDeploymentAuthorized===false,'NO_PROVIDER_DEPLOY','provider deployment denied');
  add(!!receipt && receipt.cotcompRealTransportAuthorized===false,'NO_REAL_TRANSPORT','real transport denied');
  add(!!receipt && receipt.production===false,'NO_PRODUCTION','production denied');

  const views=(receipt&&Array.isArray(receipt.viewports))?receipt.viewports:[];
  for(const req of REQUIRED_VIEWPORTS){
    const v=views.find(x=>x&&x.id===req.id);
    add(!!v,'VIEWPORT_PRESENT',req.id);
    if(!v) continue;
    add(v.width===req.width,'VIEWPORT_WIDTH',req.id);
    add(SHA.test(String(v.screenshotSha256||'')),'SCREENSHOT_SHA',req.id);
    add(v.h1FontFamily==='Archivo','H1_FONT',req.id);
    add(Number(v.h1FontWeight)>=800,'H1_WEIGHT',req.id);
    add(Number(v.heroHeight)>=req.heroMin && Number(v.heroHeight)<=req.heroMax,'HERO_HEIGHT_RANGE',req.id);
    add(v.heroImageObjectFit==='cover','HERO_OBJECT_FIT',req.id);
    add(v.heroImageDistorted===false,'HERO_NOT_DISTORTED',req.id);
    add(v.heroHeightCoupledToWorkspace===false,'HERO_INDEPENDENT_HEIGHT',req.id);
    add(v.horizontalOverflow===false,'NO_HORIZONTAL_OVERFLOW',req.id);
    add(v.repeatedFamilyVisual===false,'NO_REPEATED_FAMILY_VISUAL',req.id);
    add(Number(v.minPrimaryBodyPx)>=14,'BODY_SIZE',req.id);
    add(Number(v.minControlPx)>=15,'CONTROL_SIZE',req.id);
    add(Number(v.minLabelPx)>=12,'LABEL_SIZE',req.id);
    add(Number(v.familyColumns)===req.familyColumns,'FAMILY_COLUMNS',req.id);
    add(v.stagesVisible===true,'FOUR_STAGE_JOURNEY',req.id);
    add(v.recommendationVisible===true,'RECOMMENDATION_VISIBLE',req.id);
    add(v.replanVisible===true,'REPLAN_VISIBLE',req.id);
  }

  const combo=receipt&&receipt.vehicleCombobox;
  add(!!combo,'VEHICLE_COMBOBOX_EVIDENCE','searchable vehicle identity interaction receipt');
  if(combo){
    add(combo.mockContract==='S479_READ_ONLY_SHAPE_UI_PROOF_ONLY','VEHICLE_COMBOBOX_MOCK_BOUNDARY','UI proof only');
    add(combo.realTransport===false,'VEHICLE_COMBOBOX_NO_REAL_TRANSPORT','real transport remains false');
    add(combo.brandSearchWorks===true,'VEHICLE_BRAND_SEARCH','brand searchable');
    add(combo.dependentModelEnabled===true,'VEHICLE_MODEL_DEPENDENCY','model enabled after brand');
    add(combo.modelSearchWorks===true,'VEHICLE_MODEL_SEARCH','model searchable');
    add(combo.selectedBrand===true && combo.selectedModel===true,'VEHICLE_COMBOBOX_SELECTION','brand/model selected');
    add(combo.keyboardSelectionWorks===true,'VEHICLE_COMBOBOX_KEYBOARD','Arrow/Enter keyboard selection works');
    add(combo.assistedFallback===true && combo.noForcedSelection===true,'VEHICLE_COMBOBOX_FALLBACK','missing option routes to assisted review');
    add(SHA.test(String(combo.screenshotSha256||'')),'VEHICLE_COMBOBOX_SCREENSHOT_SHA','interaction evidence');
  }

  const requiredStates=['stage1','stage2','stage3','stage4','replan','changeNeed'];
  const states=(receipt&&Array.isArray(receipt.states))?receipt.states:[];
  for(const id of requiredStates){
    const st=states.find(x=>x&&x.id===id);
    add(!!st,'STATE_EVIDENCE',id);
    if(st){
      add(SHA.test(String(st.screenshotSha256||'')),'STATE_SCREENSHOT_SHA',id);
      add(st.unexpectedVisualDrift===false,'NO_UNEXPECTED_DRIFT',id);
    }
  }

  const failed=checks.filter(x=>!x.ok);
  return Object.freeze({
    ok:failed.length===0,
    automatedVisualContractPassed:failed.length===0,
    ownerReviewUrlAuthorized:false,
    ownerReviewBlockReason:failed.length===0?'INTERNAL_MANUAL_VISUAL_AUDIT_REQUIRED':'AUTOMATED_VISUAL_CONTRACT_FAILED',
    failedCount:failed.length,
    failed,
    checks
  });
}

module.exports=Object.freeze({REQUIRED_VIEWPORTS,verify});
