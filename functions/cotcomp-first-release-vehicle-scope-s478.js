'use strict';

const VERSION='ays-cotcomp-s478-first-release-vehicle-scope-v1.0';

const FIRST_RELEASE_SCOPE=Object.freeze({
  AUTO_LIGHT:Object.freeze({
    publicLabel:'Automóvil / SUV / Pickup',
    satTypes:Object.freeze(['AUTOMOVIL','CAMIONETA','PICK UP']),
    evidenceBasis:Object.freeze([
      'REAL_QUOTE_CORPUS_AUTOMOVIL',
      'REAL_QUOTE_CORPUS_CAMIONETA',
      'GRAVICENTRA_TEMPLATE_PICK_UP'
    ])
  }),
  MOTO:Object.freeze({
    publicLabel:'Motocicleta',
    satTypes:Object.freeze(['MOTO']),
    evidenceBasis:Object.freeze([
      'REAL_QUOTE_CORPUS_MOTO',
      'GRAVICENTRA_TEMPLATE_MOTOCICLETA'
    ])
  })
});

const OUTSIDE_SCOPE_STATE='OTHER_REQUIRES_REVIEW';

function norm(v){return String(v==null?'':v).trim().toUpperCase().replace(/\s+/g,' ');}
function allAllowedTypes(){
  return Object.freeze([...new Set(Object.values(FIRST_RELEASE_SCOPE).flatMap(x=>x.satTypes))]);
}
function routePublicVehicleClass(value){
  const v=norm(value);
  const found=Object.entries(FIRST_RELEASE_SCOPE).find(([,cfg])=>cfg.satTypes.includes(v));
  if(!found)return Object.freeze({ok:false,code:OUTSIDE_SCOPE_STATE,satType:v});
  return Object.freeze({ok:true,vehicleClass:found[0],publicLabel:found[1].publicLabel,satType:v});
}
function releaseBlockers(){
  return Object.freeze({
    hard:Object.freeze(['CATALOG_DELIVERY_SURFACE_REQUIRED']),
    nonBlockingEnhancements:Object.freeze(['REVIEWED_ALIAS_DECISIONS_PENDING']),
    localIndependent:Object.freeze(['MATCHING_REAL_PROPOSAL_EVIDENCE_REQUIRED_FOR_W5_COROLLA_2006'])
  });
}
function validateAgainstCatalog(catalog={}){
  const entries=Array.isArray(catalog.entries)?catalog.entries:[];
  const counts={};
  for(const t of allAllowedTypes())counts[t]=entries.filter(x=>norm(x.type)===t).length;
  const errors=[];
  for(const [type,count] of Object.entries(counts))if(count<1)errors.push('ALLOWED_TYPE_MISSING_'+type.replace(/ /g,'_'));
  const scoped=entries.filter(x=>allAllowedTypes().includes(norm(x.type)));
  const brands=new Set(scoped.map(x=>norm(x.brand)));
  if(!brands.has('TOYOTA'))errors.push('TOYOTA_REQUIRED');
  if(!brands.has('MAZDA'))errors.push('MAZDA_REQUIRED');
  if(!brands.has('HONDA'))errors.push('HONDA_REQUIRED');
  if(!brands.has('BAJAJ'))errors.push('BAJAJ_REQUIRED');
  return Object.freeze({
    ok:errors.length===0,
    errors:Object.freeze(errors),
    counts:Object.freeze(counts),
    scopedIdentityCount:scoped.length,
    scopedBrandCount:brands.size
  });
}
function readiness(catalog){
  const v=validateAgainstCatalog(catalog);
  const blockers=releaseBlockers();
  return Object.freeze({
    version:VERSION,
    firstReleaseScopeReady:v.ok,
    allowedSatTypes:allAllowedTypes(),
    scopedIdentityCount:v.scopedIdentityCount,
    scopedBrandCount:v.scopedBrandCount,
    counts:v.counts,
    outsideScopeState:OUTSIDE_SCOPE_STATE,
    aliasDecisionsAreHardBlocker:false,
    catalogDeliverySurfaceReady:false,
    publicDropdownReleaseReady:false,
    hardBlockers:blockers.hard,
    nonBlockingEnhancements:blockers.nonBlockingEnhancements,
    localIndependentBlockers:blockers.localIndependent,
    appDataReads:0,
    appDataWrites:0,
    deployment:false,
    providerOrRaterCalls:0,
    productionTouched:false
  });
}

module.exports=Object.freeze({
  VERSION,FIRST_RELEASE_SCOPE,OUTSIDE_SCOPE_STATE,norm,allAllowedTypes,
  routePublicVehicleClass,releaseBlockers,validateAgainstCatalog,readiness
});
