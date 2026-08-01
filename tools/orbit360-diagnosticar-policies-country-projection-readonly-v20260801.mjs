#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';

const ROOT=process.cwd();
const TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab';
const GATE='block7-policies-static-v20260730';
const VERSION='7.0.1';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/policies-country-projection-diagnostic-v20260801.json');
const COLLECTIONS=['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
const EXPECTED={clientes:430,aseguradoras:30,polizas:1373,vehiculos:1032,recibosEsperados:1294,carteraPrimas:673,cobros:5};
const FAILED_BROWSER={clientes:414,aseguradoras:26,polizas:2,vehiculos:1,recibosEsperados:0,carteraPrimas:0,cobros:2};
const text=v=>String(v==null?'':v).trim();
const safeError=e=>text(e&&e.message||e).replace(/[\w.+-]+@[\w.-]+/g,'[email]').replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').slice(0,500);
function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsIds:false,containsSourceRows:false,containsSecrets:false},null,2)+'\n','utf8');}
function normalizeCountry(value){const v=text(value).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z]/g,'');if(['GT','GUA','GUATEMALA'].includes(v))return'GT';if(['CO','COL','COLOMBIA'].includes(v))return'CO';return v?'OTHER':'';}
function primitives(obj,prefix='',out=[]){if(obj==null)return out;if(Array.isArray(obj)){obj.forEach((v,i)=>primitives(v,`${prefix}[${i}]`,out));return out;}if(typeof obj==='object'&&typeof obj.toDate!=='function'){for(const [k,v] of Object.entries(obj))primitives(v,prefix?`${prefix}.${k}`:k,out);return out;}out.push({path:prefix,value:obj});return out;}
function firstByKey(obj,patterns){const found=primitives(obj).find(item=>patterns.some(p=>p.test(item.path))&&text(item.value));return found?itemValue(found):'';}
function itemValue(item){return item&&item.value;}
function directCountry(row){const pais=normalizeCountry(firstByKey(row,[/(^|\.)(pais)$/i]));const country=normalizeCountry(firstByKey(row,[/(^|\.)(country)$/i]));if(pais&&country&&pais!==country)return{value:'',status:'CONFLICT',pais,country};return{value:pais||country,status:(pais||country)?'DIRECT':'MISSING',pais,country};}
function relationId(row,patterns){return text(firstByKey(row,patterns));}
function add(map,key){map[key]=(map[key]||0)+1;}
function fieldStats(rows){const out={total:rows.length,paisPresent:0,countryPresent:0,bothPresent:0,bothSame:0,bothConflict:0,neither:0,paisValues:{GT:0,CO:0,OTHER:0},countryValues:{GT:0,CO:0,OTHER:0},currentPaisGT:0,logicalCountryGT:0,directValid:0,directConflict:0,directMissing:0};for(const row of rows){const d=directCountry(row);if(d.pais){out.paisPresent++;add(out.paisValues,d.pais);if(d.pais==='GT')out.currentPaisGT++;}if(d.country){out.countryPresent++;add(out.countryValues,d.country);if(d.country==='GT')out.logicalCountryGT++;}if(d.pais&&d.country){out.bothPresent++;if(d.pais===d.country)out.bothSame++;else out.bothConflict++;}if(!d.pais&&!d.country)out.neither++;if(d.status==='DIRECT')out.directValid++;else if(d.status==='CONFLICT')out.directConflict++;else out.directMissing++;}return out;}
function derivedStats(rows,resolver){const out={total:rows.length,directValid:0,directConflict:0,derivedExact:0,derivedConflict:0,relationMissing:0,relationNotFound:0,requiresValidation:0,repairCandidates:0,finalGT:0,finalCO:0};const resolved=new Map();for(const row of rows){const id=text(row.__docId);const d=directCountry(row);if(d.status==='DIRECT'){out.directValid++;resolved.set(id,d.value);add(out,d.value==='GT'?'finalGT':'finalCO');continue;}if(d.status==='CONFLICT'){out.directConflict++;out.requiresValidation++;continue;}const rel=resolver(row);if(!rel||rel.status==='RELATION_MISSING'){out.relationMissing++;out.requiresValidation++;continue;}if(rel.status==='NOT_FOUND'){out.relationNotFound++;out.requiresValidation++;continue;}if(rel.status==='CONFLICT'||!rel.country){out.derivedConflict++;out.requiresValidation++;continue;}out.derivedExact++;out.repairCandidates++;resolved.set(id,rel.country);add(out,rel.country==='GT'?'finalGT':'finalCO');}return{stats:out,resolved};}
function referenceResolver(map,patterns){return row=>{const id=relationId(row,patterns);if(!id)return{status:'RELATION_MISSING'};if(!map.has(id))return{status:'NOT_FOUND'};const country=map.get(id);return country?{status:'EXACT',country}:{status:'CONFLICT'};};}
let app;
const result={schemaVersion:'orbit360-policies-country-projection-diagnostic-v1',gateId:GATE,contractVersion:VERSION,tenantId:TENANT,projectId:PROJECT,status:'STARTED',classification:'DATA_CONTRACT_FAILURE',counts:{},fieldStats:{},derivation:{},currentProjectionMatchesFailedBrowser:false,rootCauseConfirmed:false,proposedNextAction:'',firestoreRead:false,firestoreWrites:0,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,ok:false};
try{
  if(text(process.env.ORBIT360_PRODUCT_PROJECT_ID)!==PROJECT||text(process.env.ORBIT360_PRODUCT_TENANT_ID)!==TENANT||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('ENVIRONMENT_FAILURE:DIAGNOSTIC_TARGET');
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});const db=getFirestore(app);result.firestoreRead=true;
  const data={};
  for(const collection of COLLECTIONS){const snap=await db.collection('tenantId').doc(TENANT).collection(collection).get();data[collection]=snap.docs.map(doc=>Object.assign({__docId:doc.id},doc.data()));result.counts[collection]=snap.size;result.fieldStats[collection]=fieldStats(data[collection]);if(snap.size!==EXPECTED[collection])throw new Error(`DATA_CONTRACT_FAILURE:BASELINE_${collection}_${snap.size}`);}
  const clients=new Map();for(const row of data.clientes){const d=directCountry(row);clients.set(text(row.__docId),d.status==='DIRECT'?d.value:'');}
  const insurers=new Map();for(const row of data.aseguradoras){const d=directCountry(row);insurers.set(text(row.__docId),d.status==='DIRECT'?d.value:'');}
  const policyResult=derivedStats(data.polizas,row=>{const client=referenceResolver(clients,[/(^|\.)(clienteId|clientId|contratanteId|insuredId)$/i])(row);const insurerId=relationId(row,[/(^|\.)(aseguradoraId|insurerId)$/i]);const insurer=insurerId?(insurers.has(insurerId)?{status:'EXACT',country:insurers.get(insurerId)}:{status:'NOT_FOUND'}):{status:'RELATION_MISSING'};if(client.status==='EXACT'&&client.country&&insurer.status==='EXACT'&&insurer.country&&client.country!==insurer.country)return{status:'CONFLICT'};if(client.status==='EXACT'&&client.country)return client;if(insurer.status==='EXACT'&&insurer.country)return insurer;return client.status!=='RELATION_MISSING'?client:insurer;});result.derivation.polizas=policyResult.stats;
  const vehicleResult=derivedStats(data.vehiculos,referenceResolver(policyResult.resolved,[/(^|\.)(polizaId|policyId)$/i]));result.derivation.vehiculos=vehicleResult.stats;
  const receiptResult=derivedStats(data.recibosEsperados,referenceResolver(policyResult.resolved,[/(^|\.)(polizaId|policyId)$/i]));result.derivation.recibosEsperados=receiptResult.stats;
  const portfolioResult=derivedStats(data.carteraPrimas,row=>{const byPolicy=referenceResolver(policyResult.resolved,[/(^|\.)(polizaId|policyId)$/i])(row);if(byPolicy.status==='EXACT')return byPolicy;return referenceResolver(receiptResult.resolved,[/(^|\.)(reciboId|receiptId)$/i])(row);});result.derivation.carteraPrimas=portfolioResult.stats;
  const cobroResult=derivedStats(data.cobros,row=>{const byPolicy=referenceResolver(policyResult.resolved,[/(^|\.)(polizaId|policyId)$/i])(row);if(byPolicy.status==='EXACT')return byPolicy;return referenceResolver(receiptResult.resolved,[/(^|\.)(reciboId|receiptId)$/i])(row);});result.derivation.cobros=cobroResult.stats;
  result.currentProjectionMatchesFailedBrowser=COLLECTIONS.every(name=>result.fieldStats[name].currentPaisGT===FAILED_BROWSER[name]);
  const related=['polizas','vehiculos','recibosEsperados','carteraPrimas'];
  const missingCountryRows=related.reduce((sum,name)=>sum+result.fieldStats[name].directMissing,0);
  const repairCandidates=Object.values(result.derivation).reduce((sum,row)=>sum+Number(row.repairCandidates||0),0);
  const requiresValidation=Object.values(result.derivation).reduce((sum,row)=>sum+Number(row.requiresValidation||0),0);
  result.summary={missingDirectCountryRows:missingCountryRows,exactRelationshipRepairCandidates:repairCandidates,requiresValidationRows:requiresValidation,currentPhysicalField:'pais',logicalField:'country'};
  result.rootCauseConfirmed=result.currentProjectionMatchesFailedBrowser&&missingCountryRows>0&&repairCandidates>0;
  result.proposedNextAction=result.rootCauseConfirmed?'PREPARE_COUNTRY_REPAIR_DRYRUN_NO_WRITES':'HOLD_FOR_DEEPER_DATA_CONTRACT_DIAGNOSTIC';
  result.status=result.rootCauseConfirmed?'POLICIES_COUNTRY_PROJECTION_DIAGNOSTIC_PASS':'POLICIES_COUNTRY_PROJECTION_DIAGNOSTIC_INCONCLUSIVE';
  result.classification=result.rootCauseConfirmed?'DATA_CONTRACT_FAILURE_CONFIRMED':'DATA_CONTRACT_FAILURE';result.ok=result.rootCauseConfirmed;
}catch(error){result.status='POLICIES_COUNTRY_PROJECTION_DIAGNOSTIC_FAIL';result.classification=text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE';result.error=safeError(error);result.ok=false;}
save(result);if(app)await deleteApp(app).catch(()=>{});process.exit(result.ok?0:41);
