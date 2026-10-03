'use strict';

const VERSION='ays-cotcomp-s475-sat2026-snapshot-v1.0';
const SOURCE=Object.freeze({
  authority:'SAT_GUATEMALA',
  jurisdiction:'GT',
  year:2026,
  sourceId:'SAT_GT_2026_IPRIMA_TABLE_91646',
  sourceUrl:'https://portal.sat.gob.gt/portal/descarga/1895/legislacion-aduanera/91646/tabla-de-valores-iva-iprima-2026',
  sourceFileId:'91646',
  sourceCategoryId:'1895',
  expectedTitle:'TABLA DE VALORES IMPONIBLES DEL IMPUESTO AL VALOR AGREGADO E IMPUESTO ESPECÍFICO A LA PRIMERA MATRÍCULA PARA IMPORTACIÓN DE VEHÍCULOS AUTOMOTORES TERRESTRES USADOS PARA EL AÑO 2026',
  requiredColumns:Object.freeze(['Tipo','Marca','Línea']),
  sampleIdentity:Object.freeze({type:'AUTOMOVIL',brand:'TOYOTA',line:'COROLLA'})
});

function clean(v,max=500){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function isSha(v){return /^[a-f0-9]{64}$/i.test(clean(v,80));}
function validateReceipt(r={}){
  const errors=[];
  if(r.schemaVersion!=='ays-cotcomp-s475-sat2026-snapshot-receipt-v1.0')errors.push('SCHEMA_VERSION_INVALID');
  if(r.sourceId!==SOURCE.sourceId)errors.push('SOURCE_ID_INVALID');
  if(r.sourceUrl!==SOURCE.sourceUrl)errors.push('SOURCE_URL_INVALID');
  if(r.authority!=='SAT_GUATEMALA'||r.jurisdiction!=='GT'||Number(r.year)!==2026)errors.push('SOURCE_AUTHORITY_INVALID');
  if(r.httpStatus!==200)errors.push('HTTP_STATUS_INVALID');
  if(r.pdfMagicPass!==true)errors.push('PDF_MAGIC_REQUIRED');
  if(r.titlePass!==true)errors.push('TITLE_REQUIRED');
  if(r.headerPass!==true)errors.push('HEADER_REQUIRED');
  if(r.sampleToyotaCorollaPass!==true)errors.push('SAMPLE_IDENTITY_REQUIRED');
  if(!(Number(r.rawBytes)>100000))errors.push('RAW_BYTES_TOO_SMALL');
  if(!(Number(r.pageCount)>1))errors.push('PAGE_COUNT_INVALID');
  if(!isSha(r.rawSha256)||!isSha(r.textSha256))errors.push('DIGEST_REQUIRED');
  if(r.snapshotMaterialized!==true)errors.push('SNAPSHOT_NOT_MATERIALIZED');
  if(r.normalizedCatalogBuilt!==false)errors.push('NORMALIZATION_MUST_REMAIN_PENDING');
  if(r.publicDropdownReleased!==false)errors.push('PUBLIC_RELEASE_FORBIDDEN');
  if(Number(r.appDataReads)!==0||Number(r.appDataWrites)!==0)errors.push('APP_DATA_ACCESS_FORBIDDEN');
  if(Number(r.providerOrRaterCalls)!==0)errors.push('PROVIDER_CALLS_FORBIDDEN');
  if(r.productionTouched!==false)errors.push('PRODUCTION_FORBIDDEN');
  return Object.freeze({ok:errors.length===0,errors:Object.freeze(errors)});
}
function readiness(){
  return Object.freeze({
    version:VERSION,
    source:SOURCE,
    sourceContractReady:true,
    snapshotMaterialized:false,
    normalizedCatalogBuilt:false,
    publicDropdownReleased:false,
    nextBlocker:'SAT_2026_SNAPSHOT_PHYSICAL_FETCH_REQUIRED',
    appDataReads:0,
    appDataWrites:0,
    providerOrRaterCalls:0,
    productionTouched:false
  });
}

module.exports=Object.freeze({VERSION,SOURCE,clean,isSha,validateReceipt,readiness});
