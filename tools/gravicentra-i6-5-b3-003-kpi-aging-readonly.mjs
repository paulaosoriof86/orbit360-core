import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT=String(process.env.TENANT_HINT||'alianzas-soluciones').trim();
const OUT=process.env.B3_003_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b3-003-kpi-aging-readonly.json');
const COLLECTIONS=['clientes','polizas','cobros','carteraPrimas'];
const text=v=>String(v==null?'':v).trim();
const normText=v=>text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};
const sha=v=>crypto.createHash('sha256').update(String(v||'')).digest('hex');
const now=()=>new Date().toISOString();
function serviceAccount(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}
  }
  if(process.env.GOOGLE_APPLICATION_CREDENTIALS){
    const x=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
    if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;
  }
  throw new Error('B3_003_SERVICE_ACCOUNT_MISSING');
}
function group(rows,keyFn,amountFn){
  const out={};
  for(const r of rows){
    const k=text(keyFn(r))||'MISSING';
    out[k] ||= {count:0,amount:0};
    out[k].count++;
    out[k].amount+=num(amountFn(r));
  }
  return out;
}
function rowId(r){return text(r?.id||r?.canonicalDocumentId||r?.legacyDataId);}
function portfolioOpen(r){
  const st=normText(r?.estadoCartera||r?.estado);
  if(r?.conciliadoPago===true)return false;
  return !['pagado','cobrado','cerrado','anulado','cancelado','cancelada'].includes(st);
}
function dueDate(r){return text(r?.vence||r?.fechaVencimiento||r?.fechaLimite);}
function daysLate(date){
  if(!date)return null;
  const d=new Date(date+'T00:00:00Z'); if(Number.isNaN(d.getTime()))return null;
  const today=new Date(); const t=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()));
  return Math.floor((t-d)/86400000);
}
function overdue(r){const d=daysLate(dueDate(r));return portfolioOpen(r)&&d!=null&&d>0;}
function confirmedCobro(r){
  const st=normText(r?.estado);
  return st==='pagado'||st==='conciliado'||r?.conciliado===true;
}
function amountPortfolio(r){return r?.monto!=null?num(r.monto):num(r?.saldo);}
function amountCobro(r){return num(r?.monto);}
function currencyOf(r,policy,client){return text(r?.moneda||policy?.moneda||client?.moneda).toUpperCase()||'MISSING';}
function countryOf(r,policy,client){return text(r?.pais||policy?.pais||client?.pais).toUpperCase()||'MISSING';}
function legacyNorm(amount,currency,activeCountry){
  const n=num(amount);
  if(activeCountry)return n;
  return currency==='COP'?n/1000:n;
}

const evidence={
  schema:'GRAVICENTRA_I6_5_B3_003_KPI_AGING_CURRENCY_DIAGNOSTIC_V1',
  recordedAt:now(),repository:'paulaosoriof86/orbit360-core',branch:process.env.GITHUB_REF_NAME||'',headSha:process.env.GITHUB_SHA||'',
  tenant:TENANT,boundaries:{readOnly:true,businessWrites:0,reimport:false,livePromotion:false,productMutation:false},
  sourceInspection:{},runtime:{},conclusion:{status:'PENDING'}
};
let app;
try{
  const source=fs.readFileSync('orbit360-platform/core/queries.js','utf8');
  evidence.sourceInspection={
    queriesBlobSha:sha(source),
    allCountriesCopFixedDivisor:/const TC_COP_GTQ = 1000/.test(source),
    allCountriesNormOnlySpecialCasesCop:/cur === 'COP' \? n \/ TC_COP_GTQ : n/.test(source),
    displayCurrencyOnlyCoElseGtq:/p === 'CO' \? 'COP' : 'GTQ'/.test(source),
    carteraGlobalCountryFiltersPortfolio:/policyLinkedRowPais\(c, clients, policies\)/.test(source),
    agingMissingCountryFilter:/function agingVencido\(\)[\s\S]*?S\(\)\.all\('carteraPrimas'\)[\s\S]*?filter\(portfolioIsOverdue\)/.test(source)&&!/function agingVencido\(\)[\s\S]*?policyLinkedRowPais/.test(source.split('function agingVencido()')[1]?.split('function comisionesPor')[0]||''),
    confirmedCobroStates:/state === 'pagado' \|\| state === 'conciliado' \|\| row && row\.conciliado === true/.test(source)
  };
  app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'b3-003-'+Date.now());
  const db=getFirestore(app);
  const data={};
  for(const c of COLLECTIONS){
    const snap=await db.collection(`tenants/${TENANT}/data/${c}/items`).get();
    data[c]=snap.docs.map(d=>({id:d.id,...(d.data()||{})}));
  }
  const clientsById=new Map(data.clientes.map(r=>[rowId(r),r]));
  const policiesById=new Map(data.polizas.map(r=>[rowId(r),r]));
  const enrich=(r)=>{
    const p=policiesById.get(text(r?.polizaId))||null;
    const c=clientsById.get(text(r?.clienteId||p?.clienteId))||null;
    return {row:r,policy:p,client:c,currency:currencyOf(r,p,c),country:countryOf(r,p,c)};
  };
  const confirmed=data.cobros.filter(confirmedCobro).map(enrich);
  const portfolio=data.carteraPrimas.filter(portfolioOpen).map(enrich);
  const pending=portfolio.filter(x=>!overdue(x.row));
  const late=portfolio.filter(x=>overdue(x.row));

  function segment(rows){
    return {
      count:rows.length,
      byCurrency:group(rows,x=>x.currency,x=>x===undefined?0:1),
      amountByCurrency:group(rows,x=>x.currency,x=>x.row&&x.row.monto!=null?x.row.monto:(x.row&&x.row.saldo)),
      byCountry:group(rows,x=>x.country,x=>x===undefined?0:1),
      missingCurrency:rows.filter(x=>x.currency==='MISSING').length,
      currencies:[...new Set(rows.map(x=>x.currency))].sort(),
      countries:[...new Set(rows.map(x=>x.country))].sort()
    };
  }
  function legacyAggregate(rows,activeCountry){
    const filtered=activeCountry?rows.filter(x=>x.country===activeCountry):rows;
    let total=0;
    for(const x of filtered){
      const amt=x.row&&x.row.monto!=null?x.row.monto:x.row&&x.row.saldo;
      total+=legacyNorm(amt,x.currency,activeCountry);
    }
    return {rows:filtered.length,total,displayCurrency:activeCountry==='CO'?'COP':'GTQ',currencies:[...new Set(filtered.map(x=>x.currency))].sort()};
  }
  const agingAll=late;
  const agingByCountry={};
  for(const country of [...new Set(late.map(x=>x.country))].filter(x=>x!=='MISSING')){
    agingByCountry[country]=late.filter(x=>x.country===country).length;
  }
  const actualCurrencies=[...new Set([...confirmed,...pending,...late].map(x=>x.currency))].filter(x=>x!=='MISSING').sort();
  const unsupported=actualCurrencies.filter(x=>!['GTQ','COP'].includes(x));
  const allCountryMix=[...new Set([...confirmed,...pending,...late].map(x=>x.currency))].filter(x=>x!=='MISSING');
  const allCountryUnsafe=allCountryMix.length>1;
  const agingCountryLeak=Object.keys(agingByCountry).length>1 && evidence.sourceInspection.agingMissingCountryFilter;

  evidence.runtime={
    collectionCounts:Object.fromEntries(COLLECTIONS.map(c=>[c,data[c].length])),
    confirmedCobros:segment(confirmed),
    portfolioPending:segment(pending),
    portfolioOverdue:segment(late),
    legacyAllCountries:{
      confirmed:legacyAggregate(confirmed,null),
      pending:legacyAggregate(pending,null),
      overdue:legacyAggregate(late,null)
    },
    byCountry:{
      GT:{confirmed:legacyAggregate(confirmed,'GT'),pending:legacyAggregate(pending,'GT'),overdue:legacyAggregate(late,'GT')},
      CO:{confirmed:legacyAggregate(confirmed,'CO'),pending:legacyAggregate(pending,'CO'),overdue:legacyAggregate(late,'CO')}
    },
    actualCurrencies,
    unsupportedCurrencies:unsupported,
    allCountriesMixedCurrencySet:allCountryMix.sort(),
    allCountriesCrossCurrencyAggregationUnsafe:allCountryUnsafe,
    agingOverdueRowsByCountry:agingByCountry,
    agingCountryFilterLeakDemonstrated:agingCountryLeak
  };
  const causes=[];
  if(allCountryUnsafe)causes.push('ALL_COUNTRIES_SUMS_MULTIPLE_CURRENCIES_IN_ONE_DISPLAY_AMOUNT');
  if(unsupported.length)causes.push('UNSUPPORTED_CURRENCIES_ARE_LEFT_UNCONVERTED_AND_MIXED');
  if(evidence.sourceInspection.allCountriesCopFixedDivisor)causes.push('FIXED_COP_DIVISOR_IS_NOT_CANONICAL_FX_AUTHORITY');
  if(agingCountryLeak)causes.push('AGING_IGNORES_ACTIVE_COUNTRY_FILTER');
  if(evidence.runtime.confirmedCobros.missingCurrency||evidence.runtime.portfolioPending.missingCurrency||evidence.runtime.portfolioOverdue.missingCurrency)causes.push('FINANCIAL_ROWS_WITH_MISSING_CURRENCY');
  evidence.conclusion={
    status:causes.length?'CAUSE_CONFIRMED':'NO_DEFECT_DEMONSTRATED',
    rootCauses:causes,
    productFixAuthorized:false,
    requiredFixBoundary:causes.length?[
      'Never add nominal amounts from different currencies into one KPI.',
      'Country filter must apply identically to carteraGlobal and agingVencido.',
      'Currency display must be derived from selected country/currency authority, not default silently to GTQ.',
      'Do not introduce exchange conversion without an approved canonical FX source.',
      'Preserve payment-state separation: reported evidence is not confirmed cobro.'
    ]:[]
  };
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
  console.log('B3_003_DIAGNOSTIC='+evidence.conclusion.status);
  console.log('B3_003_CURRENCIES='+JSON.stringify(evidence.runtime.actualCurrencies));
  console.log('B3_003_UNSAFE_ALL_COUNTRIES='+String(evidence.runtime.allCountriesCrossCurrencyAggregationUnsafe));
  console.log('B3_003_AGING_COUNTRY_LEAK='+String(evidence.runtime.agingCountryFilterLeakDemonstrated));
  console.log('B3_003_ROOT_CAUSES='+JSON.stringify(evidence.conclusion.rootCauses));
}catch(error){
  evidence.conclusion={status:'DIAGNOSTIC_FAILED',error:String(error?.stack||error?.message||error)};
  try{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');}catch{}
  throw error;
}finally{
  try{if(app)await deleteApp(app);}catch{}
}
