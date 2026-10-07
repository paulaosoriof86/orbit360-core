import fs from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp, applicationDefault, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const OUT=process.env.R20_COUNTRY_BACKFILL_RESULT||'/tmp/r20-country-backfill-dryrun.json';
const clean=v=>String(v==null?'':v).trim();
const normCountry=v=>{const x=clean(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z]/g,'');if(['GT','GUA','GUATEMALA'].includes(x))return'GT';if(['CO','COL','COLOMBIA'].includes(x))return'CO';return'';};
const currency=c=>c==='GT'?'GTQ':c==='CO'?'COP':'';
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
const db=getFirestore(app),tenant=db.collection('tenants').doc(TENANT);
const col=n=>tenant.collection('data').doc(n).collection('items');
const result={schema:'GRAVICENTRA_I6_5_B4_003_R20_COUNTRY_BACKFILL_DRYRUN_V1',recordedAt:new Date().toISOString(),projectId:PROJECT,tenantId:TENANT,readOnly:true,writes:0,reimport:false,livePromotion:false,status:'INIT',errors:[]};
try{
  const names=['clientes','polizas','aseguradoras','recibosEsperados','carteraPrimas','cobros'];
  const snaps=Object.fromEntries(await Promise.all(names.map(async n=>[n,await col(n).get()])));
  const rows=Object.fromEntries(names.map(n=>[n,snaps[n].docs.map(d=>({__id:d.id,...(d.data()||{})}))]));
  const insurers=new Map(rows.aseguradoras.map(r=>[r.__id,r]));
  const policiesByClient=new Map();
  for(const p of rows.polizas){const cid=clean(p.clienteId||p.clientId);if(!cid)continue;if(!policiesByClient.has(cid))policiesByClient.set(cid,[]);policiesByClient.get(cid).push(p);}
  const financialByPolicy=new Map();
  for(const n of ['recibosEsperados','carteraPrimas','cobros'])for(const r of rows[n]){const pid=clean(r.polizaId||r.policyId);if(!pid)continue;if(!financialByPolicy.has(pid))financialByPolicy.set(pid,[]);financialByPolicy.get(pid).push({kind:n,row:r});}
  const summary={clients:rows.clientes.length,validCountry:0,pendingCountry:0,candidates:0,conflicts:0,noEvidence:0,proposedGT:0,proposedCO:0};
  const candidates=[],conflicts=[],noEvidence=[],basisCounts={policy:0,insurer:0,financial:0};
  for(const c of rows.clientes){
    const current=normCountry(c.pais||c.country);if(current){summary.validCountry++;continue;}summary.pendingCountry++;
    const evidence=[];
    for(const p of policiesByClient.get(c.__id)||[]){
      const pc=normCountry(p.pais||p.country);if(pc)evidence.push({country:pc,basis:'policy'});
      const a=insurers.get(clean(p.aseguradoraId||p.insurerId));const ac=normCountry(a&&(a.pais||a.country));if(ac)evidence.push({country:ac,basis:'insurer'});
      for(const x of financialByPolicy.get(p.__id)||[]){const fc=normCountry(x.row.pais||x.row.country);if(fc)evidence.push({country:fc,basis:'financial'});}
    }
    const countries=[...new Set(evidence.map(x=>x.country))];
    const basis=[...new Set(evidence.map(x=>x.basis))];
    if(countries.length===1){
      const proposed=countries[0];summary.candidates++;summary['proposed'+proposed]++;basis.forEach(b=>basisCounts[b]++);
      candidates.push({idHash:hash(c.__id).slice(0,16),proposedCountry:proposed,proposedCurrency:currency(proposed),basis,evidenceCount:evidence.length,proposedPatch:{pais:proposed,moneda:currency(proposed),calidadCountryRuleId:'R20_LINKED_POLICY_INSURER_COUNTRY_20261007'}});
    }else if(countries.length>1){summary.conflicts++;conflicts.push({idHash:hash(c.__id).slice(0,16),countries,basis,evidenceCount:evidence.length});}
    else{summary.noEvidence++;noEvidence.push({idHash:hash(c.__id).slice(0,16)});}
  }
  const targetDigest=hash(candidates),conflictDigest=hash(conflicts);
  Object.assign(result,{status:'PASS_DRY_RUN',collectionCounts:Object.fromEntries(names.map(n=>[n,rows[n].length])),summary,basisCounts,candidates:{count:candidates.length,targetDigest,rows:candidates},conflicts:{count:conflicts.length,conflictDigest,rows:conflicts},unresolved:{count:noEvidence.length,rows:noEvidence.slice(0,100)},integrity:{noWrites:true,noDeletes:true,noInserts:true,onlyUniqueConsistentEvidenceProposed:true,conflictsHeld:true,noPhoneInference:true}});
  fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({status:result.status,summary,basisCounts,targetDigest,conflictDigest},null,2));
}catch(error){result.status='FAIL';result.errors.push(String(error&&error.stack||error));try{fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');}catch{}throw error;}finally{try{await deleteApp(app);}catch{}}
