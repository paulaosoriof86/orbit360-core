'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..');
const reqFns=createRequire(path.join(root,'functions','package.json'));
const {initializeApp,applicationDefault,getApps}=reqFns('firebase-admin/app');
const {getFirestore}=reqFns('firebase-admin/firestore');

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const outPath=process.env.B4_003_DIAGNOSTIC_OUT||'/tmp/b4-003-renewals-cancelations-diagnostic.json';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const has=(c,re)=>re.test(c);
const norm=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const doneStates=new Set(['resuelta','completada','cerrada','cancelada','anulada']);
(async()=>{
 const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
 const db=getFirestore(app);
 const tenant=db.collection('tenants').doc(tenantId);
 const [polSnap,gesSnap,canSnap,negSnap]=await Promise.all([
   tenant.collection('data').doc('polizas').collection('items').get(),
   tenant.collection('data').doc('gestiones').collection('items').get(),
   tenant.collection('data').doc('cancelaciones').collection('items').get(),
   tenant.collection('data').doc('negocios').collection('items').get()
 ]);
 const pol=polSnap.docs.map(d=>({id:d.id,...d.data()}));
 const ges=gesSnap.docs.map(d=>({id:d.id,...d.data()}));
 const cans=canSnap.docs.map(d=>({id:d.id,...d.data()}));
 const neg=negSnap.docs.map(d=>({id:d.id,...d.data()}));
 const activeRen=ges.filter(g=>['renewal_proposals','renewal_accepted'].includes(String(g.workflowType||''))&&!doneStates.has(norm(g.estado))&&g.archivado!==true);
 const dupRen={};
 for(const g of activeRen){const k=[g.polizaId||g.sourcePolicyId||'',g.workflowType||''].join('|');if(!k.startsWith('|'))dupRen[k]=(dupRen[k]||0)+1;}
 const dupRenRows=Object.entries(dupRen).filter(([,n])=>n>1).map(([key,count])=>({key,count}));
 const activeRecoveryNeg=neg.filter(n=>norm(n.origen)==='recuperacion'&&n.archivado!==true);
 const dupRecovery={};
 for(const n of activeRecoveryNeg){const k=n.cancelacionId||[n.clienteId||'',n.polizaId||''].join('|');if(k)dupRecovery[k]=(dupRecovery[k]||0)+1;}
 const dupRecoveryRows=Object.entries(dupRecovery).filter(([,n])=>n>1).map(([key,count])=>({key,count}));
 const renewalBase=read('orbit360-platform/modules/renovaciones.js');
 const renewalBridge=read('orbit360-platform/modules/renewals-v1200-operational-bridge.js');
 const renewalGuard=read('orbit360-platform/modules/renewals-v1200-permission-guard.js');
 const issuedFilter=read('orbit360-platform/modules/renewals-v1201-issued-filter.js');
 const cancellations=read('orbit360-platform/modules/cancelaciones.js');
 const store=read('orbit360-platform/data/store-firestore-product-operational-p0.js');
 const index=read('orbit360-platform/index.html');
 const posBase=index.indexOf('modules/renovaciones.js');
 const posBridge=index.indexOf('modules/renewals-v1200-operational-bridge.js');
 const posGuard=index.indexOf('modules/renewals-v1200-permission-guard.js');
 const posIssued=index.indexOf('modules/renewals-v1201-issued-filter.js');
 const assertions={
   renewalOperationalBridgeLoadedAfterBase:posBase>=0&&posBridge>posBase,
   renewalPermissionGuardLoadedAfterBridge:posGuard>posBridge,
   renewalIssuedFilterLoadedAfterBridge:posIssued>posBridge,
   renewalProposalsEffectiveOwnerOverridesLegacy:has(renewalBridge,/mod\.solicitarPropuestas\s*=\s*solicitarPropuestas/),
   renewalCampaignEffectiveOwnerOverridesLegacy:has(renewalBridge,/mod\.campana\s*=\s*campana/),
   renewalCampaignCopyDoesNotClaimAutomaticSend:has(renewalBridge,/No env[ií]a WhatsApp ni correo/i),
   renewalAcceptedUsesCanonicalManagementModal:has(renewalBridge,/managementCreateModal\([\s\S]*workflowType:'renewal_accepted'/),
   renewalProposalUsesCanonicalManagementModal:has(renewalBridge,/managementCreateModal\([\s\S]*workflowType:'renewal_proposals'/),
   renewalDuplicateGuardPresent:has(renewalBridge,/existingManagement\(p\.id,'renewal_proposals'\)/)&&has(renewalBridge,/existingManagement\(p\.id,'renewal_accepted'\)/),
   renewedPoliciesFilteredFromRenewalQueue:has(issuedFilter,/!p\.renovadaPor/)&&has(issuedFilter,/renovacionEstado/),
   cancelationsUsesCanonicalRecordDelete:has(cancellations,/Orbit\.recordDelete\.remove\('cancelaciones'/),
   cancelationsCriticalWritesAwaitServerReadback:false,
   cancelationsRecoveryBusinessUsesWorkflowCanonicalStore:has(cancellations,/S\(\)\.insert\('negocios'/)&&has(store,/collection==='negocios'/),
   cancelationsRecoveryManagementUsesWorkflowCanonicalStore:has(cancellations,/crearGestion/)&&has(store,/collection==='gestiones'/),
   storeHasDurableApis:has(store,/insertDurable/)&&has(store,/updateDurable/)
 };
 const optimisticPatterns=[
   {name:'cancelation_state_update',re:/S\(\)\.update\('cancelaciones',\s*canId,\s*patch\)/},
   {name:'recovery_business_update',re:/S\(\)\.update\('negocios'/},
   {name:'recovery_business_insert',re:/S\(\)\.insert\('negocios'/},
   {name:'recovery_management_update',re:/S\(\)\.update\('gestiones'/},
   {name:'renewal_campaign_policy_update',re:/S\(\)\.update\('polizas'/},
   {name:'renewal_campaign_activity_insert',re:/S\(\)\.insert\('actividades'/}
 ];
 const optimisticFindings=[];
 for(const p of optimisticPatterns){
   const src=p.name.startsWith('renewal_')?renewalBridge:cancellations;
   if(p.re.test(src)) optimisticFindings.push(p.name);
 }
 assertions.cancelationsCriticalWritesAwaitServerReadback=!optimisticFindings.some(x=>x.startsWith('cancelation_')||x.startsWith('recovery_'));
 const blocking=[];
 if(!assertions.renewalOperationalBridgeLoadedAfterBase||!assertions.renewalProposalsEffectiveOwnerOverridesLegacy||!assertions.renewalCampaignEffectiveOwnerOverridesLegacy)blocking.push('RENEWAL_EFFECTIVE_OWNER_NOT_SINGLE');
 if(dupRenRows.length)blocking.push('DUPLICATE_ACTIVE_RENEWAL_MANAGEMENTS');
 if(dupRecoveryRows.length)blocking.push('DUPLICATE_ACTIVE_RECOVERY_BUSINESSES');
 if(!assertions.cancelationsCriticalWritesAwaitServerReadback)blocking.push('CANCELATIONS_OPTIMISTIC_CRITICAL_WRITES_WITHOUT_AWAITED_READBACK');
 if(optimisticFindings.includes('renewal_campaign_policy_update')||optimisticFindings.includes('renewal_campaign_activity_insert'))blocking.push('RENEWAL_CAMPAIGN_OPTIMISTIC_WRITES_WITHOUT_AWAITED_READBACK');
 const receipt={
   schema:'GRAVICENTRA_I6_5_B4_003_RENEWALS_CANCELATIONS_DIAGNOSTIC_V1',
   recordedAt:new Date().toISOString(),
   status:'READONLY_DIAGNOSTIC_COMPLETE',
   findingId:'B4-003',
   mode:'READ_ONLY_NO_PRODUCT_OR_DATA_WRITES',
   repository:'paulaosoriof86/orbit360-core',
   branch:'recovery/fase-a-clean-20260831',
   sourceSha:process.env.GITHUB_SHA||'',
   projectId,tenantId,
   runtime:{
     policies:pol.length,
     managements:ges.length,
     cancelations:cans.length,
     businesses:neg.length,
     activeRenewalManagements:activeRen.length,
     duplicateActiveRenewalManagementKeys:dupRenRows,
     activeRecoveryBusinesses:activeRecoveryNeg.length,
     duplicateActiveRecoveryBusinessKeys:dupRecoveryRows
   },
   sourceAudit:{
     assertions,
     optimisticCriticalWriteSites:optimisticFindings,
     effectiveRenewalOwner:{
       base:'orbit360-platform/modules/renovaciones.js',
       operationalBridge:'orbit360-platform/modules/renewals-v1200-operational-bridge.js',
       permissionGuard:'orbit360-platform/modules/renewals-v1200-permission-guard.js',
       issuedFilter:'orbit360-platform/modules/renewals-v1201-issued-filter.js'
     },
     cancelationsOwner:'orbit360-platform/modules/cancelaciones.js'
   },
   blockingFindings:blocking,
   classification:blocking.length?'PRODUCT_LOGIC_DEFECT_DEMONSTRATED':'NO_PRODUCT_DEFECT_DEMONSTRATED',
   causalConclusion:blocking.length
     ?'Renewals are effectively overridden by the operational bridge, but critical renewal/cancelation persistence still contains optimistic store calls whose UI success path does not await server readback. This can report completion before durable persistence and can desynchronize linked recovery records.'
     :'Renewals and cancelations have one effective runtime owner path with awaited canonical persistence and no duplicate active records in the inspected runtime.',
   boundaries:{operationalBusinessWrites:0,configWrites:0,dataMutation:false,reimport:false,livePromotion:false},
   nextAction:blocking.length?'B4_003_CAUSAL_SOURCE_FIX_REQUIRED':'B4_004_SINIESTROS_CRONOGRAMA_DIAGNOSTIC'
 };
 fs.writeFileSync(outPath,JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({status:receipt.status,classification:receipt.classification,blockingFindings:blocking,runtime:receipt.runtime},null,2));
})().catch(e=>{console.error(e&&e.stack||e);process.exit(1);});
