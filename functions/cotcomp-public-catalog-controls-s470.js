'use strict';

const contracts=require('./cotcomp-contracts');

const VERSION='ays-cotcomp-s470-public-catalog-controls-v1.0';
const JOURNEY_ID='GT_AUTO_MOTO_HYBRID';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const DEPLOY_ALLOWED=false;
const RELEASE_ALLOWED=false;

const PRESENTATION_AUTHORITY='S470_PUBLIC_UI_CONTROL_CONTRACT';
const COMPLETION_CONTRACT_ROLE='MINIMUM_COMPLETION_ONLY_NOT_PRESENTATION_AUTHORITY';

const CONTROLS=Object.freeze({
  route:Object.freeze({
    control:'segmented_select',
    source:'journey_enum',
    values:Object.freeze(['AUTO','MOTO']),
    catalogRequired:false
  }),
  protectionGoal:Object.freeze({
    control:'dependent_select',
    source:'journey_enum_by_route',
    dependsOn:Object.freeze(['route']),
    catalogRequired:false
  }),
  vehicleType:Object.freeze({
    control:'catalog_select',
    catalogKey:'GT_AUTO_MOTO_VEHICLE_TYPE',
    dependsOn:Object.freeze(['route']),
    catalogRequired:true
  }),
  vehicleUse:Object.freeze({
    control:'catalog_select',
    catalogKey:'GT_AUTO_MOTO_VEHICLE_USE',
    dependsOn:Object.freeze(['route']),
    catalogRequired:true
  }),
  brand:Object.freeze({
    control:'catalog_select',
    catalogKey:'GT_AUTO_MOTO_BRAND',
    dependsOn:Object.freeze(['route']),
    catalogRequired:true
  }),
  lineModel:Object.freeze({
    control:'dependent_catalog_select',
    catalogKey:'GT_AUTO_MOTO_LINE_MODEL',
    dependsOn:Object.freeze(['route','brand']),
    catalogRequired:true
  }),
  modelYear:Object.freeze({
    control:'year_select',
    catalogKey:'GT_AUTO_MOTO_MODEL_YEAR',
    dependsOn:Object.freeze(['route','brand','lineModel']),
    catalogRequired:true
  }),
  insuredValue:Object.freeze({
    control:'money',
    currency:'GTQ',
    catalogRequired:false
  }),
  'contact.name':Object.freeze({control:'text',autocomplete:'name',catalogRequired:false}),
  'contact.whatsapp':Object.freeze({control:'tel',autocomplete:'tel',catalogRequired:false}),
  'contact.email':Object.freeze({control:'email',autocomplete:'email',catalogRequired:false}),
  'consents.requestManagement':Object.freeze({control:'checkbox',catalogRequired:false})
});

const CATALOG_KEYS=Object.freeze(
  Object.values(CONTROLS).filter(x=>x.catalogRequired).map(x=>x.catalogKey)
);

function clean(v,max=200){return String(v==null?'':v).trim().slice(0,max);}
function fieldIds(){
  const journey=contracts.JOURNEYS[JOURNEY_ID];
  return journey ? Object.keys(journey.fields) : [];
}
function validateControlCoverage(){
  const journeyFields=fieldIds();
  const missing=journeyFields.filter(id=>!CONTROLS[id]);
  const extra=Object.keys(CONTROLS).filter(id=>!journeyFields.includes(id));
  return Object.freeze({ok:missing.length===0&&extra.length===0,missing:Object.freeze(missing),extra:Object.freeze(extra)});
}
function validateCatalogBinding(binding={}){
  const errors=[];
  for(const key of CATALOG_KEYS){
    const row=binding[key];
    if(!row||typeof row!=='object'){
      errors.push(key+':CATALOG_BINDING_REQUIRED');
      continue;
    }
    if(clean(row.status)!=='BOUND')errors.push(key+':BOUND_STATUS_REQUIRED');
    if(!clean(row.version))errors.push(key+':VERSION_REQUIRED');
    if(!clean(row.sourceRef))errors.push(key+':SOURCE_REF_REQUIRED');
    if(row.governed!==true)errors.push(key+':GOVERNED_SOURCE_REQUIRED');
  }
  return Object.freeze({ok:errors.length===0,errors:Object.freeze(errors)});
}
function uiReleaseReadiness(binding={}){
  const coverage=validateControlCoverage();
  const catalogs=validateCatalogBinding(binding);
  const blockers=[];
  if(!coverage.ok)blockers.push('PUBLIC_UI_CONTROL_COVERAGE_INCOMPLETE');
  if(!catalogs.ok)blockers.push('PUBLIC_CATALOG_BINDING_REQUIRED');
  if(contracts.AUTO_READY!==false)blockers.push('AUTO_READY_TRUTH_REGRESSION');
  return Object.freeze({
    version:VERSION,
    journeyId:JOURNEY_ID,
    presentationAuthority:PRESENTATION_AUTHORITY,
    completionContractRole:COMPLETION_CONTRACT_ROLE,
    controlCoverage:coverage,
    catalogBinding:catalogs,
    sourceContractReady:coverage.ok,
    publicUiReleaseReady:blockers.length===0,
    blockers:Object.freeze(blockers),
    catalogKeys:CATALOG_KEYS,
    executionEnabled:EXECUTION_ENABLED,
    appDataReadsAllowed:APP_DATA_READS_ALLOWED,
    appDataWritesAllowed:APP_DATA_WRITES_ALLOWED,
    deployAllowed:DEPLOY_ALLOWED,
    releaseAllowed:RELEASE_ALLOWED
  });
}
function sourceOnlyReadiness(){
  const r=uiReleaseReadiness({});
  return Object.freeze({
    ...r,
    sourceContractReady:r.controlCoverage.ok,
    expectedCatalogDependency:'PUBLIC_CATALOG_BINDING_REQUIRED',
    dropdownRequirementFrozen:true,
    brandControl:CONTROLS.brand.control,
    lineModelControl:CONTROLS.lineModel.control,
    dependentBrandModel:true
  });
}

module.exports=Object.freeze({
  VERSION,JOURNEY_ID,EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,
  DEPLOY_ALLOWED,RELEASE_ALLOWED,PRESENTATION_AUTHORITY,COMPLETION_CONTRACT_ROLE,
  CONTROLS,CATALOG_KEYS,fieldIds,validateControlCoverage,validateCatalogBinding,
  uiReleaseReadiness,sourceOnlyReadiness
});
