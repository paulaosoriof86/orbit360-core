#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPlan, executeCli, TARGET_COLLECTION, FORBIDDEN_OPERATIONAL_COLLECTIONS, PACKAGE_SCHEMA } from './orbit360-financiero-historico-canonical-apply-v20260812.mjs';

function fail(code, detail=''){const e=new Error(code+(detail?':'+detail:''));e.code=code;throw e;}
const tenant='synthetic-tenant';
const base={tenantId:tenant,pais:'GT',moneda:'GTQ',periodo:'2026-06',direccion:'ingreso',categoriaCanonica:'comision',montoFuente:100,destino:TARGET_COLLECTION,esCobro:false,esCartera:false,esPoliza:false,esCliente:false,sourceFile:'synthetic.xlsx',sourceSheet:'Junio',sourceRow:2,sourceBlock:'ingreso',traceHash:'synthetic-trace-001'};
const pkg={schemaVersion:PACKAGE_SCHEMA,tenantId:tenant,rows:[{persistStatus:'IMPORTABLE',record:base},{persistStatus:'REQUIERE_VALIDACION',record:{...base,sourceRow:3,traceHash:'synthetic-trace-002'}}]};
const plan=buildPlan(pkg,{tenantId:tenant});
if(plan.targetCollection!==TARGET_COLLECTION)fail('DATA_CONTRACT_FAILURE','TARGET');
if(plan.counts.sourceRows!==2||plan.counts.importable!==1||plan.counts.requiereValidacion!==1||plan.creates.length!==1)fail('DATA_CONTRACT_FAILURE','COUNTS');
if(plan.writeOperational!==false||plan.promotionToFinmovs!==false)fail('SECURITY_FAILURE','OPERATIONAL_FLAG');
for(const c of ['finmovs','cobros','recibosEsperados','carteraPrimas','polizas','clientes'])if(!FORBIDDEN_OPERATIONAL_COLLECTIONS.includes(c))fail('SECURITY_FAILURE','FORBIDDEN_SET:'+c);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-finhist-')); const packagePath=path.join(tmp,'pkg.json'); const evidencePath=path.join(tmp,'evidence.json'); fs.writeFileSync(packagePath,JSON.stringify(pkg),'utf8');
const result=await executeCli({ORBIT360_FIN_HIST_MODE:'STATIC_SYNTHETIC',ORBIT360_TENANT_ID:tenant,ORBIT360_FIN_HIST_PACKAGE:packagePath,ORBIT360_FIN_HIST_EVIDENCE:evidencePath});
if(!result.ok||result.status!=='SOURCE_ONLY_PASS'||result.firestoreRead!==false||result.firestoreWrites!==0||result.operationalWrites!==0)fail('PIPELINE_MECHANISM_FAILURE','STATIC_EXECUTION');
if(!fs.existsSync(evidencePath))fail('PIPELINE_MECHANISM_FAILURE','EVIDENCE_MISSING');
let rejected=false;try{buildPlan({...pkg,rows:[{persistStatus:'IMPORTABLE',record:{...base,destino:'finmovs'}}]},{tenantId:tenant});}catch(e){rejected=String(e.code)==='DATA_CONTRACT_FAILURE';}if(!rejected)fail('SECURITY_FAILURE','FINMOVS_TARGET_NOT_REJECTED');
let unclassifiedRejected=false;try{buildPlan({...pkg,rows:[{record:base}]},{tenantId:tenant});}catch(e){unclassifiedRejected=String(e.code)==='DATA_CONTRACT_FAILURE';}if(!unclassifiedRejected)fail('DATA_CONTRACT_FAILURE','UNCLASSIFIED_NOT_REJECTED');
console.log(JSON.stringify({ok:true,decision:'FINANCIERO_HISTORICO_WRITER_SOURCE_ONLY_PASS',targetCollection:TARGET_COLLECTION,syntheticRows:2,importable:1,held:1,firestoreRead:false,firestoreWrites:0,operationalWrites:0,finmovsWrite:false,forbiddenCollections:FORBIDDEN_OPERATIONAL_COLLECTIONS},null,2));
