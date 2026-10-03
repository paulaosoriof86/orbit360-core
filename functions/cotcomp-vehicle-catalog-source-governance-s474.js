'use strict';

const VERSION='ays-cotcomp-s474-vehicle-catalog-source-governance-v1.0';

const SOURCES=Object.freeze({
  SAT_GT_2026:Object.freeze({
    sourceId:'SAT_GT_2026',
    role:'PRIMARY_LOCAL_BASELINE',
    jurisdiction:'GT',
    authority:'OFFICIAL_GOVERNMENT',
    sourceFamily:'SAT_VEHICLE_TAX_VALUE_TABLES_AND_RFV',
    provides:Object.freeze(['vehicleType','brand','line']),
    yearHandling:'SEPARATE_CONTROLLED_YEAR_FIELD',
    publicBulkEndpointVerified:false,
    snapshotMaterialized:false,
    quoteEligibilityAuthority:false,
    notes:'Official Guatemala vehicle tax/RFV material is the primary local identity baseline; annual tax-value tables are not treated as insurer quote-eligibility rules.'
  }),
  NHTSA_VPIC:Object.freeze({
    sourceId:'NHTSA_VPIC',
    role:'SECONDARY_NORMALIZATION',
    jurisdiction:'US_GLOBAL_MANUFACTURER_SUBMISSIONS',
    authority:'OFFICIAL_GOVERNMENT',
    sourceFamily:'VPIC_API',
    provides:Object.freeze(['manufacturer','make','model','vehicleType','modelYearCrossCheck']),
    publicBulkEndpointVerified:true,
    snapshotMaterialized:false,
    quoteEligibilityAuthority:false,
    localMarketAuthority:false,
    notes:'Useful for normalization/VIN/model cross-checks; never overrides Guatemala-local identity or availability.'
  }),
  INSURER_PROVIDER_CATALOGS:Object.freeze({
    sourceId:'INSURER_PROVIDER_CATALOGS',
    role:'QUOTE_ELIGIBILITY_OVERLAY',
    jurisdiction:'GT',
    authority:'PROVIDER_OPERATIONAL',
    sourceFamily:'INSURER_RATER_CATALOGS',
    provides:Object.freeze(['providerSupportedBrandLine','providerSupportedYear','providerSpecificAliases']),
    quoteEligibilityAuthority:true,
    canonicalIdentityAuthority:false,
    runtimeCallsAllowedInThisGate:false,
    notes:'Provider-specific catalogs determine whether a carrier can quote a risk, but do not redefine the shared canonical vehicle identity.'
  }),
  AYS_REVIEWED_ALIASES:Object.freeze({
    sourceId:'AYS_REVIEWED_ALIASES',
    role:'GOVERNED_EXCEPTION_LAYER',
    jurisdiction:'GT',
    authority:'OWNER_REVIEWED',
    sourceFamily:'AYS_CURATED_ALIAS_REGISTRY',
    provides:Object.freeze(['brandAlias','lineAlias','regionalVariant','manualAddition']),
    requiresProvenance:true,
    requiresReviewerCommitment:true,
    canonicalIdentityAuthority:'CONDITIONAL_AFTER_REVIEW',
    notes:'Used only when official/provider sources expose aliases or regional variants that require reconciliation.'
  })
});

const PRECEDENCE=Object.freeze([
  'SAT_GT_2026',
  'AYS_REVIEWED_ALIASES',
  'NHTSA_VPIC',
  'INSURER_PROVIDER_CATALOGS'
]);

function sourcePolicy(){
  return Object.freeze({
    version:VERSION,
    canonicalIdentityBaseline:'SAT_GT_2026',
    canonicalIdentityPrecedence:PRECEDENCE,
    quoteEligibilitySource:'INSURER_PROVIDER_CATALOGS',
    secondaryNormalizationSource:'NHTSA_VPIC',
    exceptionLayer:'AYS_REVIEWED_ALIASES',
    publicDropdownCatalogStrategy:'VERSIONED_LOCAL_SNAPSHOT',
    yearControlStrategy:'SEPARATE_NUMERIC_SELECT',
    modelYearExistenceHardValidation:false,
    unknownOptionStrategy:'OTHER_REQUIRES_REVIEW',
    providerAvailabilityMustRemainSeparate:true,
    publicCatalogMayNotExposeOperationalClientVehicleRecords:true,
    publicCatalogMayNotBeBuiltFromQuoteCorpusAlone:true
  });
}

function validateCandidateCatalog(catalog={}){
  const errors=[];
  if(catalog.jurisdiction!=='GT')errors.push('JURISDICTION_GT_REQUIRED');
  if(catalog.primarySource!=='SAT_GT_2026')errors.push('SAT_PRIMARY_REQUIRED');
  if(!catalog.version)errors.push('VERSION_REQUIRED');
  if(!catalog.digestSha256||!/^[a-f0-9]{64}$/i.test(String(catalog.digestSha256)))errors.push('DIGEST_REQUIRED');
  if(!Array.isArray(catalog.entries)||catalog.entries.length===0)errors.push('ENTRIES_REQUIRED');
  if(catalog.includesRawOperationalClientVehicles===true)errors.push('OPERATIONAL_CLIENT_VEHICLES_FORBIDDEN');
  if(catalog.derivedOnlyFromQuoteCorpus===true)errors.push('QUOTE_CORPUS_ONLY_FORBIDDEN');
  if(catalog.providerEligibilityEmbeddedAsIdentity===true)errors.push('PROVIDER_ELIGIBILITY_MUST_BE_OVERLAY');
  return Object.freeze({ok:errors.length===0,errors:Object.freeze(errors)});
}

function readiness(){
  return Object.freeze({
    version:VERSION,
    sourceGovernanceReady:true,
    satOfficialSourceIdentified:true,
    satSnapshotMaterialized:false,
    nhtsaSecondarySourceIdentified:true,
    providerOverlayContractReady:true,
    reviewedAliasLayerReady:true,
    publicDropdownCatalogReady:false,
    nextBlocker:'SAT_2026_CATALOG_SNAPSHOT_INGESTION_REQUIRED',
    providerOrRaterCalls:0,
    appDataReads:0,
    appDataWrites:0,
    deployment:false,
    productionTouched:false
  });
}

module.exports=Object.freeze({
  VERSION,SOURCES,PRECEDENCE,sourcePolicy,validateCandidateCatalog,readiness
});
