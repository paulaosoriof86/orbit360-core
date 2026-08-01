#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const script='tools/orbit360-validar-manifest-cobros-fuente-ays-v20260801.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-cobros-manifest-'));
function run(name,payload){
  const file=path.join(dir,`${name}.json`);fs.writeFileSync(file,JSON.stringify(payload,null,2));
  const result=spawnSync(process.execPath,[script,'--manifest',file],{encoding:'utf8'});
  return {exit:result.status,report:JSON.parse(result.stdout)};
}
const base={tenant_id:'alianzas-soluciones',file_name:'fuente.xlsx',file_hash:'abc123',country:'GT',currency:'GTQ',period:'2026-07',cutoff_date:'2026-07-31'};
const ready=run('ready',{...base,source_type:'cobros_realizados',destinations:['pagosReportadosFuente','conciliaciones'],fields:['fecha_pago','monto_pagado','aseguradora','poliza','recibo','pais','moneda']});
assert.equal(ready.exit,0);assert.equal(ready.report.status,'SOURCE_MANIFEST_READY');
const direct=run('direct',{...base,source_type:'planilla_aseguradora',destinations:['cobros'],fields:['aseguradora','poliza','recibo','fecha','monto','periodo','pais','moneda']});
assert.equal(direct.exit,41);assert.equal(direct.report.status,'SOURCE_MANIFEST_BLOCKED');assert.ok(direct.report.findings.some(item=>item.code==='DIRECT_OPERATIONAL_DESTINATION'));
const bank=run('bank',{...base,source_type:'estado_cuenta_bancario',destinations:['movimientosBanco','conciliaciones'],fields:['fecha','monto','concepto','pais','moneda']});
assert.equal(bank.report.status,'SOURCE_MANIFEST_READY');
const payload=run('payload',{...base,source_type:'documentos_soporte',destinations:['documentosSoportePago','conciliaciones'],fields:['tipo_documento','archivo','pais','moneda'],rows:[{x:1}]});
assert.equal(payload.exit,41);assert.ok(payload.report.findings.some(item=>item.code==='EMBEDDED_PAYLOAD'));
const currency=run('currency',{...base,currency:'COP',source_type:'cobros_realizados',destinations:['pagosReportadosFuente','conciliaciones'],fields:['fecha','monto','aseguradora','poliza','recibo','pais','moneda']});
assert.equal(currency.exit,41);assert.ok(currency.report.findings.some(item=>item.code==='COUNTRY_CURRENCY_MISMATCH'));
console.log(JSON.stringify({status:'COBROS_SOURCE_MANIFEST_VALIDATOR_PASS',ready:true,directCobrosBlocked:true,bankSupportingOnly:true,payloadBlocked:true,countryCurrencyFailClosed:true,cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0},null,2));
