'use strict';
// Gravicentra I6.5/B4-003: isolated, real Firestore *READ-ONLY* UAT4 reconciliation.
// Do not export names, UIDs, documents, claims, policy IDs other than the already
// user-reported AUTO39012, or any row-level operational/PII payload.
// Guardrails: no writes, no reimport, no rules changes, no signed-user tokens.
const fs=require('node:fs');
const {initializeApp,applicationDefault}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const crypto=require('node:crypto');
const tenantId='alianzas-soluciones',project='ays-orbit-360-lab';
const outPath=process.env.B4_003_UAT4_CAUSAL_OUT;
if(!outPath)throw Error('READONLY_OUTPUT_MISSING');
const credentials=process.env.GOOGLE_APPLICATION_CREDENTIALS;
if(!credentials||!fs.existsSync(credentials))throw Error('READONLY_CREDENTIAL_MISSING');
const meta=JSON.parse(fs.readFileSync(credentials,'utf8'));
if(meta.project_id!==project||meta.type!=='service_account')throw Error('READONLY_PROJECT_DENIED');
const guard=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json','utf8'));
const b4=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B4_EXECUTION_LOCK_20261002.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_FINDINGS_LEDGER_20260924.json','utf8'));
if(guard.nextAction!=='I6_5_FORENSIC_REMEDIATION_B4_003_R20_TARGETED_PAULA_VISUAL'||
guard.currentB4?.status!=='B4_003_MACHINE_PASS_PENDING_PAULA_VISUAL'||
guard.b4003SecurityReleaseHold?.status!=='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'||
guard.b4003CurrentCumulativePreviewProof?.runId!==39324152069||
guard.i6Execution?.dataMutationAuthorized!==false||
b4.boundaries?.dataMutationAuthorized!==false||
b4.boundaries?.productMutationAuthorized!==false||
b4.boundaries?.realOperationalWritesAuthorized!==false||
b4.boundaries?.livePromotionAuthorized!==false||
ledger.findings?.length!==295)throw Error('READONLY_AUTHORITY_OR_295_LEDGER_DRIFT');
const app=initializeApp({credential:applicationDefault(),projectId:project});
const db=getFirestore(app);
const wanted=['clientes','polizas','recibosEsperados','carteraPrimas','cobros','conciliaciones','conciliacionesPrimas'];
const text=v=>String(v==null?'':v).trim();
const iso=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[_-]/g,' ').replace(/\s+/g,' ').trim();
const money=v=>v==null||text(v)===''?null:(Number.isFinite(Number(v))?Number(v):null);
const fixed=v=>Math.round((v+Number.EPSILON)*100)/100;
const sum=(rows,pick)=>fixed(rows.reduce((n,row)=>{const v=money(pick(row));return n+(v==null?0:v)},0));
const countBy=(xs,fn)=>{const d={};for(const x of xs){const v=text(fn(x))||'SIN_VALOR';d[v]=(d[v]||0)+1}return Object.fromEntries(Object.entries(d).sort((a,b)=>a[0].localeCompare(b[0])))};
const active=p=>p&&['Vigente','Por renovar'].includes(text(p.estado));
const getCurrency=(p,c)=>text(p.moneda||p.divisa||(c&&c.moneda))||'SIN_MONEDA';
const premium=p=>money(p.primaNeta!=null?p.primaNeta:p.prima);
const policyAmounts=(xs,clients)=>{
 const by={};
 for(const p of xs.filter(active)){
  const client=clients.get(text(p.clienteId));
  const cur=getCurrency(p,client);
  const n=premium(p);
  if(n!=null)by[cur]=fixed((by[cur]||0)+n);
 }
 return by;
};
const country=x=>text(x.pais||x.country).toUpperCase()||'SIN_PAIS';
async function fetchCollection(name){
 const snap=await db.collection('tenants').doc(tenantId).collection('data').doc(name).collection('items').get();
 return snap.docs.map(doc=>({id:doc.id,...(doc.data()||{})}));
}
(async()=>{
 const rows=await Promise.all(wanted.map(fetchCollection));
 const data=Object.fromEntries(wanted.map((k,i)=>[k,rows[i]]));
 const clients=data.clientes,policies=data.polizas;
 const byId=new Map(clients.map(c=>[c.id,c]));
 const merged=clients.filter(c=>c.fusionado===true||!!text(c.mergedIntoClientId));
 const shown=clients.filter(c=>!(c.fusionado===true||!!text(c.mergedIntoClientId)));
 const visible=new Set(shown.map(c=>c.id));
 const linked=policies.filter(p=>visible.has(text(p.clienteId)));
 const omitted=policies.filter(p=>!visible.has(text(p.clienteId)));
 const linkedToMerged=omitted.filter(p=>{const c=byId.get(text(p.clienteId));return c&&(c.fusionado===true||!!text(c.mergedIntoClientId))});
 const orphan=omitted.filter(p=>!byId.has(text(p.clienteId)));
 const emptyClient=omitted.filter(p=>!text(p.clienteId));
 const unknownType=shown.filter(c=>!['natural','persona','persona natural','persona fisica','juridica','juridico','persona juridica','empresa','sociedad'].includes(iso(c.tipo)));
 const natural=shown.filter(c=>['natural','persona','persona natural','persona fisica'].includes(iso(c.tipo)));
 const legal=shown.filter(c=>['juridica','juridico','persona juridica','empresa','sociedad'].includes(iso(c.tipo)));
 const golden=policies.filter(p=>text(p.numero)==='AUTO39012');
 const gold=golden.length===1?golden[0]:null;
 const sourcePolicyClient=gold?byId.get(text(gold.clienteId)):null;
 const goldReceipts=gold?data.recibosEsperados.filter(r=>text(r.polizaId)===text(gold.id)):[];
 const receiptTotal=r=>money(r.primaTotal!=null?r.primaTotal:r.montoTotal);
 const paymentRows=data.cobros;
 const sourceKinds=countBy(data.recibosEsperados,r=>text(r.paymentOrigin||r.paymentOriginKind||r.sourceType||r.fuenteAutoridad)||'NO_TAG');
 const policyCountryTotals=countBy(policies,country);
 const report={
  schema:'GRAVICENTRA_B4_003_UAT4_SOURCE_CAUSAL_READONLY_V1',gate:'I6.5/B4-003',
  sourcePreview:{runId:39324152069,sha:'125a3f314cb23aa128951ad714c95f143de64abb'},
  inputUatSha256:'2cfbb1c601d50cd9caf019ac234ec66f3e4664f97011beb6819326137251fad1',
  mode:'AUTHORITY_GUARDED_ADMIN_READONLY_AGGREGATES',
  tenantLabel:'alianzas-soluciones',
  collectionsCount:Object.fromEntries(wanted.map(k=>[k,data[k].length])),
  clients:{raw:clients.length,visible:shown.length,mergedExcluded:merged.length,
   countryVisible:countBy(shown,country),countryMerged:countBy(merged,country),
   rawType:countBy(shown,c=>iso(c.tipo)||'SIN_TIPO'),
   visibleNatural:natural.length,visibleLegal:legal.length,visibleUnknownType:unknownType.length,
   visibleTypeUnknownCountries:countBy(unknownType,country)},
  policies:{all:policies.length,active:policies.filter(active).length,
   countryAll:policyCountryTotals,visibleClientLinked:linked.length,visibleClientLinkedActive:linked.filter(active).length,
   excludedFromCliente360:omitted.length,excludedActive:omitted.filter(active).length,
   excludedLinkedToMerged:linkedToMerged.length,excludedLinkedToMergedActive:linkedToMerged.filter(active).length,
   excludedOrphanClient:orphan.length,excludedOrphanActive:orphan.filter(active).length,
   excludedBlankClient:emptyClient.length,
   omittedCountry:countBy(omitted,country),
   premiumByCurrencyAllActive:policyAmounts(policies,byId),
   premiumByCurrencyVisibleClientLinkedActive:policyAmounts(linked,byId),
   premiumByCurrencyExcludedActive:policyAmounts(omitted,byId)},
  goldenPolicy:{
   number:'AUTO39012',matchingPolicies:golden.length,
   available:!!gold,
   clientLinkedToVisible:!!(gold&&visible.has(text(gold.clienteId))),
   country:gold?country(gold):null,
   financialFields:gold?Object.fromEntries(['primaNeta','prima','primaTotal','gastosEmision','gastosExpedicion','gastosFinan','gastosFinanciamiento','descuento','ivaMonto','iva','impuestosIVA','otros','otrosGastos','recargos','ajuste','valorTotal'].map(k=>[k,money(gold[k])])):{},
   sourceRefFieldPresent:!!(gold&&(gold.sourceRef||gold._origenHoja)),
   receipts:{count:goldReceipts.length,net:sum(goldReceipts,r=>r.primaNeta),total:sum(goldReceipts,receiptTotal),
    paymentsByState:countBy(goldReceipts,r=>text(r.estadoOperativo||r.estado)),totalAmountsProvided:goldReceipts.filter(r=>receiptTotal(r)!=null).length},
   approvedBusinessTotalFromUat:2678.53,
   note:'No automatic amount overwrite; analyze source-ref authority and calendar lineage separately'
  },
  collections:{
   cobros:paymentRows.length,
   receiptStates:countBy(data.recibosEsperados,r=>text(r.estadoOperativo||r.estado)),
   receiptPaymentOriginTags:sourceKinds,
   reconciliationProposalsCanonical:data.conciliaciones.length,
   reconciliationProposalsPremium:data.conciliacionesPrimas.length,
   reconciliationQueueStates:countBy(data.conciliaciones.concat(data.conciliacionesPrimas),r=>text(r.estado||r.queue_state||r.estado_bandeja))
  },
  caveats:[
    'Firestore Admin is canonical raw storage, not effective per-user signed callable scope',
    'No production writes, data reimport, membership changes, token issuance or Cloud Logging access',
    'UI totals can be filtered by client merge, country, status, role or delayed hydration',
    'Differences do not establish missing data, policy financial correction needs source authority',
    'Cobros SIGA evidence and conciliation proposals are different record types'
  ],
  boundaries:{writes:0,firestoreRulesDeploy:false,hostingDeploy:false,realUserTokens:0,productMutations:0},
  findCountBefore:ledger.findings.length,findCountAfter:ledger.findings.length,
  acceptedPreview:false,acceptedLive:false,progressProductionPercent:20,progressI6FormalPercent:50
 };
 fs.writeFileSync(outPath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log('B4_003_UAT4_READONLY_COUNTS='+JSON.stringify(report.collectionsCount));
 console.log('B4_003_UAT4_CLIENT_RECONCILIATION='+JSON.stringify(report.clients).slice(0,900));
 console.log('B4_003_UAT4_POLICY_RECONCILIATION='+JSON.stringify(report.policies).slice(0,1400));
 console.log('B4_003_UAT4_GOLDEN_POLICY='+JSON.stringify(report.goldenPolicy).slice(0,900));
 console.log('B4_003_UAT4_AGGREGATE_FORENSIC_COMPLETE_WITHOUT_ACCEPTANCE');
})().catch(e=>{console.error('B4_003_UAT4_READONLY_FAIL_CLOSED',String(e?.code||e?.message||e).slice(0,160));process.exitCode=1;});
