#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const args=process.argv.slice(2);
const arg=flag=>{const index=args.indexOf(flag);return index>=0?args[index+1]:'';};
const manifestPath=arg('--manifest')||arg('-m');
const CONTRACTS={
  cobros_realizados:{destinations:['pagosReportadosFuente','conciliaciones'],required:[['fecha_pago','fecha_cobro','fecha'],['monto_pagado','monto','valor'],['aseguradora_id','aseguradora'],['poliza_id','poliza'],['recibo_id','recibo','requerimiento','cuota'],['pais'],['moneda']]},
  planilla_aseguradora:{destinations:['reportesPagoAseguradora','conciliaciones'],required:[['aseguradora_id','aseguradora'],['poliza_id','poliza'],['recibo_id','recibo','requerimiento','cuota'],['fecha_pago','fecha'],['monto','valor','prima_total'],['periodo'],['pais'],['moneda']]},
  estado_cuenta_bancario:{destinations:['movimientosBanco','conciliaciones'],required:[['fecha'],['monto','debito','credito'],['concepto','descripcion','referencia'],['pais'],['moneda']]},
  documentos_soporte:{destinations:['documentosSoportePago','conciliaciones'],required:[['tipo_documento','tipo'],['archivo_ref','archivo','url','ruta'],['pais'],['moneda']]}
};
const BLOCKED=new Set(['cobros','finmovs','carteraPrimas','clientes','polizas','produccion']);
const PAYLOAD_KEYS=new Set(['rows','records','items','data','payload','previewRows','normalizedRows','rawRows']);
const findings=[];
const add=(level,code,detail='')=>findings.push({level,code,detail});
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
function walk(object,prefix=''){
  if(!object||typeof object!=='object')return;
  for(const [key,value] of Object.entries(object)){
    const path=prefix?`${prefix}.${key}`:key;
    if(PAYLOAD_KEYS.has(key))add('BLOCKED','EMBEDDED_PAYLOAD',path);
    if(value&&typeof value==='object'&&!Array.isArray(value))walk(value,path);
  }
}
let manifest=null;
if(!manifestPath)add('BLOCKED','MANIFEST_REQUIRED');
else if(!fs.existsSync(manifestPath))add('BLOCKED','MANIFEST_NOT_FOUND',manifestPath);
else try{manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));}catch(error){add('BLOCKED','MANIFEST_JSON_INVALID',error.message);}
if(manifest){
  walk(manifest);
  const type=norm(manifest.source_type||manifest.sourceType);
  const contract=CONTRACTS[type];
  if(!contract)add('BLOCKED','SOURCE_TYPE_NOT_ALLOWED',type);
  if((manifest.tenant_id||manifest.tenantId)!=='alianzas-soluciones')add('BLOCKED','TENANT_INVALID');
  if(!manifest.file_name&&!manifest.file)add('BLOCKED','FILE_REFERENCE_REQUIRED');
  if(!manifest.file_hash&&!manifest.sha256)add('BLOCKED','FILE_HASH_REQUIRED');
  if(manifest.write_enabled===true||manifest.writeEnabled===true)add('BLOCKED','WRITE_FLAG_FORBIDDEN');
  const country=String(manifest.country||manifest.pais||manifest.declared_country||'').toUpperCase();
  const currency=String(manifest.currency||manifest.moneda||manifest.declared_currency||'').toUpperCase();
  if(!country||!currency)add('REVIEW','COUNTRY_CURRENCY_REQUIRED');
  if(country==='GT'&&currency&&currency!=='GTQ')add('BLOCKED','COUNTRY_CURRENCY_MISMATCH','GT/GTQ');
  if(country==='CO'&&currency&&currency!=='COP')add('BLOCKED','COUNTRY_CURRENCY_MISMATCH','CO/COP');
  const destinations=(manifest.destinations||manifest.requested_targets||[]).map(String);
  if(contract){
    for(const destination of destinations){
      if(BLOCKED.has(destination))add('BLOCKED','DIRECT_OPERATIONAL_DESTINATION',destination);
      if(!contract.destinations.includes(destination))add('BLOCKED','DESTINATION_NOT_ALLOWED',destination);
    }
    for(const destination of contract.destinations)if(!destinations.includes(destination))add('BLOCKED','CANONICAL_DESTINATION_MISSING',destination);
    const fields=new Set([...(manifest.fields||[]),...(manifest.columns||[]),...((manifest.sheets||[]).flatMap(sheet=>sheet.columns||[]))].map(norm));
    for(const group of contract.required)if(!group.some(field=>fields.has(norm(field))))add('REVIEW','REQUIRED_FIELD_GROUP_MISSING',group.join('|'));
  }
  if(!manifest.period&&!manifest.periodo&&!((manifest.sheets||[]).some(sheet=>sheet.period||sheet.periodo)))add('REVIEW','PERIOD_REQUIRED');
  if(!manifest.cutoff_date&&!manifest.cutoffDate)add('REVIEW','CUTOFF_DATE_REQUIRED');
}
const blocked=findings.filter(item=>item.level==='BLOCKED').length;
const review=findings.filter(item=>item.level==='REVIEW').length;
const status=blocked?'SOURCE_MANIFEST_BLOCKED':review?'SOURCE_MANIFEST_REQUIRES_VALIDATION':'SOURCE_MANIFEST_READY';
const result={
  schemaVersion:'orbit360-cobros-source-manifest-validation-v1',status,blocked,review,findings,
  sourceType:norm(manifest&&(manifest.source_type||manifest.sourceType)),
  structuralHash:crypto.createHash('sha256').update(JSON.stringify(manifest||{})).digest('hex'),
  cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
};
console.log(JSON.stringify(result,null,2));
process.exit(blocked?41:0);
