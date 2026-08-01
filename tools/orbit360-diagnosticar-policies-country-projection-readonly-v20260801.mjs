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
function firstByKey(obj,patterns){const found=primitives(obj).find(item=>patterns.some(p=>p.test(item.path))&&text(item.value));return found?found.value:'';}
function topLevelCountry(row){const pais=normalizeCountry(row&&row.pais);const country=normalizeCountry(row&&row.country);if(pais==='OTHER'||country==='OTHER')return{value:'',status:'INVALID',pais,country};if(pais&&country&&pais!==country)return{value:'',status:'CONFLICT',pais,country};const value=pais||country;return{value,status:value?'DIRECT':'MISSING',pais,country};}
function nestedCountryEvidence(row){const items=primitives(row).filter(item=>item.path.includes('.')&&/(^|\.)(pais|country)$/i.test(item.path));const values=[...new Set(items.map(item=>normalizeCountry(item.value)).filter(value=>value==='GT'||value==='CO'))];return{present:items.length>0,values,exact:values.length===1?values[0]:'',conflict:values.length>1};}
function relationId(row,patterns){return text(firstByKey(row,patterns));}
function add(map,key){if(!key)return;map[key]=(map[key]||0)+1;}
function fieldStats(rows){const out={total:rows.length,topLevelPaisPresent:0,topLevelCountryPresent:0,topLevelBothPresent:0,topLevelBothSame:0,topLevelBothConflict:0,topLevelNeither:0,topLevelInvalid:0,topLevelPaisValues:{GT:0,CO:0,OTHER:0},topLevelCountryValues:{GT:0,CO:0,OTHER:0},currentPaisGT:0,logicalCountryGT:0,directValid:0,directConflict:0,directInvalid:0,directMissing:0,nestedCountryEvidencePresent:0,nestedCountryEvidenceExact:0,nestedCountryEvidenceConflict:0,nestedEvidenceValues:{GT:0,CO:0}};for(const row of rows){const d=topLevelCountry(row),nested=nestedCountryEvidence(row);if(d.pais){out.topLevelPaisPresent++;add(out.topLevelPaisValues,d.pais);if(d.pais==='GT')out.currentPaisGT++;}if(d.country){out.topLevelCountryPresent++;add(out.topLevelCountryValues,d.country);if(d.country==='GT')out.logicalCountryGT++;}if(d.pais&&d.country){out.topLevelBothPresent++;if(d.pais===d.country&&d.pais!=='OTHER')out.topLevelBothSame++;else out.topLevelBothConflict++;}if(!d.pais&&!d.country)out.topLevelNeither++;if(d.status==='DIRECT')out.directValid++;else if(d.status==='CONFLICT'){out.directConflict++;}else if(d.status==='INVALID'){out.directInvalid++;out.topLevelInvalid++;}else out.directMissing++;if(nested.present)out.nestedCountryEvidencePresent++;if(nested.exact){out.nestedCountryEvidenceExact++;add(out.nestedEvidenceValues,nested.exact);}if(nested.conflict)out.nestedCountryEvidenceConflict++;}return out;}
function derivedStats(rows,resolver){const out={total:rows.length,directValid:0,directConflict:0,directInvalid:0,derivedExact:0,derivedConflict:0,relationMissing:0,relationNotFound:0,unresolvedRows:0,exactRelationshipCandidates:0,finalGT:0,finalCO:0};const resolved=new Map();for(const row of rows){const id=text(row.__docId),d=topLevelCountry(row);if(d.status==='DIRECT'){out.directValid++;resolved.set(id,d.value);add(out,d.value==='GT'?'finalGT':'finalCO');continue;}if(d.status==='CONFLICT'){out.directConflict++;out.unresolvedRows++;continue;}if(d.status==='INVALID'){out.directInvalid++;out.unresolvedRows++;continue;}const rel=resolver(row);if(!rel||rel.status==='RELATION_MISSING'){out.relationMissing++;out.unresolvedRows++;continue;}if(rel.status==='NOT_FOUND'){out.relationNotFound++;out.unresolvedRows++;continue;}if(rel.status==='CONFLICT'||!rel.country){out.derivedConflict++;out.unresolvedRows++;continue;}out.derivedExact++;out.exactRelationshipCandidates++;resolved.set(id,rel.country);add(out,rel.country==='GT'?'finalGT':'finalCO');}return{stats:out,resolved};}
function referenceResolver(map,patterns){return row=>{const id=relationId(row,patterns);if(!id)return{status:'RELATION_MISSING'};if(!map.has(id))return{status:'NOT_FOUND'};const country=map.get(id);return country?{status:'EXACT',country}:{status:'CONFLICT'};};}
let app;
const result={schemaVersion:'orbit360-policies-country-projection-diagnostic-v2',gateId:GATE,contractVersion:VERSION,tenantId:TENANT,projectId:PROJECT,status:'STARTED',classification:'DATA_CONTRACT_FAILURE',validatorRevision:'top-level-country-v2',counts:{},fieldStats:{},derivation:{},currentProjectionMatchesFailedBrowser:false,rootCauseConfirmed:false,proposedNextAction:'',firestoreRead:false,firestoreWrites:0,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,ok:false};
try{
  if(text(process.env.ORBIT360_PRODUCT_PROJECT_ID)!==PROJECT||text(process.env.ORBIT360_PRODUCT_TENANT_ID)!==TENANT||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('ENVIRONMENT_FAILURE:DIAGNOSTIC_TARGET');
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});const db=getFirestore(app);result.firestoreRead=true;
  const data={};
  for(const collection of COLLECTIONS){const snap=await db.collection('tenantId').doc(TENANT).collection(collection).get();data[collection]=snap.docs.map(doc=>Object.assign({__docId:doc.id},doc.data()));result.counts[collection]=snap.size;result.fieldStats[collection]=fieldStats(data[collection]);if(snap.size!==EXPECTED[collection])throw new Error(`DATA_CONTRACT_FAILURE:BASELINE_${collection}_${snap.size}`);}
  const clients=new Map();for(const row of data.clientes){const d=topLevelCountry(row);clients.set(text(row.__docId),d.status==='DIRECT'?d.value:'');}
  const insurers=new Map();for(const row of data.aseguradoras){const d=topLevelCountry(row);insurers.set(text(row.__docId),d.status==='DIRECT'?d.value:'');}
  const policyResult=derivedStats(data.polizas,row=>{const client=referenceResolver(clients,[/(^|\.)(clienteId|clientId|contratanteId|insuredId)$/i])(row);const insurerId=relationId(row,[/(^|\.)(aseguradoraId|insurerId)$/i]);const insurer=insurerId?(insurers.has(insurerId)?{status:'EXACT',country:insurers.get(insurerId)}:{status:'NOT_FOUND'}):{status:'RELATION_MISSING'};if(client.status==='EXACT'&&client.country&&insurer.status==='EXACT'&&insurer.country&&client.country!==insurer.country)return{status:'CONFLICT'};if(client.status==='EXACT'&&client.country)return client;if(insurer.status==='EXACT'&&insurer.country)return insurer;return client.status!=='RELATION_MISSING'?client:insurer;});result.derivation.polizas=policyResult.stats;
  const vehicleResult=derivedStats(data.vehiculos,referenceResolver(policyResult.resolved,[/(^|\.)(polizaId|policyId)$/i]));result.derivation.vehiculos=vehicleResult.stats;
  const receiptResult=derivedStats(data.recibosEsperados,referenceResolver(policyResult.resolved,[/(^|\.)(polizaId|policyId)$/i]));result.derivation.recibosEsperados=receiptResult.stats;
  const portfolioResult=derivedStats(data.carteraPrimas,row=>{const byPolicy=referenceResolver(policyResult.resolved,[/(^|\.)(polizaId|policyId)$/i])(row);if(byPolicy.status==='EXACT')return byPolicy;return referenceResolver(receiptResult.resolved,[/(^|\.)(reciboId|receiptId)$/i])(row);});result.derivation.carteraPrimas=portfolioResult.stats;
  const cobroResult=derivedStats(data.cobros,row=>{const byPolicy=referenceResolver(policyResult.resolved,[/(^|\.)(polizaId|policyId)$/i])(row);if(byPolicy.status==='EXACT')return byPolicy;return referenceResolver(receiptResult.resolved,[/(^|\.)(reciboId|receiptId)$/i])(row);});result.derivation.cobros=cobroResult.stats;
  result.currentProjectionMatchesFailedBrowser=COLLECTIONS.every(name=>result.fieldStats[name].currentPaisGT===FAILED_BROWSER[name]);
  const related=['polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
  const missingTopLevelCountryRows=related.reduce((sum,name)=>sum+result.fieldStats[name].directMissing,0);
  const exactRelationshipCandidates=Object.values(result.derivation).reduce((sum,row)=>sum+Number(row.exactRelationshipCandidates||0),0);
  const unresolvedRows=Object.values(result.derivation).reduce((sum,row)=>sum+Number(row.unresolvedRows||0),0);
  result.summary={missingTopLevelCountryRows,exactRelationshipCandidates,unresolvedRows,currentPhysicalField:'pais',logicalField:'country',firestoreQueryRequiresTopLevelField:true,allMissingCountryRowsRequireValidationBeforeWrite:true};
  result.rootCauseConfirmed=result.currentProjectionMatchesFailedBrowser&&missingTopLevelCountryRows>0&&exactRelationshipCandidates>0;
  result.proposedNextAction=result.rootCauseConfirmed?'PREPARE_COUNTRY_BACKFILL_DRYRUN_REQUIERE_VALIDACION_NO_WRITES':'HOLD_FOR_DEEPER_DATA_CONTRACT_DIAGNOSTIC';
  result.status=result.rootCauseConfirmed?'POLICIES_COUNTRY_PROJECTION_DIAGNOSTIC_PASS':'POLICIES_COUNTRY_PROJECTION_DIAGNOSTIC_INCONCLUSIVE';
  result.classification=result.rootCauseConfirmed?'DATA_CONTRACT_FAILURE_CONFIRMED':'DATA_CONTRACT_FAILURE';result.ok=result.rootCauseConfirmed;
}catch(error){result.status='POLICIES_COUNTRY_PROJECTION_DIAGNOSTIC_FAIL';result.classification=text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE';result.error=safeError(error);result.ok=false;}
save(result);if(app)await deleteApp(app).catch(()=>{});process.exit(result.ok?0:41);
