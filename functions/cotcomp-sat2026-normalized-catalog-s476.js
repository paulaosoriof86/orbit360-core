'use strict';

const crypto=require('node:crypto');

const VERSION='ays-cotcomp-s476-sat2026-normalized-catalog-v1.0';
const SOURCE_ID='SAT_GT_2026_IPRIMA_TABLE_91646';
const SOURCE_RAW_SHA256='ea15f79900e013bc3c397c23a154802fc2f62f8de3bf056b53003e03b85ec373';
const CATALOG_VERSION='sat-gt-2026-91646-ea15f799-v1';
const YEAR_COLUMNS=Object.freeze([2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,'REST']);

function clean(v,max=300){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function norm(v){
  return clean(v,260)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toUpperCase().replace(/\s+/g,' ').trim();
}
function compact(v){return norm(v).replace(/[^A-Z0-9]/g,'');}
function sha(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function stableId(prefix,parts){return prefix+'_'+sha(parts.map(norm).join('|')).slice(0,20);}
function moneyToken(v){return /^\d{1,3}(?:,\d{3})*\.\d{2}$|^\d+\.\d{2}$/.test(clean(v,80));}

function parseLine(line,lineNumber=0){
  const raw=String(line||'').trim();
  if(!raw)return null;
  const parts=raw.split(/\s{2,}/).map(x=>x.trim()).filter(Boolean);
  if(parts.length!==24)return null;
  const [type,brand,model,cc,cylinders,doors,fuel,seats,...values]=parts;
  if(!type||!brand||!model)return null;
  if(!/^\d+$/.test(cc)||!/^\d+$/.test(cylinders)||!/^\d+$/.test(doors)||!/^\d+$/.test(seats))return null;
  if(!/^[A-Z]{2}$/i.test(fuel))return null;
  if(values.length!==16||!values.every(moneyToken))return null;
  return Object.freeze({
    lineNumber:Number(lineNumber)||0,
    type:norm(type),
    brand:norm(brand),
    line:norm(model),
    specs:Object.freeze({
      cc:Number(cc),
      cylinders:Number(cylinders),
      doors:Number(doors),
      fuel:norm(fuel),
      seats:Number(seats)
    }),
    valuePresenceByYear:Object.freeze(Object.fromEntries(YEAR_COLUMNS.map((y,i)=>[String(y),Number(values[i].replace(/,/g,''))>0])))
  });
}

function parseText(text){
  const parsed=[];
  const rejectedCandidates=[];
  const sourceLines=String(text||'').split(/\r?\n/);
  sourceLines.forEach((line,i)=>{
    const row=parseLine(line,i+1);
    if(row){parsed.push(row);return;}
    const parts=String(line||'').trim().split(/\s{2,}/).map(x=>x.trim()).filter(Boolean);
    if(parts.length>=20 && /^[A-ZÁÉÍÓÚÜÑ -]+$/i.test(parts[0]||''))rejectedCandidates.push(i+1);
  });
  return Object.freeze({rows:Object.freeze(parsed),sourceLineCount:sourceLines.length,rejectedCandidateLines:Object.freeze(rejectedCandidates)});
}

function variantKey(specs){return [specs.cc,specs.cylinders,specs.doors,specs.fuel,specs.seats].join('|');}

function buildCatalog(parsedRows=[]){
  const groups=new Map();
  for(const row of parsedRows){
    const key=[row.type,row.brand,row.line].join('|');
    const g=groups.get(key)||{
      type:row.type,brand:row.brand,line:row.line,
      sourceRows:0,sourceLineNumbers:[],variants:new Map()
    };
    g.sourceRows++;
    g.sourceLineNumbers.push(row.lineNumber);
    const vk=variantKey(row.specs);
    if(!g.variants.has(vk))g.variants.set(vk,row.specs);
    groups.set(key,g);
  }

  const entries=[...groups.values()].map(g=>Object.freeze({
    typeId:stableId('vtype',[g.type]),
    type:g.type,
    brandId:stableId('vbrand',[g.brand]),
    brand:g.brand,
    modelId:stableId('vmodel',[g.type,g.brand,g.line]),
    line:g.line,
    sourceRowCount:g.sourceRows,
    specVariants:Object.freeze([...g.variants.values()].sort((a,b)=>variantKey(a).localeCompare(variantKey(b)))),
    provenance:Object.freeze({
      sourceId:SOURCE_ID,
      sourceRawSha256:SOURCE_RAW_SHA256,
      catalogVersion:CATALOG_VERSION
    })
  })).sort((a,b)=>
    a.type.localeCompare(b.type)||
    a.brand.localeCompare(b.brand)||
    a.line.localeCompare(b.line)
  );

  const brandSet=new Set(entries.map(x=>x.brand));
  const typeSet=new Set(entries.map(x=>x.type));
  const brandLineTypeMap=new Map();
  for(const e of entries){
    const k=[e.brand,e.line].join('|');
    const s=brandLineTypeMap.get(k)||new Set();
    s.add(e.type);brandLineTypeMap.set(k,s);
  }
  const crossTypeBrandLinePairs=[...brandLineTypeMap.values()].filter(x=>x.size>1).length;
  const sourceRows=parsedRows.length;
  const catalogBody={
    schemaVersion:'ays-cotcomp-sat-vehicle-catalog-v1.0',
    catalogVersion:CATALOG_VERSION,
    jurisdiction:'GT',
    authority:'SAT_GUATEMALA',
    sourceId:SOURCE_ID,
    sourceRawSha256:SOURCE_RAW_SHA256,
    hardModelYearValidation:false,
    yearControlStrategy:'SEPARATE_NUMERIC_SELECT',
    entries
  };
  const catalogDigestSha256=sha(JSON.stringify(catalogBody));

  return Object.freeze({
    ...catalogBody,
    catalogDigestSha256,
    metrics:Object.freeze({
      parsedSourceRows:sourceRows,
      uniqueTypeBrandLineEntries:entries.length,
      duplicateSourceRowsMerged:sourceRows-entries.length,
      uniqueVehicleTypes:typeSet.size,
      uniqueBrands:brandSet.size,
      uniqueBrandLinePairs:brandLineTypeMap.size,
      crossTypeBrandLinePairs
    })
  });
}

function exact(catalog,query={}){
  const type=norm(query.type),brand=norm(query.brand),line=norm(query.line);
  return catalog.entries.filter(x=>(!type||x.type===type)&&x.brand===brand&&x.line===line);
}
function prefix(catalog,query={}){
  const type=norm(query.type),brand=norm(query.brand),line=norm(query.line);
  return catalog.entries.filter(x=>(!type||x.type===type)&&x.brand===brand&&x.line.startsWith(line));
}
function compactPrefix(catalog,query={}){
  const type=norm(query.type),brand=norm(query.brand),needle=compact(query.line);
  return catalog.entries.filter(x=>(!type||x.type===type)&&x.brand===brand&&compact(x.line).startsWith(needle));
}

function regressionProbes(catalog){
  const probes={
    toyotaCorollaExact:exact(catalog,{type:'AUTOMOVIL',brand:'TOYOTA',line:'COROLLA'}).length,
    toyotaYarisExact:exact(catalog,{type:'AUTOMOVIL',brand:'TOYOTA',line:'YARIS'}).length,
    mazdaCx5Prefix:prefix(catalog,{type:'CAMIONETA',brand:'MAZDA',line:'CX-5'}).length,
    hondaCrvCompactPrefix:compactPrefix(catalog,{type:'CAMIONETA',brand:'HONDA',line:'CRV'}).length,
    bajajPulsarPrefix:prefix(catalog,{type:'MOTO',brand:'BAJAJ',line:'PULSAR'}).length
  };
  return Object.freeze(probes);
}

function validatePhysicalCatalog(catalog={}){
  const errors=[];
  const m=catalog.metrics||{};
  if(catalog.catalogVersion!==CATALOG_VERSION)errors.push('CATALOG_VERSION_INVALID');
  if(catalog.sourceRawSha256!==SOURCE_RAW_SHA256)errors.push('SOURCE_DIGEST_INVALID');
  if(Number(m.parsedSourceRows)!==3679)errors.push('PARSED_ROWS_INVALID');
  if(Number(m.uniqueTypeBrandLineEntries)!==3436)errors.push('UNIQUE_IDENTITIES_INVALID');
  if(Number(m.duplicateSourceRowsMerged)!==243)errors.push('DUPLICATE_MERGE_INVALID');
  if(Number(m.uniqueVehicleTypes)!==31)errors.push('TYPE_COUNT_INVALID');
  if(Number(m.uniqueBrands)!==223)errors.push('BRAND_COUNT_INVALID');
  if(Number(m.uniqueBrandLinePairs)!==3289)errors.push('BRAND_LINE_COUNT_INVALID');
  if(Number(m.crossTypeBrandLinePairs)!==101)errors.push('CROSS_TYPE_COUNT_INVALID');
  if(!/^[a-f0-9]{64}$/.test(clean(catalog.catalogDigestSha256,80)))errors.push('CATALOG_DIGEST_INVALID');
  const p=regressionProbes(catalog);
  if(p.toyotaCorollaExact<1)errors.push('TOYOTA_COROLLA_REQUIRED');
  if(p.toyotaYarisExact<1)errors.push('TOYOTA_YARIS_REQUIRED');
  if(p.mazdaCx5Prefix<1)errors.push('MAZDA_CX5_REQUIRED');
  if(p.hondaCrvCompactPrefix<1)errors.push('HONDA_CRV_ALIAS_CANDIDATE_REQUIRED');
  return Object.freeze({ok:errors.length===0,errors:Object.freeze(errors),probes:p});
}

function readiness(){
  return Object.freeze({
    version:VERSION,
    parserReady:true,
    expectedSourceRawSha256:SOURCE_RAW_SHA256,
    catalogVersion:CATALOG_VERSION,
    physicalCatalogBuilt:false,
    publicDropdownReleased:false,
    quoteEligibilityOverlayBuilt:false,
    nextBlocker:'S476_PHYSICAL_NORMALIZATION_REQUIRED',
    appDataReads:0,appDataWrites:0,providerOrRaterCalls:0,productionTouched:false
  });
}

module.exports=Object.freeze({
  VERSION,SOURCE_ID,SOURCE_RAW_SHA256,CATALOG_VERSION,YEAR_COLUMNS,
  clean,norm,compact,sha,stableId,moneyToken,parseLine,parseText,buildCatalog,
  exact,prefix,compactPrefix,regressionProbes,validatePhysicalCatalog,readiness
});
