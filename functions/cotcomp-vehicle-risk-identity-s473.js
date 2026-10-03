'use strict';

const crypto=require('node:crypto');
const corpus=require('./cotcomp-real-quote-corpus-s471');

const VERSION='ays-cotcomp-s473-risk-identity-catalog-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const JOURNEY_ID='GT_AUTO_MOTO_HYBRID';

const W5_CANONICAL_RISK=Object.freeze({
  country:'GT',
  product:'AUTO',
  brand:'TOYOTA',
  model:'COROLLA',
  year:2006
});

const PUBLIC_CONTROL_CONTRACT=Object.freeze({
  brand:Object.freeze({
    id:'vehicleBrandId',
    label:'Marca',
    control:'searchable-select',
    required:true,
    optionsSource:'AUTHORITATIVE_VEHICLE_CATALOG',
    allowOther:true,
    otherState:'OTHER_REQUIRES_REVIEW'
  }),
  model:Object.freeze({
    id:'vehicleModelId',
    label:'Línea / modelo',
    control:'searchable-select',
    required:true,
    dependsOn:'vehicleBrandId',
    optionsSource:'AUTHORITATIVE_VEHICLE_CATALOG',
    allowOther:true,
    otherState:'OTHER_REQUIRES_REVIEW'
  }),
  year:Object.freeze({
    id:'vehicleYear',
    label:'Año',
    control:'select',
    required:true,
    dependsOn:'vehicleBrandId+vehicleModelId',
    optionsSource:'AUTHORITATIVE_VEHICLE_CATALOG',
    allowOther:false
  })
});

function clean(v,max=260){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function sha(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function norm(v){
  return clean(v,220)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
}
function slug(v){return norm(v).replace(/\s+/g,'_');}

function parseLegacyLineModel(value){
  const raw=clean(value,220);
  const m=raw.match(/^(.*?)(?:\s+|[-/])((?:19|20)\d{2})$/);
  if(!m)return {ok:false,code:'YEAR_REQUIRED_SEPARATELY',raw};
  const model=clean(m[1],180);
  const year=Number(m[2]);
  if(!model||year<1900||year>2099)return {ok:false,code:'LEGACY_LINE_MODEL_INVALID',raw};
  return {ok:true,model,year};
}

function canonicalizeRisk(input={}){
  const brand=clean(input.brand||input.brandLabel,180);
  let model=clean(input.model||input.modelLabel,180);
  let year=Number(input.year||input.vehicleYear||0);

  if((!model||!year)&&clean(input.lineModel,220)){
    const parsed=parseLegacyLineModel(input.lineModel);
    if(!parsed.ok)return parsed;
    model=model||parsed.model;
    year=year||parsed.year;
  }

  if(!brand)return {ok:false,code:'BRAND_REQUIRED'};
  if(!model)return {ok:false,code:'MODEL_REQUIRED'};
  if(!Number.isInteger(year)||year<1900||year>2099)return {ok:false,code:'YEAR_REQUIRED_SEPARATELY'};

  const canonical=Object.freeze({
    country:clean(input.country||'GT',8).toUpperCase(),
    product:clean(input.product||'AUTO',40).toUpperCase(),
    brand:norm(brand),
    model:norm(model),
    year
  });
  return Object.freeze({
    ok:true,
    value:canonical,
    identityKey:[canonical.country,canonical.product,canonical.brand,canonical.model,canonical.year].join('|'),
    identitySha256:sha([canonical.country,canonical.product,canonical.brand,canonical.model,canonical.year].join('|'))
  });
}

function exactCorpusMatches(identity,clusters=corpus.CLUSTERS){
  const c=canonicalizeRisk(identity);
  if(!c.ok)return c;
  const matches=clusters.filter(x=>
    norm(x.country)===c.value.country &&
    norm(x.product)===c.value.product &&
    norm(x.brand)===c.value.brand &&
    norm(x.lineModel)===c.value.model &&
    Number(x.year)===c.value.year
  );
  return Object.freeze({
    ok:true,
    identity:c.value,
    matches:Object.freeze(matches),
    matchCount:matches.length,
    exactMatch:matches.length===1,
    code:matches.length===1?'EXACT_DOCUMENTARY_CLUSTER_MATCH':
      matches.length===0?'MATCHING_REAL_PROPOSAL_EVIDENCE_REQUIRED':'AMBIGUOUS_DOCUMENTARY_CLUSTER_MATCH'
  });
}

function deriveEvidenceFixtureCatalog(clusters=corpus.CLUSTERS){
  const entries=[];
  for(const c of clusters){
    entries.push({
      country:norm(c.country),
      product:norm(c.product),
      brandId:slug(c.brand),
      brandLabel:clean(c.brand,120),
      modelId:slug(c.lineModel),
      modelLabel:clean(c.lineModel,160),
      year:Number(c.year),
      evidenceClusterId:c.clusterId
    });
  }
  entries.sort((a,b)=>
    a.country.localeCompare(b.country) ||
    a.product.localeCompare(b.product) ||
    a.brandLabel.localeCompare(b.brandLabel) ||
    a.modelLabel.localeCompare(b.modelLabel) ||
    a.year-b.year
  );
  const digest=sha(JSON.stringify(entries));
  return Object.freeze({
    schemaVersion:'ays-cotcomp-vehicle-catalog-fixture-v1.0',
    source:'REAL_QUOTE_CORPUS_FIXTURE_ONLY',
    authoritative:false,
    publicReleaseReady:false,
    entries:Object.freeze(entries),
    digestSha256:digest
  });
}

function validateCatalogSelection(selection={},catalog={}){
  if(catalog.authoritative!==true)return {ok:false,code:'AUTHORITATIVE_VEHICLE_CATALOG_REQUIRED'};
  if(!clean(catalog.version,80)||!clean(catalog.digestSha256,80))return {ok:false,code:'CATALOG_VERSION_DIGEST_REQUIRED'};
  const brandId=clean(selection.vehicleBrandId,120);
  const modelId=clean(selection.vehicleModelId,120);
  const year=Number(selection.vehicleYear);
  if(!brandId||!modelId||!Number.isInteger(year))return {ok:false,code:'CATALOG_SELECTION_REQUIRED'};
  const entries=Array.isArray(catalog.entries)?catalog.entries:[];
  const row=entries.find(x=>
    clean(x.brandId,120)===brandId &&
    clean(x.modelId,120)===modelId &&
    Number(x.year)===year
  );
  if(!row)return {ok:false,code:'CATALOG_SELECTION_NOT_FOUND'};
  return {
    ok:true,
    row,
    canonical:canonicalizeRisk({
      country:row.country||'GT',
      product:row.product||'AUTO',
      brand:row.brandLabel,
      model:row.modelLabel,
      year:row.year
    })
  };
}

function buildCapturedFieldsFromCatalog(selection={},catalog={}){
  const v=validateCatalogSelection(selection,catalog);
  if(!v.ok)return v;
  const c=v.canonical.value;
  return Object.freeze({
    ok:true,
    capturedFields:Object.freeze({
      brand:clean(v.row.brandLabel,180),
      lineModel:clean(v.row.modelLabel,180)+' '+String(c.year),
      vehicleYear:c.year,
      vehicleIdentity:Object.freeze({
        brandId:clean(v.row.brandId,120),
        brandLabel:clean(v.row.brandLabel,180),
        modelId:clean(v.row.modelId,120),
        modelLabel:clean(v.row.modelLabel,180),
        year:c.year,
        country:c.country,
        product:c.product,
        catalogVersion:clean(catalog.version,80),
        catalogDigestSha256:clean(catalog.digestSha256,80)
      })
    })
  });
}

function readiness(){
  const current=canonicalizeRisk(W5_CANONICAL_RISK);
  const match=exactCorpusMatches(W5_CANONICAL_RISK);
  const fixture=deriveEvidenceFixtureCatalog();
  return Object.freeze({
    version:VERSION,
    projectId:PROJECT_ID,
    tenantId:TENANT_ID,
    journeyId:JOURNEY_ID,
    canonicalW5Risk:current.value,
    canonicalW5IdentityReady:current.ok===true,
    currentW5CorpusMatchCount:match.matchCount,
    currentW5EvidenceCode:match.code,
    dropdownControlContractReady:true,
    primaryFreeTextBrandModelAllowed:false,
    yearSeparated:true,
    backwardCompatibilityBridgeReady:true,
    evidenceFixtureCatalogReady:true,
    evidenceFixtureCatalogAuthoritative:false,
    authoritativeVehicleCatalogReady:false,
    publicDropdownReleaseReady:false,
    releaseBlocker:'AUTHORITATIVE_VEHICLE_CATALOG_REQUIRED',
    appDataReads:0,
    appDataWrites:0,
    productionTouched:false,
    providerOrRaterCalls:0
  });
}

module.exports=Object.freeze({
  VERSION,PROJECT_ID,TENANT_ID,JOURNEY_ID,W5_CANONICAL_RISK,PUBLIC_CONTROL_CONTRACT,
  clean,sha,norm,slug,parseLegacyLineModel,canonicalizeRisk,exactCorpusMatches,
  deriveEvidenceFixtureCatalog,validateCatalogSelection,buildCapturedFieldsFromCatalog,readiness
});
