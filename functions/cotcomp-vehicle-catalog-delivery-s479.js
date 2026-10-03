'use strict';

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {onRequest}=require('firebase-functions/v2/https');

const VERSION='ays-cotcomp-s479-catalog-delivery-lab-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const REGION='us-central1';
const FUNCTION_NAME='cotcompVehicleCatalogS479';
const EXPECTED_CATALOG_VERSION='sat-gt-2026-91646-ea15f799-v1';
const EXPECTED_CATALOG_DIGEST='89a77e66025945d015cc51704441a97437286022cafeef4995962fd750358df8';
const EXPECTED_ENTRY_COUNT=2216;
const EXPECTED_BRAND_COUNT=119;
const ALLOWED_TYPES=Object.freeze(['AUTOMOVIL','CAMIONETA','PICK UP','MOTO']);
const VEHICLE_CLASSES=Object.freeze({
  AUTO_LIGHT:Object.freeze({label:'Automóvil / SUV / Pickup',types:Object.freeze(['AUTOMOVIL','CAMIONETA','PICK UP'])}),
  MOTO:Object.freeze({label:'Motocicleta',types:Object.freeze(['MOTO'])})
});
const MIN_YEAR=1900;
const MAX_YEAR=2026;
const DEFAULT_DATA_PATH=path.join(__dirname,'data','cotcomp-vehicle-public-catalog-s479.json');
const ALLOWED_ORIGINS=Object.freeze([
  'https://ays-orbit-360-lab.web.app',
  'https://ays-orbit-360-lab.firebaseapp.com',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
]);

function clean(v,max=200){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function norm(v){return clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();}
function sha(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function jsonDigest(v){return sha(JSON.stringify(v));}
function publicSubsetDigestPayload(catalog={}){
  return {
    schemaVersion:catalog.schemaVersion,
    catalogVersion:catalog.catalogVersion,
    catalogDigestSha256:catalog.catalogDigestSha256,
    sourceRawSha256:catalog.sourceRawSha256,
    allowedSatTypes:catalog.allowedSatTypes,
    entries:catalog.entries
  };
}
function computePublicSubsetDigest(catalog={}){return jsonDigest(publicSubsetDigestPayload(catalog));}
function classTypes(vehicleClass){
  const key=clean(vehicleClass,40).toUpperCase();
  if(!key)return ALLOWED_TYPES;
  return VEHICLE_CLASSES[key]?VEHICLE_CLASSES[key].types:null;
}
function validateCatalog(catalog={}){
  const errors=[];
  if(catalog.schemaVersion!=='ays-cotcomp-vehicle-public-catalog-v1.0')errors.push('SCHEMA_INVALID');
  if(catalog.catalogVersion!==EXPECTED_CATALOG_VERSION)errors.push('CATALOG_VERSION_INVALID');
  if(catalog.catalogDigestSha256!==EXPECTED_CATALOG_DIGEST)errors.push('CATALOG_DIGEST_INVALID');
  if(!Array.isArray(catalog.allowedSatTypes)||JSON.stringify(catalog.allowedSatTypes)!==JSON.stringify(ALLOWED_TYPES))errors.push('ALLOWED_TYPES_INVALID');
  if(!Array.isArray(catalog.entries)||catalog.entries.length!==EXPECTED_ENTRY_COUNT)errors.push('ENTRY_COUNT_INVALID');
  if(Array.isArray(catalog.entries)){
    const brands=new Set();
    for(const e of catalog.entries){
      if(!ALLOWED_TYPES.includes(clean(e.type,40)))errors.push('OUT_OF_SCOPE_TYPE');
      if(!clean(e.typeId,80)||!clean(e.brandId,80)||!clean(e.modelId,100)||!clean(e.brand,120)||!clean(e.line,180))errors.push('ENTRY_FIELDS_INVALID');
      brands.add(clean(e.brandId,80));
    }
    if(brands.size!==EXPECTED_BRAND_COUNT)errors.push('BRAND_COUNT_INVALID');
  }
  if(!/^[a-f0-9]{64}$/.test(clean(catalog.publicSubsetDigestSha256,80)))errors.push('PUBLIC_DIGEST_INVALID');
  else if(catalog.publicSubsetDigestSha256!==computePublicSubsetDigest(catalog))errors.push('PUBLIC_DIGEST_MISMATCH');
  return Object.freeze({ok:errors.length===0,errors:Object.freeze([...new Set(errors)])});
}
function loadCatalog(filePath=process.env.COTCOMP_S479_CATALOG_PATH||DEFAULT_DATA_PATH){
  const raw=fs.readFileSync(filePath,'utf8');
  const catalog=JSON.parse(raw);
  const v=validateCatalog(catalog);
  if(!v.ok)throw new Error('S479_CATALOG_INVALID:'+v.errors.join(','));
  return Object.freeze(catalog);
}
function indexCatalog(catalog){
  const brands=new Map();
  const byBrand=new Map();
  const byModel=new Map();
  for(const e of catalog.entries){
    if(!brands.has(e.brandId))brands.set(e.brandId,{brandId:e.brandId,label:e.brand});
    if(!byBrand.has(e.brandId))byBrand.set(e.brandId,[]);
    byBrand.get(e.brandId).push(e);
    byModel.set(e.modelId,e);
  }
  for(const rows of byBrand.values())rows.sort((a,b)=>a.line.localeCompare(b.line)||a.type.localeCompare(b.type));
  const brandList=[...brands.values()].sort((a,b)=>a.label.localeCompare(b.label));
  return Object.freeze({brands:Object.freeze(brandList),byBrand,byModel});
}
function securityHeaders(res,catalog){
  res.set('X-Content-Type-Options','nosniff');
  res.set('X-Frame-Options','DENY');
  res.set('Referrer-Policy','no-referrer');
  res.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  res.set('Cache-Control','public, max-age=3600, s-maxage=86400');
  res.set('ETag','"'+catalog.publicSubsetDigestSha256+'"');
}
function cors(req,res){
  const origin=clean(req.get('origin'),300);
  if(!origin)return true;
  if(!ALLOWED_ORIGINS.includes(origin))return false;
  res.set('Access-Control-Allow-Origin',origin);
  res.set('Vary','Origin');
  res.set('Access-Control-Allow-Methods','GET, OPTIONS');
  res.set('Access-Control-Allow-Headers','Content-Type, If-None-Match');
  res.set('Access-Control-Max-Age','3600');
  return true;
}
function paginate(rows,limitRaw){
  const limit=Math.max(1,Math.min(Number(limitRaw)||100,200));
  return rows.slice(0,limit);
}
function years(){
  const out=[];
  for(let y=MAX_YEAR;y>=MIN_YEAR;y--)out.push(y);
  return Object.freeze(out);
}
function createHandler(catalog){
  const v=validateCatalog(catalog);
  if(!v.ok)throw new Error('S479_HANDLER_CATALOG_INVALID:'+v.errors.join(','));
  const idx=indexCatalog(catalog);
  return function handler(req,res){
    securityHeaders(res,catalog);
    if(!cors(req,res))return res.status(403).json({ok:false,code:'ORIGIN_NOT_ALLOWED'});
    if(req.method==='OPTIONS')return res.status(204).send('');
    if(req.method!=='GET'){res.set('Allow','GET, OPTIONS');return res.status(405).json({ok:false,code:'METHOD_NOT_ALLOWED'});}
    if(clean(req.get('if-none-match'),100)==='"'+catalog.publicSubsetDigestSha256+'"')return res.status(304).send('');

    const op=clean(req.query&&req.query.op,40).toLowerCase()||'meta';
    const vehicleClass=clean(req.query&&req.query.vehicleClass,40).toUpperCase();
    const types=classTypes(vehicleClass);
    if(vehicleClass&&!types)return res.status(400).json({ok:false,code:'VEHICLE_CLASS_INVALID'});

    if(op==='meta'){
      return res.status(200).json({
        ok:true,
        version:VERSION,
        projectId:PROJECT_ID,
        tenantId:TENANT_ID,
        catalogVersion:catalog.catalogVersion,
        catalogDigestSha256:catalog.catalogDigestSha256,
        publicSubsetDigestSha256:catalog.publicSubsetDigestSha256,
        allowedSatTypes:ALLOWED_TYPES,
        vehicleClasses:VEHICLE_CLASSES,
        entryCount:catalog.entries.length,
        brandCount:idx.brands.length,
        yearPolicy:{min:MIN_YEAR,max:MAX_YEAR,hardModelYearValidation:false},
        providerEligibilityEmbedded:false,
        appDataSource:false,
        labOnly:true
      });
    }

    if(op==='brands'){
      const q=norm(req.query&&req.query.q);
      const allowed=new Set(types);
      const visibleBrandIds=new Set(catalog.entries.filter(e=>allowed.has(e.type)).map(e=>e.brandId));
      let rows=idx.brands.filter(b=>visibleBrandIds.has(b.brandId));
      if(q)rows=rows.filter(b=>norm(b.label).includes(q));
      return res.status(200).json({ok:true,vehicleClass:vehicleClass||null,items:paginate(rows,req.query&&req.query.limit),fallback:'OTHER_REQUIRES_REVIEW'});
    }

    if(op==='models'){
      const brandId=clean(req.query&&req.query.brandId,100);
      if(!brandId)return res.status(400).json({ok:false,code:'BRAND_SELECTION_REQUIRED'});
      const q=norm(req.query&&req.query.q);
      const allowed=new Set(types);
      let rows=(idx.byBrand.get(brandId)||[]).filter(e=>allowed.has(e.type));
      if(q)rows=rows.filter(e=>norm(e.line).includes(q)||norm(e.line).replace(/[^A-Z0-9]/g,'').includes(q.replace(/[^A-Z0-9]/g,'')));
      const items=paginate(rows,req.query&&req.query.limit).map(e=>({
        modelId:e.modelId,typeId:e.typeId,type:e.type,brandId:e.brandId,brand:e.brand,label:e.line,
        catalogVersion:catalog.catalogVersion,catalogDigestSha256:catalog.catalogDigestSha256
      }));
      return res.status(200).json({ok:true,vehicleClass:vehicleClass||null,brandId,items,fallback:'OTHER_REQUIRES_REVIEW'});
    }

    if(op==='years'){
      return res.status(200).json({ok:true,items:years(),policy:'DECLARED_YEAR_NOT_HARD_MODEL_YEAR_EXISTENCE'});
    }

    if(op==='resolve'){
      const brandId=clean(req.query&&req.query.brandId,100);
      const modelId=clean(req.query&&req.query.modelId,120);
      const year=Number(req.query&&req.query.vehicleYear);
      if(!brandId||!modelId)return res.status(400).json({ok:false,code:'BRAND_MODEL_SELECTION_REQUIRED'});
      if(!Number.isInteger(year)||year<MIN_YEAR||year>MAX_YEAR)return res.status(400).json({ok:false,code:'YEAR_SELECTION_REQUIRED'});
      const row=idx.byModel.get(modelId);
      if(!row||row.brandId!==brandId||!types.includes(row.type))return res.status(404).json({ok:false,code:'CATALOG_SELECTION_NOT_FOUND',fallback:'OTHER_REQUIRES_REVIEW'});
      return res.status(200).json({
        ok:true,
        vehicleIdentity:{
          typeId:row.typeId,type:row.type,brandId:row.brandId,brandLabel:row.brand,
          modelId:row.modelId,modelLabel:row.line,year,
          catalogVersion:catalog.catalogVersion,catalogDigestSha256:catalog.catalogDigestSha256,
          source:'SAT_GT_2026'
        },
        providerEligibilityEmbedded:false
      });
    }

    return res.status(400).json({ok:false,code:'OP_INVALID'});
  };
}

let runtimeHandler;
function getRuntimeHandler(){
  if(!runtimeHandler)runtimeHandler=createHandler(loadCatalog());
  return runtimeHandler;
}
const cotcompVehicleCatalogS479=onRequest({
  region:REGION,
  timeoutSeconds:30,
  memory:'256MiB',
  maxInstances:3,
  concurrency:40,
  invoker:'public'
},(req,res)=>getRuntimeHandler()(req,res));

module.exports=Object.freeze({
  VERSION,PROJECT_ID,TENANT_ID,REGION,FUNCTION_NAME,EXPECTED_CATALOG_VERSION,EXPECTED_CATALOG_DIGEST,
  EXPECTED_ENTRY_COUNT,EXPECTED_BRAND_COUNT,ALLOWED_TYPES,VEHICLE_CLASSES,MIN_YEAR,MAX_YEAR,
  ALLOWED_ORIGINS,clean,norm,sha,jsonDigest,publicSubsetDigestPayload,computePublicSubsetDigest,classTypes,validateCatalog,loadCatalog,indexCatalog,years,
  createHandler,getRuntimeHandler,cotcompVehicleCatalogS479
});
