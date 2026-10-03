'use strict';

const s476=require('./cotcomp-sat2026-normalized-catalog-s476');

const VERSION='ays-cotcomp-s477-dropdown-adapter-alias-readiness-v1.0';
const FALLBACK='OTHER_REQUIRES_REVIEW';

const REVIEW_CANDIDATES=Object.freeze([
  Object.freeze({
    candidateId:'GT_ALIAS_CX5',
    country:'GT',
    sourceLabel:'CX-5',
    brand:'MAZDA',
    strategy:'PREFIX',
    status:'REVIEW_REQUIRED_MULTI_CANDIDATE'
  }),
  Object.freeze({
    candidateId:'GT_ALIAS_CRV',
    country:'GT',
    sourceLabel:'CRV',
    brand:'HONDA',
    strategy:'COMPACT_PREFIX',
    status:'REVIEW_REQUIRED_FORMAT_VARIANT'
  }),
  Object.freeze({
    candidateId:'GT_ALIAS_PULSAR_NS400Z',
    country:'GT',
    sourceLabel:'PULSAR NS 400Z',
    brand:'BAJAJ',
    strategy:'PREFIX',
    status:'REVIEW_REQUIRED_MISSING_SAT'
  })
]);

function clean(v,max=220){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function norm(v){return s476.norm(v);}

function buildApprovedAliasIndex(aliasRegistry=[]){
  const map=new Map();
  for(const row of aliasRegistry){
    if(!row||row.status!=='APPROVED')continue;
    const brand=norm(row.brand);
    const alias=norm(row.alias);
    const type=norm(row.type);
    const key=[type,brand,alias].join('|');
    const canonicalModelIds=Array.isArray(row.canonicalModelIds)
      ? [...new Set(row.canonicalModelIds.map(x=>clean(x,120)).filter(Boolean))]
      : [];
    if(!brand||!alias||canonicalModelIds.length===0)continue;
    map.set(key,Object.freeze({
      type,brand,alias,
      canonicalModelIds:Object.freeze(canonicalModelIds),
      approvalCommitmentSha256:clean(row.approvalCommitmentSha256,80),
      provenance:clean(row.provenance,180)
    }));
  }
  return map;
}

function listBrands(catalog,{allowedTypes=[]}={}){
  const allow=new Set((allowedTypes||[]).map(norm).filter(Boolean));
  const rows=catalog.entries.filter(e=>allow.size===0||allow.has(e.type));
  const byId=new Map();
  for(const e of rows){
    if(!byId.has(e.brandId))byId.set(e.brandId,Object.freeze({brandId:e.brandId,label:e.brand}));
  }
  return Object.freeze([...byId.values()].sort((a,b)=>a.label.localeCompare(b.label)));
}

function searchModels(catalog,{brandId,query='',allowedTypes=[],limit=50,aliasRegistry=[]}={}){
  const bid=clean(brandId,120);
  if(!bid)return Object.freeze({ok:false,code:'BRAND_SELECTION_REQUIRED',options:Object.freeze([])});
  const q=norm(query);
  const allow=new Set((allowedTypes||[]).map(norm).filter(Boolean));
  let rows=catalog.entries.filter(e=>e.brandId===bid&&(allow.size===0||allow.has(e.type)));
  if(q)rows=rows.filter(e=>e.line.includes(q)||s476.compact(e.line).includes(s476.compact(q)));
  const max=Math.max(1,Math.min(Number(limit)||50,100));
  const options=rows.slice(0,max).map(e=>Object.freeze({
    modelId:e.modelId,
    typeId:e.typeId,
    type:e.type,
    brandId:e.brandId,
    brand:e.brand,
    label:e.line,
    source:'SAT_GT_2026',
    catalogVersion:catalog.catalogVersion,
    catalogDigestSha256:catalog.catalogDigestSha256
  }));

  const aliases=buildApprovedAliasIndex(aliasRegistry);
  for(const a of aliases.values()){
    const brandRow=catalog.entries.find(e=>e.brandId===bid);
    if(!brandRow||a.brand!==brandRow.brand)continue;
    if(q && !a.alias.includes(q) && !s476.compact(a.alias).includes(s476.compact(q)))continue;
    const mapped=catalog.entries.filter(e=>a.canonicalModelIds.includes(e.modelId)&&(allow.size===0||allow.has(e.type)));
    if(mapped.length===0)continue;
    options.unshift(Object.freeze({
      modelId:'alias:'+a.alias,
      typeId:a.type||'MULTI',
      type:a.type||'MULTI',
      brandId:bid,
      brand:a.brand,
      label:a.alias,
      source:'AYS_REVIEWED_ALIAS',
      mappedCanonicalModelIds:Object.freeze(mapped.map(x=>x.modelId)),
      approvalCommitmentSha256:a.approvalCommitmentSha256,
      catalogVersion:catalog.catalogVersion,
      catalogDigestSha256:catalog.catalogDigestSha256
    }));
  }

  return Object.freeze({
    ok:true,
    code:options.length?'OPTIONS_AVAILABLE':FALLBACK,
    options:Object.freeze(options.slice(0,max)),
    fallback:FALLBACK
  });
}

function selectModel(catalog,{brandId,modelId,vehicleYear}={},aliasRegistry=[]){
  const bid=clean(brandId,120),mid=clean(modelId,160),year=Number(vehicleYear);
  if(!bid||!mid)return Object.freeze({ok:false,code:'BRAND_MODEL_SELECTION_REQUIRED'});
  if(!Number.isInteger(year)||year<1900||year>2200)return Object.freeze({ok:false,code:'YEAR_SELECTION_REQUIRED'});

  const exact=catalog.entries.find(e=>e.brandId===bid&&e.modelId===mid);
  if(exact){
    return Object.freeze({
      ok:true,
      state:'CANONICAL_SAT_SELECTION',
      vehicleYear:year,
      vehicleIdentity:Object.freeze({
        typeId:exact.typeId,type:exact.type,
        brandId:exact.brandId,brandLabel:exact.brand,
        modelId:exact.modelId,modelLabel:exact.line,
        year,
        catalogVersion:catalog.catalogVersion,
        catalogDigestSha256:catalog.catalogDigestSha256,
        source:'SAT_GT_2026'
      })
    });
  }

  if(mid.startsWith('alias:')){
    const alias=norm(mid.slice(6));
    const brand=catalog.entries.find(e=>e.brandId===bid)?.brand||'';
    const approved=buildApprovedAliasIndex(aliasRegistry);
    const matches=[...approved.values()].filter(a=>a.brand===brand&&a.alias===alias);
    if(matches.length!==1)return Object.freeze({ok:false,code:'APPROVED_ALIAS_REQUIRED'});
    return Object.freeze({
      ok:true,
      state:'APPROVED_ALIAS_SELECTION',
      vehicleYear:year,
      vehicleIdentity:Object.freeze({
        brandId:bid,brandLabel:brand,
        aliasLabel:alias,
        mappedCanonicalModelIds:matches[0].canonicalModelIds,
        year,
        catalogVersion:catalog.catalogVersion,
        catalogDigestSha256:catalog.catalogDigestSha256,
        source:'AYS_REVIEWED_ALIAS',
        approvalCommitmentSha256:matches[0].approvalCommitmentSha256
      })
    });
  }

  return Object.freeze({ok:false,code:FALLBACK});
}

function evaluateKnownEvidenceGaps(catalog){
  const probes={
    yarisExact:s476.exact(catalog,{brand:'TOYOTA',line:'YARIS'}).length,
    corollaExact:s476.exact(catalog,{brand:'TOYOTA',line:'COROLLA'}).length,
    cx5Exact:s476.exact(catalog,{brand:'MAZDA',line:'CX-5'}).length,
    cx5Prefix:s476.prefix(catalog,{brand:'MAZDA',line:'CX-5'}).length,
    crvExact:s476.exact(catalog,{brand:'HONDA',line:'CRV'}).length,
    crvCompactPrefix:s476.compactPrefix(catalog,{brand:'HONDA',line:'CRV'}).length,
    pulsarExact:s476.exact(catalog,{brand:'BAJAJ',line:'PULSAR NS 400Z'}).length,
    pulsarPrefix:s476.prefix(catalog,{brand:'BAJAJ',line:'PULSAR'}).length
  };
  return Object.freeze({
    probes:Object.freeze(probes),
    candidates:Object.freeze(REVIEW_CANDIDATES.map(c=>{
      let candidateCount=0;
      if(c.candidateId==='GT_ALIAS_CX5')candidateCount=probes.cx5Prefix;
      if(c.candidateId==='GT_ALIAS_CRV')candidateCount=probes.crvCompactPrefix;
      if(c.candidateId==='GT_ALIAS_PULSAR_NS400Z')candidateCount=probes.pulsarPrefix;
      return Object.freeze({...c,candidateCount,approved:false});
    }))
  });
}

function readiness(catalog){
  const gaps=evaluateKnownEvidenceGaps(catalog);
  return Object.freeze({
    version:VERSION,
    catalogVersion:catalog.catalogVersion,
    catalogDigestSha256:catalog.catalogDigestSha256,
    adapterContractReady:true,
    searchableBrandSelectReady:true,
    dependentModelSearchReady:true,
    yearSeparateReady:true,
    exactSatSelectionsReady:true,
    otherReviewFallbackReady:true,
    approvedAliasCount:0,
    pendingAliasCandidates:gaps.candidates.length,
    publicReleaseReady:false,
    blockers:Object.freeze([
      'GT_AUTO_MOTO_ALLOWED_TYPE_SCOPE_REQUIRED',
      'REVIEWED_ALIAS_DECISIONS_REQUIRED',
      'CATALOG_DELIVERY_SURFACE_REQUIRED'
    ]),
    providerEligibilityEmbedded:false,
    appDataReads:0,
    appDataWrites:0,
    deployment:false,
    productionTouched:false
  });
}

module.exports=Object.freeze({
  VERSION,FALLBACK,REVIEW_CANDIDATES,clean,norm,buildApprovedAliasIndex,
  listBrands,searchModels,selectModel,evaluateKnownEvidenceGaps,readiness
});
