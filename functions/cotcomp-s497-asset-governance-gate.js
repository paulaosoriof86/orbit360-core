'use strict';

const SHA=/^[a-f0-9]{64}$/;
const REQUIRED_FAMILIES=['vehicle','home','health','life','business','cargo','other'];
const OFFICIAL_LOGO_SHA='71e571a6367064a9a7372fd3e156d79508f00f0f8ffe6276d422341008a88a8c';
const OFFICIAL_SYMBOL_SHA='1936bad462956e1cd92569f8e564e4d8d2729df2bd41b14271796470e09853e3';

function verify(m){
  const c=[];const add=(ok,code,detail)=>c.push({ok,code,detail});
  add(!!m && m.schemaVersion==='ays-cotcomp-s497-asset-manifest-v1.0','SCHEMA','asset manifest v1.0');
  add(!!m?.officialIdentity?.fullLogo && m.officialIdentity.fullLogo.sha256===OFFICIAL_LOGO_SHA,'OFFICIAL_LOGO_SHA','Logo V. 2026 exact bytes');
  add(!!m?.officialIdentity?.symbol && m.officialIdentity.symbol.sha256===OFFICIAL_SYMBOL_SHA,'OFFICIAL_SYMBOL_SHA','Logo Bolita V. 2025 exact bytes');
  add(!!m?.hero && SHA.test(String(m.hero.sha256||'')),'HERO_SHA','hero hash');
  add(m?.hero?.nativeAspectRatio==='16:9','HERO_NATIVE_RATIO','16:9 preferred');
  add(m?.hero?.objectFit==='cover','HERO_COVER','cover');
  add(m?.hero?.eligibleForOwnerReview===true,'HERO_OWNER_REVIEW_ELIGIBLE','candidate can be reviewed');

  const family=Array.isArray(m?.familyVisuals)?m.familyVisuals:[];
  add(family.length===7,'FAMILY_COUNT','seven mapped visuals');
  for(const id of REQUIRED_FAMILIES){
    const a=family.find(x=>x.family===id);
    add(!!a,'FAMILY_ASSET_PRESENT',id);
    if(!a) continue;
    add(SHA.test(String(a.sha256||'')),'FAMILY_SHA',id);
    add(a.eligibleForOwnerReview===true,'FAMILY_OWNER_REVIEW_ELIGIBLE',id);
    add(!!a.visualRole,'FAMILY_VISUAL_ROLE',id);
  }
  const primary=[m?.hero?.sha256,...family.map(x=>x.sha256)].filter(Boolean);
  add(new Set(primary).size===primary.length,'NO_PRIMARY_ASSET_REUSE','hero + seven families must be distinct');
  add(m?.priscila?.sha256==='d091beb90594abc3a7c4fac01e6028fda188301589b0c712b3b8fb1a997f2a60','PRISCILA_GOVERNED_ASSET','owner-approved cutout exact hash');
  add(m?.priscila?.placementStatus==='PENDING_SURFACE_COMPOSITION','PRISCILA_NOT_MECHANICALLY_WIRED','placement remains gated');
  add(m?.gates?.productionVisualApproval===false,'NO_PRODUCTION_VISUAL_APPROVAL','false');
  add(m?.gates?.packagingComplete===false,'PACKAGING_STILL_BLOCKED','must remain false until bytes are packaged and verified');
  add(m?.gates?.runtimeBytesVerified===false,'RUNTIME_BYTES_STILL_BLOCKED','must remain false until render package readback');

  const failed=c.filter(x=>!x.ok);
  return Object.freeze({ok:failed.length===0,failedCount:failed.length,failed,checks:c});
}
module.exports=Object.freeze({REQUIRED_FAMILIES,OFFICIAL_LOGO_SHA,OFFICIAL_SYMBOL_SHA,verify});
