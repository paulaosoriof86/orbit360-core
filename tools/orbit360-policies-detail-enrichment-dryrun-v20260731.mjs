#!/usr/bin/env node
'use strict';

/*
 * Orbit 360 · Pólizas · enriquecimiento de detalle desde fuentes ya recibidas
 * DRY-RUN únicamente. No usa Firebase, Orbit.store ni escrituras.
 *
 * Entradas privadas por variables de entorno:
 *   ORBIT360_POLICIES_CANONICAL_XLSX=/ruta/canonical.xlsx
 *   ORBIT360_POLICIES_DETAIL_SOURCES=/ruta/fuente1.xlsx;/ruta/fuente2.xlsx;...
 *   ORBIT360_POLICIES_DETAIL_PRIVATE_DIFF=/tmp/policy-detail-diff.json   (opcional)
 *   ORBIT360_POLICIES_DETAIL_EVIDENCE=/tmp/policy-detail-evidence.json (opcional)
 *
 * La evidencia publicada es sanitizada y solo contiene agregados.
 */

import fs from 'node:fs';
import crypto from 'node:crypto';
import XLSX from 'xlsx';

const CANONICAL=process.env.ORBIT360_POLICIES_CANONICAL_XLSX||'';
const SOURCES=String(process.env.ORBIT360_POLICIES_DETAIL_SOURCES||'').split(';').map(s=>s.trim()).filter(Boolean);
const PRIVATE_DIFF=process.env.ORBIT360_POLICIES_DETAIL_PRIVATE_DIFF||'/tmp/orbit360-policy-detail-enrichment-private.json';
const EVIDENCE=process.env.ORBIT360_POLICIES_DETAIL_EVIDENCE||'/tmp/orbit360-policy-detail-enrichment-evidence.json';
const TENANT='alianzas-soluciones';

const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const normPolicy=v=>norm(v).replace(/\s+/g,'');
const sha=v=>crypto.createHash('sha256').update(String(v)).digest('hex');

function normDate(v){
  const s=clean(v); if(!s)return'';
  let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/); if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
  m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/); if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
  return s;
}
function rowObj(headers,row){return Object.fromEntries(headers.map((h,i)=>[clean(h),row[i]??null]));}
function readSheetRows(file,sheetName,headerRow1){
  const wb=XLSX.readFile(file,{cellDates:false,raw:true});
  const ws=wb.Sheets[sheetName||wb.SheetNames[0]]; if(!ws)throw new Error('DATA_CONTRACT_FAILURE:SHEET_MISSING');
  const a=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
  const hi=(headerRow1||1)-1,headers=(a[hi]||[]).map(clean);
  return a.slice(hi+1).filter(r=>r.some(v=>clean(v)!=='')).map(r=>rowObj(headers,r));
}
function detectHeader(file){
  const wb=XLSX.readFile(file,{cellDates:false,raw:true}); const ws=wb.Sheets[wb.SheetNames[0]];
  const a=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
  const keys=['POLIZA','ASEGURADO','ASEGURADORA','PRIMA','VIGENCIA','RAMO'];
  let best={row:1,score:-1};
  for(let i=0;i<Math.min(a.length,20);i++){
    const txt=(a[i]||[]).map(norm).join('|'); const score=keys.reduce((n,k)=>n+(txt.includes(k)?1:0),0);
    if(score>best.score)best={row:i+1,score};
  }
  if(best.score<3)throw new Error('DATA_CONTRACT_FAILURE:HEADER_NOT_DETECTED');
  return best.row;
}
function pick(r,names){for(const n of names){const v=r[n];if(v!=null&&clean(v)!=='')return v;}return'';}
function sourceKey(r){
  return [
    normPolicy(pick(r,['Póliza','Poliza','PÓLIZA','PóLIZA'])),
    normDate(pick(r,['Vigencia','VIGENCIA'])),
    norm(pick(r,['Asegurado','ASEGURADO'])),
    norm(pick(r,['Aseguradora','ASEGURADORA','CIA']))
  ].join('|');
}
function canonicalKey(r){return [normPolicy(r.numero),normDate(r.vigenciaInicio),norm(r.aseguradoNombreFuente),norm(r.aseguradoraFuenteNombre)].join('|');}
function nonempty(v){return v!=null&&clean(v)!=='';}
function uniq(values){return [...new Set(values.map(clean).filter(Boolean))];}

const FIELD_MAP={
  tipoEmision:['Tipo de Emisión','Tipo de Emision'],
  bienAsegurado:['Bien Asegurado'],
  planCoberturas:['Plan Coberturas'],
  comentariosPoliza:['Comentarios Póliza','Comentarios Poliza'],
  concepto:['Concepto'],
  formaPagoFuente:['Forma de pago','Forma de Pago'],
  conductoPagoFuente:['Conducto de pago','Conducto de Pago']
};

function mergeField(hits,names){
  const values=[];
  for(const h of hits){const v=pick(h.row,names);if(nonempty(v))values.push(v);}
  const unique=uniq(values);
  if(unique.length===0)return{status:'missing'};
  if(unique.length===1)return{status:'value',value:unique[0]};
  const normalized=[...new Set(unique.map(norm).filter(Boolean))];
  return normalized.length===1?{status:'value',value:unique[0]}:{status:'conflict',count:unique.length};
}

function main(){
  if(!CANONICAL||!fs.existsSync(CANONICAL))throw new Error('PIPELINE_MECHANISM_FAILURE:CANONICAL_PATH_MISSING');
  if(!SOURCES.length||SOURCES.some(f=>!fs.existsSync(f)))throw new Error('PIPELINE_MECHANISM_FAILURE:SOURCE_PATH_MISSING');

  const canonical=readSheetRows(CANONICAL,'PoliciesToCreate',1);
  if(canonical.length!==1373)throw new Error('DATA_CONTRACT_FAILURE:CANONICAL_COUNT');
  if(canonical.some(r=>clean(r.tenantId)!==TENANT))throw new Error('DATA_CONTRACT_FAILURE:TENANT_MISMATCH');

  const sourceIndex=new Map();
  const sourceMeta=[];
  for(const file of SOURCES){
    const headerRow=detectHeader(file),rows=readSheetRows(file,null,headerRow);
    sourceMeta.push({source:sha(file).slice(0,12),headerRow,rows:rows.length});
    for(const row of rows){const key=sourceKey(row);if(!key.replace(/\|/g,''))continue;if(!sourceIndex.has(key))sourceIndex.set(key,[]);sourceIndex.get(key).push({row});}
  }

  const patches=[],counts={matchedPolicies:0,unmatchedPolicies:0,multiSourcePolicies:0,fieldConflicts:0,fields:{}};
  Object.keys(FIELD_MAP).forEach(k=>counts.fields[k]={proposed:0,conflict:0,missing:0});

  for(const p of canonical){
    const hits=sourceIndex.get(canonicalKey(p))||[];
    if(!hits.length){counts.unmatchedPolicies++;continue;}
    counts.matchedPolicies++; if(hits.length>1)counts.multiSourcePolicies++;
    const patch={id:clean(p.id),tenantId:TENANT,fields:{},provenance:{sourceType:'polizas_detail_enrichment',cutoff:'2026-07-30',matchedSources:hits.length}};
    for(const [target,names] of Object.entries(FIELD_MAP)){
      const merged=mergeField(hits,names);
      if(merged.status==='value'){
        // No sobrescribir un valor canónico distinto; el dry-run solo propone campos ausentes/nuevos.
        if(nonempty(p[target])&&norm(p[target])!==norm(merged.value)){counts.fields[target].conflict++;counts.fieldConflicts++;continue;}
        if(!nonempty(p[target])){patch.fields[target]=merged.value;counts.fields[target].proposed++;}
      }else if(merged.status==='conflict'){counts.fields[target].conflict++;counts.fieldConflicts++;}
      else counts.fields[target].missing++;
    }
    if(Object.keys(patch.fields).length)patches.push(patch);
  }

  const privatePayload={schemaVersion:'orbit360-policies-detail-enrichment-private-v1',tenantId:TENANT,containsPII:true,containsSecrets:false,patches};
  fs.writeFileSync(PRIVATE_DIFF,JSON.stringify(privatePayload));
  const evidence={
    schemaVersion:'orbit360-policies-detail-enrichment-dryrun-v1',status:'DRYRUN_PASS',ok:true,tenantId:TENANT,
    canonicalPolicies:canonical.length,sourceFiles:SOURCES.length,sourceMeta,matchedPolicies:counts.matchedPolicies,unmatchedPolicies:counts.unmatchedPolicies,multiSourcePolicies:counts.multiSourcePolicies,
    proposedPolicyPatches:patches.length,fieldConflicts:counts.fieldConflicts,fields:counts.fields,
    writes:{firestore:0,operational:0},privateDiffWritten:true,privateDiffPublished:false,productionTouched:false,containsPII:false,containsSecrets:false,
    invariants:{noInventedValues:true,noOverwriteDifferentCanonicalValue:true,conflictsFailClosed:true,noCobros:true,noFinmovs:true,noReceiptsMutation:true}
  };
  fs.writeFileSync(EVIDENCE,JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
}

try{main();}catch(e){const out={schemaVersion:'orbit360-policies-detail-enrichment-dryrun-v1',status:'BLOCKED',ok:false,classification:String(e.message||e).split(':')[0],error:String(e.message||e).slice(0,240),writes:{firestore:0,operational:0},productionTouched:false,containsPII:false,containsSecrets:false};try{fs.writeFileSync(EVIDENCE,JSON.stringify(out,null,2)+'\n');}catch{}console.error(String(e.message||e));process.exit(41);}
