import fs from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp, applicationDefault, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const TODAY='2026-10-07';
const CUTOFF='2026-07-31';
const RECENT_START='2026-08-01';
const OUT=process.env.R20_RENEWAL_CUTOFF_RESULT||'/tmp/r20-renewal-cutoff-dryrun.json';
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const validDate=v=>/^20\d{2}-\d{2}-\d{2}$/.test(clean(v));
const renewability=p=>{
  if(!Object.prototype.hasOwnProperty.call(p||{},'renovable')||p.renovable==null||clean(p.renovable)==='')return'UNKNOWN';
  const v=norm(p.renovable); if(p.renovable===true||['true','si','renovable'].includes(v))return'YES';
  if(p.renovable===false||['false','no','norenovable'].includes(v))return'NO'; return'UNKNOWN';
};
const renewalOutcome=p=>{
  if(clean(p&&p.renovadaPor))return'RENEWED';
  const x=norm(p&&p.renovacionEstado);
  if(x==='renovada')return'RENEWED';
  if(['norenovada','rechazada','cerrada'].includes(x))return'NO_RENEWED';
  if(x==='cancelada')return'CANCELLED';
  const e=norm(p&&p.estado);
  if(['cancelada','anulada'].includes(e))return'CANCELLED';
  return'OPEN';
};
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
const db=getFirestore(app),tenant=db.collection('tenants').doc(TENANT);
const col=n=>tenant.collection('data').doc(n).collection('items');
const result={schema:'GRAVICENTRA_I6_5_B4_003_R20_RENEWAL_CUTOFF_DRYRUN_V1',recordedAt:new Date().toISOString(),projectId:PROJECT,tenantId:TENANT,today:TODAY,cutoff:CUTOFF,recentStart:RECENT_START,readOnly:true,writes:0,reimport:false,livePromotion:false,status:'INIT',errors:[]};
try{
  const [ps,cs]=await Promise.all([col('polizas').get(),col('cancelaciones').get()]);
  const cancellations=new Set();
  for(const d of cs.docs){const r=d.data()||{},pid=clean(r.polizaId||r.policyId);if(pid)cancellations.add(pid);}
  const by={all:ps.size,expired:0,oldExpiredOpen:0,recentExpiredOpen:0,renewed:0,cancelled:0,noRenewed:0,nonRenewable:0,invalidDate:0};
  const oldTargets=[],recentPipeline=[],holds=[];
  for(const d of ps.docs){
    const p=d.data()||{},id=d.id,end=clean(p.vigenciaFin||p.fechaFin||p.endDate);
    if(!validDate(end)){by.invalidDate++;continue;}
    if(end>=TODAY)continue;by.expired++;
    let outcome=renewalOutcome(p);if(cancellations.has(id))outcome='CANCELLED';
    if(outcome==='RENEWED'){by.renewed++;continue;}
    if(outcome==='CANCELLED'){by.cancelled++;continue;}
    if(outcome==='NO_RENEWED'){by.noRenewed++;continue;}
    const r=renewability(p);
    if(r==='NO'){by.nonRenewable++;holds.push({idHash:hash(id).slice(0,16),end,reason:'EXPLICIT_NON_RENEWABLE'});continue;}
    if(end<=CUTOFF){
      by.oldExpiredOpen++;
      oldTargets.push({idHash:hash(id).slice(0,16),numeroHash:hash(clean(p.numero)).slice(0,12),vigenciaFin:end,pais:clean(p.pais),estado:clean(p.estado),renewability:r,currentRenewalOutcome:clean(p.renovacionEstado),proposedPatch:{renovacionEstado:'No renovada',renewalDispositionRuleId:'PAULA_EXPIRED_CUTOFF_20261007',renewalDispositionReason:'VIGENCIA_FIN_HASTA_2026_07_31_SIN_RENOVACION_NI_CANCELACION'}});
    }else if(end>=RECENT_START&&end<TODAY){
      by.recentExpiredOpen++;
      recentPipeline.push({idHash:hash(id).slice(0,16),numeroHash:hash(clean(p.numero)).slice(0,12),vigenciaFin:end,pais:clean(p.pais),estado:clean(p.estado),renewability:r,expectedBucket:'Vencidas'});
    }
  }
  const monthCounts={};
  for(const row of oldTargets.concat(recentPipeline)){const m=row.vigenciaFin.slice(0,7);monthCounts[m]=(monthCounts[m]||0)+1;}
  const oldTargetDigest=hash(oldTargets),recentDigest=hash(recentPipeline);
  Object.assign(result,{status:'PASS_DRY_RUN',summary:by,monthCounts,oldExpiredDisposition:{candidateCount:oldTargets.length,targetDigest:oldTargetDigest,proposedFields:['renovacionEstado','renewalDispositionRuleId','renewalDispositionReason'],candidates:oldTargets},recentExpiredPipeline:{candidateCount:recentPipeline.length,targetDigest:recentDigest,candidates:recentPipeline},holds:{explicitNonRenewable:holds.length,sample:holds.slice(0,20)},integrity:{noWrites:true,noDeletes:true,noInserts:true,noUiHiding:true,oldAndRecentDispositionsMutuallyExclusive:true}});
  fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({status:result.status,summary:by,oldCandidateCount:oldTargets.length,recentCandidateCount:recentPipeline.length,monthCounts,oldTargetDigest,recentDigest},null,2));
}catch(error){result.status='FAIL';result.errors.push(String(error&&error.stack||error));try{fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');}catch{}throw error;}finally{try{await deleteApp(app);}catch{}}
