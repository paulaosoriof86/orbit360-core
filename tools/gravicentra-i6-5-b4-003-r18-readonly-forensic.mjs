import fs from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const outPath=process.env.B4_003_R18_FORENSIC_OUT||'/tmp/b4-003-r18-readonly-forensic.json';
const referenceDate=process.env.FORENSIC_REFERENCE_DATE||'2026-10-05';
const targetPolicyNumber=process.env.R18_TARGET_POLICY_NUMBER||'1003687';
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const keynum=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]+/g,'');
const sha=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
const isoDate=v=>{
  if(!v) return '';
  if(v&&typeof v.toDate==='function') return v.toDate().toISOString().slice(0,10);
  const s=clean(v); return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):'';
};
const dayDiff=(from,to)=>{
  const a=Date.parse(from+'T00:00:00Z'),b=Date.parse(to+'T00:00:00Z');
  return Number.isFinite(a)&&Number.isFinite(b)?Math.floor((b-a)/86400000):null;
};
const activeState=p=>['Vigente','Por renovar'].includes(clean(p?.estado));
const renewabilityState=p=>{
  if(!p || !Object.prototype.hasOwnProperty.call(p,'renovable') || p.renovable==null || clean(p.renovable)==='') return 'UNKNOWN';
  const v=clean(p.renovable).toLowerCase();
  if(p.renovable===true || ['true','si','sí','renovable'].includes(v)) return 'YES';
  if(p.renovable===false || ['false','no','no renovable'].includes(v)) return 'NO';
  return 'UNKNOWN';
};
const policyState=p=>clean(p?.estado).toLowerCase().replace(/\s+/g,'');
const terminalOutcome=p=>{
  if(!p) return true;
  if(clean(p.renovadaPor)) return true;
  const s=clean(p.renovacionEstado).toLowerCase().replace(/[\s_-]+/g,'');
  return ['renovada','norenovada','rechazada','cerrada','cancelada'].includes(s);
};
const renewalActionable=p=>{
  if(renewabilityState(p)!=='YES'||terminalOutcome(p)) return false;
  const d=dayDiff(referenceDate,isoDate(p.vigenciaFin||p.fechaFin||p.fechaVencimiento||p.finVigencia));
  if(d==null) return false;
  const st=policyState(p);
  return d<0?['vigente','porrenovar','vencida'].includes(st):['vigente','porrenovar'].includes(st);
};
const pendingValidation=p=>{
  if(renewabilityState(p)!=='UNKNOWN'||terminalOutcome(p)) return false;
  const d=dayDiff(referenceDate,isoDate(p.vigenciaFin||p.fechaFin||p.fechaVencimiento||p.finVigencia));
  return d!=null&&d<=90&&['vigente','porrenovar'].includes(policyState(p));
};

const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),tenant=db.collection('tenants').doc(tenantId);
async function rows(name){const s=await tenant.collection('data').doc(name).collection('items').get();return s.docs.map(d=>({id:d.id,...d.data()}));}
const [polizas,clientes,aseguradoras]=await Promise.all([rows('polizas'),rows('clientes'),rows('aseguradoras')]);
const clients=new Map(clientes.map(x=>[x.id,x])),insurers=new Map(aseguradoras.map(x=>[x.id,x]));

const within45=polizas.filter(p=>{
  const d=dayDiff(referenceDate,isoDate(p.vigenciaFin||p.fechaFin||p.fechaVencimiento||p.finVigencia));
  return activeState(p)&&d!=null&&d>=0&&d<=45;
});
const classify=p=>{
  const d=dayDiff(referenceDate,isoDate(p.vigenciaFin||p.fechaFin||p.fechaVencimiento||p.finVigencia));
  const rs=renewabilityState(p);
  if(terminalOutcome(p)) return 'TERMINAL_OUTCOME';
  if(rs==='NO') return 'CONFIRMED_NONRENEWABLE';
  if(renewalActionable(p)) return d<0?'ACTIONABLE_EXPIRED':d<=15?'ACTIONABLE_D15':d<=45?'ACTIONABLE_D45':'ACTIONABLE_D90';
  if(pendingValidation(p)) return 'PENDING_CLASSIFICATION';
  return 'UNEXPLAINED_HIDDEN';
};
const renewalUniverse=within45.map(p=>{
  const c=clients.get(p.clienteId)||{},a=insurers.get(p.aseguradoraId)||{};
  const d=dayDiff(referenceDate,isoDate(p.vigenciaFin||p.fechaFin||p.fechaVencimiento||p.finVigencia));
  return {
    id:p.id,numero:p.numero||'',clienteId:p.clienteId||'',cliente:c.nombre||c.razonSocial||'',asesguradoraId:p.aseguradoraId||'',
    aseguradora:a.nombre||'',pais:p.pais||c.pais||'',estado:p.estado||'',vigenciaInicio:isoDate(p.vigenciaInicio||p.vigenciaIni),
    vigenciaFin:isoDate(p.vigenciaFin),days:d,renovable:Object.prototype.hasOwnProperty.call(p,'renovable')?p.renovable:null,
    renewabilityState:renewabilityState(p),renovacionEstado:p.renovacionEstado||'',renovadaPor:p.renovadaPor||'',renuevaDe:p.renuevaDe||'',
    ramo:p.ramo||'',producto:p.producto||p.subramo||'',disposition:classify(p)
  };
}).sort((a,b)=>(a.days??999)-(b.days??999)||a.numero.localeCompare(b.numero));

const targetMatches=polizas.filter(p=>keynum(p.numero)===keynum(targetPolicyNumber));
async function depCounts(policyId){
  const out={};
  for(const c of ['gestiones','recibosEsperados','carteraPrimas','cobros','vehiculos','cancelaciones']){
    const q=await tenant.collection('data').doc(c).collection('items').where('polizaId','==',policyId).get();
    out[c]=q.size;
  }
  return out;
}
const targetRows=[];
for(const p of targetMatches){
  const c=clients.get(p.clienteId)||{},a=insurers.get(p.aseguradoraId)||{};
  const commercialKey=[clean(p.pais||c.pais).toUpperCase(),clean(p.aseguradoraId),keynum(p.numero),clean(p.clienteId)].join('|');
  targetRows.push({
    id:p.id,numero:p.numero||'',commercialKey,clienteId:p.clienteId||'',cliente:c.nombre||c.razonSocial||'',
    aseguradoraId:p.aseguradoraId||'',aseguradora:a.nombre||'',pais:p.pais||c.pais||'',estado:p.estado||'',
    vigenciaInicio:isoDate(p.vigenciaInicio||p.vigenciaIni),vigenciaFin:isoDate(p.vigenciaFin),renovable:Object.prototype.hasOwnProperty.call(p,'renovable')?p.renovable:null,
    renovacionEstado:p.renovacionEstado||'',renuevaDe:p.renuevaDe||'',renovadaPor:p.renovadaPor||'',sourceRef:p.sourceRef||p._origenHoja||'',
    createdAt:isoDate(p.createdAt),updatedAt:isoDate(p.updatedAt),dependents:await depCounts(p.id)
  });
}
targetRows.sort((a,b)=>a.commercialKey.localeCompare(b.commercialKey)||a.vigenciaInicio.localeCompare(b.vigenciaInicio)||a.id.localeCompare(b.id));
const groups={};
for(const r of targetRows)(groups[r.commercialKey]||(groups[r.commercialKey]=[])).push(r);
const collisions=Object.entries(groups).filter(([,v])=>v.length>1).map(([commercialKey,rows])=>{
  const sorted=rows.slice().sort((a,b)=>a.vigenciaInicio.localeCompare(b.vigenciaInicio));
  let overlap=false,distinctTerms=true;
  const terms=new Set();
  for(let i=0;i<sorted.length;i++){
    const term=sorted[i].vigenciaInicio+'|'+sorted[i].vigenciaFin;
    if(terms.has(term)) distinctTerms=false; terms.add(term);
    if(i>0 && sorted[i-1].vigenciaFin && sorted[i].vigenciaInicio && sorted[i].vigenciaInicio < sorted[i-1].vigenciaFin) overlap=true;
  }
  const linked=sorted.every((r,i)=>i===0 || r.renuevaDe===sorted[i-1].id || sorted[i-1].renovadaPor===r.id);
  const classification=!distinctTerms?'POSSIBLE_DUPLICATE_SAME_TERM':overlap?'POSSIBLE_OVERLAPPING_EDITIONS':linked?'LEGITIMATE_LINKED_EDITIONS':'LEGITIMATE_EDITION_PATTERN_LINEAGE_INCOMPLETE';
  return {commercialKey,count:rows.length,distinctTerms,overlap,linked,classification,rows};
});

const engine=fs.readFileSync('orbit360-platform/core/policy-receipts-engine.js','utf8');
const sourceAudit={
  validatorSelfExclusionPresent:/x\.id\s*!==\s*poliza\.id|x\.id\s*!==\s*p\.id/.test(engine)||engine.includes('x.id!==p.id'),
  validatorCommercialKeyPresent:/aseguradoraId/.test(engine)&&/clienteId/.test(engine)&&/numero/.test(engine),
  engineSha256:sha(engine)
};
const dispositionCounts={};
for(const r of renewalUniverse) dispositionCounts[r.disposition]=(dispositionCounts[r.disposition]||0)+1;
const unexplained=renewalUniverse.filter(x=>x.disposition==='UNEXPLAINED_HIDDEN');

const receipt={
  schema:'GRAVICENTRA_I6_5_B4_003_R18_READONLY_FORENSIC_V1',
  recordedAt:new Date().toISOString(),status:'READONLY_FORENSIC_COMPLETE',mode:'READ_ONLY_NO_WRITES',
  repository:'paulaosoriof86/orbit360-core',branch:'recovery/fase-a-clean-20260831',projectId,tenantId,referenceDate,
  counts:{polizas:polizas.length,clientes:clientes.length,aseguradoras:aseguradoras.length,within45:renewalUniverse.length,targetPolicyNumberMatches:targetRows.length,collisionGroups:collisions.length},
  renewal45:{predicate:'Pólizas KPI exact source rule = estado Vigente/Por renovar + 0..45 days from vigenciaFin',dispositionCounts,rows:renewalUniverse,unexplainedCount:unexplained.length,exactlyAccounted:unexplained.length===0},
  targetPolicyCollision:{targetPolicyNumber,rows:targetRows,collisions},
  sourceAudit,
  conclusions:{
    renewalUniverseFailClosed:unexplained.length===0,
    duplicateCollisionDemonstrated:collisions.length>0,
    duplicateCollisionClassification:collisions.map(x=>x.classification),
    safeToMutate:false
  },
  boundaries:{businessWrites:0,syntheticWrites:0,dataMutation:false,reimport:false,livePromotion:false},
  nextAction:collisions.length?'R18_CAUSAL_PRODUCT_FIX_WITH_VERSION_AWARE_VALIDATION':'R18_CAUSAL_PRODUCT_FIX_WITHOUT_DUPLICATE_VALIDATOR_CHANGE'
};
fs.writeFileSync(outPath,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({status:receipt.status,counts:receipt.counts,renewalDispositionCounts:dispositionCounts,targetPolicyCollision:receipt.targetPolicyCollision,sourceAudit,conclusions:receipt.conclusions,boundaries:receipt.boundaries,nextAction:receipt.nextAction},null,2));
