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
 const sourceActivePolicyNumbers=['68542','1-AP-20890','AUTO 38446','AUTO-1000000334','VA-43685','70682','91-0169567','401011234470','10738'];
 const policyNumberKey=v=>String(v==null?'':v).toUpperCase().replace(/[^A-Z0-9]+/g,'');
 const sourceActiveKeys=new Set(sourceActivePolicyNumbers.map(policyNumberKey));
 const renewalSourceProbe=pol
   .filter(p=>sourceActiveKeys.has(policyNumberKey(p.numero)))
   .map(p=>({
     id:p.id,numero:p.numero||'',estado:p.estado||'',vigenciaInicio:p.vigenciaInicio||'',vigenciaFin:p.vigenciaFin||'',
     renovadaPor:p.renovadaPor||'',renuevaDe:p.renuevaDe||'',renovacionEstado:p.renovacionEstado||'',
     renovable:Object.prototype.hasOwnProperty.call(p,'renovable')?p.renovable:null,
     pais:p.pais||'',aseguradoraId:p.aseguradoraId||'',sourceRef:p.sourceRef||p._origenHoja||''
   }))
   .sort((a,b)=>policyNumberKey(a.numero).localeCompare(policyNumberKey(b.numero))||String(a.vigenciaFin).localeCompare(String(b.vigenciaFin)));
 const renewalTargetIds=new Set(renewalSourceProbe.map(x=>x.renovadaPor).filter(Boolean));
 const iso=v=>v&&typeof v.toDate==='function'?v.toDate().toISOString():(v||'');
 const renewalLineageTargets=[];
 for(const p of pol.filter(p=>renewalTargetIds.has(p.id))){
   const deps={};
   for(const c of ['gestiones','recibosEsperados','carteraPrimas','cobros','vehiculos','cancelaciones']){
     const q=await tenant.collection('data').doc(c).collection('items').where('polizaId','==',p.id).get();
     deps[c]=q.size;
   }
   renewalLineageTargets.push({
     id:p.id,numero:p.numero||'',estado:p.estado||'',vigenciaInicio:p.vigenciaInicio||'',vigenciaFin:p.vigenciaFin||'',
     renovadaPor:p.renovadaPor||'',renuevaDe:p.renuevaDe||'',renovacionEstado:p.renovacionEstado||'',
     renovable:Object.prototype.hasOwnProperty.call(p,'renovable')?p.renovable:null,
     pais:p.pais||'',aseguradoraId:p.aseguradoraId||'',sourceRef:p.sourceRef||p._origenHoja||'',
     clienteId:p.clienteId||'',asesorId:p.asesorId||'',previewWrite:p.previewWrite===true,syntheticFlag:p.__syntheticQa===true,
     importado:p.importado===true,createdAt:iso(p.createdAt),updatedAt:iso(p.updatedAt),createdBy:p.createdBy||p.actorUid||p.usuarioId||'',
     dependents:deps,dependentTotal:Object.values(deps).reduce((a,b)=>a+b,0)
   });
 }
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
     duplicateActiveRecoveryBusinessKeys:dupRecoveryRows,
     renewalSourceProbe,
     renewalLineageTargets
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
 
 // R20 business-rejection read-only audit: never infer an issued renewal from a number alone.
 if(process.env.B4_003_RENEWAL_LINEAGE_FOLLOWUP==='true'){
   const {createHash}=require('node:crypto');
   const secureHash=x=>String(x||'')?createHash('sha256').update(String(x)).digest('hex').slice(0,16):'';
   const key=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
   const real=pol.filter(p=>p.__syntheticQa!==true&&p.previewWrite!==true&&!/^b4003qa_/i.test(String(p.id||'')));
   const byId=new Map(real.map(p=>[String(p.id),p]));
   const selected=['70682','91-0169567','401011234470','10738','AUTO-1000000334','AUTO38446'],selectedKeys=new Set(selected.map(key));
   const dateOf=p=>String(p.vigenciaFin||p.fechaFin||p.fechaVencimiento||'');
   const compatible=(p,q)=>!!(p.clienteId&&q.clienteId&&p.aseguradoraId&&q.aseguradoraId&&p.pais&&q.pais&&p.ramo&&q.ramo&&String(p.clienteId)===String(q.clienteId)&&String(p.aseguradoraId)===String(q.aseguradoraId)&&key(p.pais)===key(q.pais)&&key(p.ramo)===key(q.ramo)&&key(p.numero)===key(q.numero));
   const later=(p,q)=>!!(p.vigenciaInicio&&q.vigenciaInicio&&dateOf(p)&&dateOf(q)&&String(q.vigenciaInicio)>String(p.vigenciaInicio)&&dateOf(q)>dateOf(p));
   const sourceDocs=new Map(polSnap.docs.map(d=>[d.id,d]));
   const meta=p=>{const d=sourceDocs.get(p.id),at=v=>v&&typeof v.toDate==='function'?v.toDate().toISOString():String(v||'');return {firestoreCreatedAt:at(d&&d.createTime),recordCreatedAt:at(p.createdAt),origin: String(p.origen||p.sourceType||p.importSource||'').slice(0,80),actorRecorded:!!(p.createdByUid||p.createdBy||p.actorUid||p.usuarioId),actorHash:secureHash(p.createdByUid||p.createdBy||p.actorUid||p.usuarioId),requestIdRecorded:!!p.requestId,importBatchRecorded:!!p.importBatchId};};
   const successor=p=>{
     const forward=p.renovadaPor?byId.get(String(p.renovadaPor)):null,reverse=real.filter(q=>String(q.renuevaDe||'')===String(p.id)&&q.id!==p.id);
     const validated=[...(forward?[forward]:[]),...reverse].filter((q,i,a)=>a.findIndex(y=>y.id===q.id)===i).filter(q=>compatible(p,q)&&later(p,q));
     const sameCommercial=real.filter(q=>q.id!==p.id&&compatible(p,q)&&later(p,q));
     const candidates=sameCommercial.filter(q=>!validated.some(v=>v.id===q.id));
     const status=validated.length===1?'VERIFIED_EXPLICIT_LINK':validated.length>1?'MULTIPLE_LINK_CONFLICT':(p.renovadaPor||reverse.length)?'EXPLICIT_LINK_CONFLICT':candidates.length?'POTENTIAL_UNLINKED_SUCCESSOR_REVIEW_REQUIRED':'NO_SUCCESSOR_EVIDENCE_IN_AUDITED_SCOPE';
     return {resolution:status,validatedSuccessorIds:validated.map(q=>q.id),potentialSuccessorIds:candidates.map(q=>q.id),forwardReference:String(p.renovadaPor||''),reverseReferenceIds:reverse.map(q=>q.id)};
   };
   const cases=real.filter(p=>selectedKeys.has(key(p.numero))).map(p=>({id:p.id,numero:p.numero||'',pais:p.pais||'',aseguradoraId:p.aseguradoraId||'',ramo:p.ramo||'',clientHash:secureHash(p.clienteId),riskHash:secureHash(p.vehiculoId||p.riesgoId),vigenciaInicio:p.vigenciaInicio||'',vigenciaFin:dateOf(p),persistedState:p.estado||'',effectiveVigencia:dateOf(p)?(dateOf(p)<'2026-10-08'?'VENCIDA_CALCULADA':'NO_VENCIDA_CALCULADA'):'FECHA_DESCONOCIDA',renovable:Object.prototype.hasOwnProperty.call(p,'renovable')?p.renovable:null,renovacionEstado:p.renovacionEstado||'',renuevaDe:p.renuevaDe||'',renovadaPor:p.renovadaPor||'',lineage:successor(p),provenance:meta(p)})).sort((a,b)=>key(a.numero).localeCompare(key(b.numero))||a.vigenciaFin.localeCompare(b.vigenciaFin));
   const stateCounts={},expiredStates={};for(const p of real){const state=norm(p.estado||'')||'unknown';stateCounts[state]=(stateCounts[state]||0)+1;if(dateOf(p)&&dateOf(p)<'2026-10-08')expiredStates[state]=(expiredStates[state]||0)+1;}
   const historical=real.filter(p=>dateOf(p)&&dateOf(p)<'2026-10-08'&&['renovada','historica','historico'].includes(norm(p.estado)));
   const histDisposition={total:historical.length,explicitSuccessorVerified:0,unlinkedPotentialSuccessor:0,noSuccessorEvidence:0,conflict:0};
   for(const p of historical){const k=successor(p).resolution;if(k==='VERIFIED_EXPLICIT_LINK')histDisposition.explicitSuccessorVerified++;else if(k==='POTENTIAL_UNLINKED_SUCCESSOR_REVIEW_REQUIRED')histDisposition.unlinkedPotentialSuccessor++;else if(k==='NO_SUCCESSOR_EVIDENCE_IN_AUDITED_SCOPE')histDisposition.noSuccessorEvidence++;else histDisposition.conflict++;}
   const afterAug=real.filter(p=>meta(p).firestoreCreatedAt>='2026-08-01'&&meta(p).firestoreCreatedAt<'2026-10-09');
   receipt.schema='GRAVICENTRA_I6_5_B4_003_R20_LINEAGE_READONLY_AUDIT_V2';
   receipt.status='READONLY_LIFECYCLE_AUDIT_NO_LIVE_WRITE';
   receipt.renewalLineageAudit={asOf:'2026-10-08',realPolicyCount:real.length,syntheticExcluded:pol.length-real.length,selectedCases:cases,missingPolicyNumbers:selected.filter(n=>!cases.some(c=>key(c.numero)===key(n))),stateCounts,expiredStates,historicalExpired:histDisposition,policiesCreatedInFirestoreAfterAug1:afterAug.length,createdAfterAugActorRecorded:afterAug.filter(p=>meta(p).actorRecorded).length,createdAfterAugWithOrigin:afterAug.filter(p=>!!meta(p).origin).length,automaticRenewalFinding:'INCONCLUSIVE',staticSchedulerScope:'The current product-ops-leads cadence scheduler writes business follow-up tasks; recurring insurance import is callable; emission writes polizas only through explicit transition_business operation. No external deployed-trigger or complete actor-event audit performed.',sourceAndPrivacyLimits:'Potential same-number successors are NOT declared renewed. No customer names, actor emails, raw actor UIDs or credentials are emitted.'};
   receipt.classification='LIFECYCLE_BUSINESS_REJECTION_PENDING_SOURCE_RECONCILIATION';
   receipt.nextAction='B4_003_RENEWALS_P0_CAUSAL_FIX_AFTER_CANONICAL_LINEAGE_READBACK';
 }

 fs.writeFileSync(outPath,JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({status:receipt.status,classification:receipt.classification,blockingFindings:blocking,runtime:receipt.runtime},null,2));
})().catch(e=>{console.error(e&&e.stack||e);process.exit(1);});
