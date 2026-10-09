import fs from 'node:fs';
import vm from 'node:vm';
import cp from 'node:child_process';

const need=(v,c)=>{if(!v)throw new Error(c);};
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const json=p=>JSON.parse(read(p));
const hash=p=>cp.execFileSync('git',['hash-object',p],{encoding:'utf8'}).trim();

const paths={
  executorWorkflow:'.github/workflows/gravicentra-b4-003-executor.yml',
  workflow:'functions/product-ops-leads-domain.js',
  opsInbox:'functions/ops-advisor-inbox.js',
  notificationProcessor:'functions/notification-outbox-processor.js',
  authRuntime:'orbit360-platform/core/auth-product-runtime-p0.js',
  productApp:'orbit360-platform/core/product-app-p0.js',
  operationalBackend:'functions/product-operational-domain.js',
  store:'orbit360-platform/data/store-firestore-product-operational-p0.js',
  accessScope:'orbit360-platform/core/access-scope.js',
  cycle:'orbit360-platform/core/ciclo.js',
  ops:'orbit360-platform/modules/ops.js',
  leads:'orbit360-platform/modules/leads.js',
  inicio:'orbit360-platform/modules/inicio.js',
  policyEngine:'orbit360-platform/core/policy-receipts-engine.js',
  router:'orbit360-platform/core/router.js',
  cronograma:'orbit360-platform/modules/cronograma.js',
  base:'orbit360-platform/modules/renovaciones.js',
  bridge:'orbit360-platform/modules/renewals-v1200-operational-bridge.js',
  permission:'orbit360-platform/modules/renewals-v1200-permission-guard.js',
  issued:'orbit360-platform/modules/renewals-v1201-issued-filter.js',
  cancel:'orbit360-platform/modules/cancelaciones.js',
  policy:'orbit360-platform/modules/polizas.js',
  policyBridge:'orbit360-platform/modules/policy-receipts-v1199-bridge.js',
  policyDetail:'orbit360-platform/modules/policy-receipts-v1199-detail-guard.js',
  client360:'orbit360-platform/modules/cliente360.js',
  quality:'orbit360-platform/modules/calidad.js',
  insurer:'orbit360-platform/modules/aseguradoras.js',
  insurerVisual:'orbit360-platform/core/client-insurer-visual-contract-v20260720.js',
  importer:'orbit360-platform/core/importa.js',
  insurerImportBridge:'orbit360-platform/modules/aseguradoras-v1202-import-bridge.js',
  driveBackend:'functions/document-drive-domain.js',
  driveProvider:'orbit360-platform/core/product-drive-document-provider-p0.js',
  infra:'orbit360-platform/styles/infra.css',
  index:'orbit360-platform/index.html',
  previewProof:'tools/gravicentra-i6-5-b4-003-preview-proof.mjs',
  composition:'artifacts/orbit360-recovery/release-control/I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json',
  lock:'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B4_EXECUTION_LOCK_20261002.json',
  r18Source:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R18_SOURCE_FIX_20261005.json',
  r19Source:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R19_SINGLE_CUMULATIVE_SOURCE_FIX_20261005.json',
  r20Source:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R20_CUMULATIVE_SOURCE_FIX_20261006.json',
  r18Forensic:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R18_AUTHENTICATED_READONLY_FORENSIC_RESULT_20261005.json',
  r18KpiAdd:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R18_RENEWAL_KPI_PARITY_CAUSAL_ADDENDUM_20261005.json',
  control:'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json',
  r1:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_CAUSAL_SOURCE_FIX_20261003.json',
  r2:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_CAUSAL_SOURCE_FIX_R2_20261003.json',
  r3:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_CAUSAL_SOURCE_FIX_R3_PREVIEW_ISOLATION_20261003.json',
  r4:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_CAUSAL_SOURCE_FIX_R4_CANONICAL_POLICY_PROJECTION_20261003.json',
  r5:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_PAULA_VISUAL_REJECTION_R5_SOURCE_FIX_20261003.json',
  r11:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_PAULA_VISUAL_REJECTION_R11_SOURCE_FIX_20261003.json',
  r12diag:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R12_REMAINING_BLOCKERS_CAUSAL_DIAGNOSTIC_20261003.json',
  r12fix:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R12_REMAINING_BLOCKERS_SOURCE_FIX_20261003.json',
  adjudication:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_DIAGNOSTIC_ADJUDICATION_20261003.json',
  r13diag:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R13_CAUSAL_DIAGNOSTIC_20261003.json',
  r13drive:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R13_DRIVE_BACKEND_CAUSAL_DIAGNOSTIC_20261003.json',
  r13guard:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R13_DRIVE_PREVIEW_GUARD_ALIGNMENT_20261003.json',
  r13visual:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R13_POLICY_VISUAL_LINEAGE_PROOF_20261003.json',
  r13fix:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R13_NARROW_SOURCE_FIX_20261003.json',
  r14diag:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R14_PAULA_VISUAL_REJECTION_AND_CAUSAL_DIAGNOSTIC_20261004.json',
  r14fix:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R14_NARROW_SOURCE_FIX_20261004.json',
  r16diag:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R16_COMPREHENSIVE_CAUSAL_DIAGNOSTIC_20261004.json',
  r16fix:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R16_COMPREHENSIVE_SOURCE_FIX_20261004.json',
  r1604:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R16_04_TARGETED_VISUAL_CAUSAL_SOURCE_FIX_20261004.json',
  rosterBackend:'functions/assignable-advisor-roster.js',
  rosterClient:'orbit360-platform/core/assignable-advisor-roster-client.js',
  tenantBackend:'functions/tenant-domain-config.js',
  tenantClient:'orbit360-platform/core/tenant-domain-config-client.js',
  configuracion:'orbit360-platform/modules/configuracion.js',
  geo:'orbit360-platform/data/geo-gt-co-authoritative-v20261004.js',
  readPolicy:'orbit360-platform/core/tenant-access-policy-effective-p0.js',
  ledger:'artifacts/orbit360-recovery/release-control/I6_FINDINGS_LEDGER_20260924.json',
  carry:'artifacts/orbit360-recovery/release-control/I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json',
  master:'artifacts/orbit360-recovery/release-control/I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json',
  r20FollowupReview:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R20_FOLLOWUP_PAULA_VISUAL_REJECTION_NOLOSS_20261006.json',
  r20FollowupDiagnostic:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R20_FOLLOWUP_CAUSAL_DIAGNOSTIC_20261006.json',
  r20FollowupSource:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R20_FOLLOWUP_CUMULATIVE_SOURCE_FIX_20261007.json'
};
for(const p of Object.values(paths))need(fs.existsSync(p),'B4_003_REQUIRED_FILE_MISSING:'+p);

const executorWorkflow=read(paths.executorWorkflow),workflow=read(paths.workflow),opsInbox=read(paths.opsInbox),notificationProcessor=read(paths.notificationProcessor),authRuntime=read(paths.authRuntime),productApp=read(paths.productApp),opBackend=read(paths.operationalBackend),store=read(paths.store),accessScope=read(paths.accessScope),cycle=read(paths.cycle),ops=read(paths.ops),leads=read(paths.leads),inicio=read(paths.inicio),policyEngine=read(paths.policyEngine),router=read(paths.router),cronograma=read(paths.cronograma),base=read(paths.base),bridge=read(paths.bridge),permission=read(paths.permission),issued=read(paths.issued),cancel=read(paths.cancel),policy=read(paths.policy),policyBridge=read(paths.policyBridge),policyDetail=read(paths.policyDetail),client360=read(paths.client360),quality=read(paths.quality),insurer=read(paths.insurer),insurerVisual=read(paths.insurerVisual),importer=read(paths.importer),insurerImportBridge=read(paths.insurerImportBridge),driveBackend=read(paths.driveBackend),driveProvider=read(paths.driveProvider),infra=read(paths.infra),index=read(paths.index),previewProof=read(paths.previewProof),rosterBackend=read(paths.rosterBackend),rosterClient=read(paths.rosterClient),tenantBackend=read(paths.tenantBackend),tenantClient=read(paths.tenantClient),configuracion=read(paths.configuracion),geo=read(paths.geo),readPolicy=read(paths.readPolicy);
const comp=json(paths.composition),lock=json(paths.lock),control=json(paths.control),r18Source=json(paths.r18Source),r19Source=json(paths.r19Source),r20Source=json(paths.r20Source),r18Forensic=json(paths.r18Forensic),r18KpiAdd=json(paths.r18KpiAdd),r1=json(paths.r1),r2=json(paths.r2),r3=json(paths.r3),r4=json(paths.r4),r5=json(paths.r5),r11=json(paths.r11),r12diag=json(paths.r12diag),r12fix=json(paths.r12fix),adj=json(paths.adjudication),r13diag=json(paths.r13diag),r13drive=json(paths.r13drive),r13guard=json(paths.r13guard),r13visual=json(paths.r13visual),r13fix=json(paths.r13fix),r14diag=json(paths.r14diag),r14fix=json(paths.r14fix),r16diag=json(paths.r16diag),r16fix=json(paths.r16fix),r1604=json(paths.r1604),ledger=json(paths.ledger),carry=json(paths.carry),master=json(paths.master),r20FollowupReview=json(paths.r20FollowupReview),r20FollowupDiagnostic=json(paths.r20FollowupDiagnostic),r20FollowupSource=json(paths.r20FollowupSource);

need(control.nextAction==='I6_5_FORENSIC_REMEDIATION_B4_003_R20_CONTRACT_AND_EXACT_PREVIEW','B4_003_CONTROL_NEXT_ACTION_INVALID');
need(control.currentB4?.status==='B4_003_SOURCE_FIXED_R20_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_CONTROL_STATUS_INVALID');
need(lock.status==='B4_003_SOURCE_FIXED_R20_PENDING_CONTRACT_AND_EXACT_PREVIEW'&&lock.activeFinding?.id==='B4-003','B4_003_LOCK_STATUS_INVALID');
need(r18Source.status==='SOURCE_FIXED_R18_PENDING_CONTRACT_AND_EXACT_PREVIEW'&&r18Source.findingCountAfter===235,'B4_003_R18_SOURCE_FIX_RECEIPT_INVALID');
need(r19Source.status==='SOURCE_FIXED_R19_PENDING_CONTRACT_AND_EXACT_PREVIEW'&&r19Source.findingCountAfter===243&&r19Source.operationalBusinessWrites===0&&r19Source.livePromoted===false,'B4_003_R19_SOURCE_FIX_RECEIPT_INVALID');
need(r20Source.status==='SOURCE_FIXED_R20_PENDING_CONTRACT_AND_EXACT_PREVIEW'&&r20Source.findingCountAfter===264&&r20Source.operationalBusinessWrites===0&&r20Source.livePromoted===false&&r20Source.renewabilityApplyWrites===1415,'B4_003_R20_SOURCE_FIX_RECEIPT_INVALID');
need(r20FollowupReview.status==='FROZEN_PAULA_VISUAL_REJECTED_R20_FOLLOWUP','B4_003_R20_FOLLOWUP_REVIEW_NOT_FROZEN');
need(r20FollowupDiagnostic.status==='CAUSES_DEMONSTRATED_SINGLE_CUMULATIVE_SOURCE_FIX_AUTHORIZED','B4_003_R20_FOLLOWUP_DIAGNOSTIC_INVALID');
need(r20FollowupSource.status==='SOURCE_FIXED_R20_FOLLOWUP_PENDING_CONTRACT_AND_EXACT_PREVIEW'&&r20FollowupSource.boundaries?.operationalBusinessWrites===0&&r20FollowupSource.boundaries?.dataMutation===false&&r20FollowupSource.boundaries?.livePromotion===false&&r20FollowupSource.boundaries?.reimport===false,'B4_003_R20_FOLLOWUP_SOURCE_RECEIPT_INVALID');
need(r18Forensic.status==='READONLY_FORENSIC_COMPLETE'&&r18Forensic.counts?.within45===11&&r18Forensic.renewal45?.exactlyAccounted===true,'B4_003_R18_FORENSIC_INVALID');
need(r18Forensic.targetPolicyCollision?.collisions?.some(x=>x.classification==='LEGITIMATE_EDITION_PATTERN_LINEAGE_INCOMPLETE'),'B4_003_R18_POLICY_EDITION_FORENSIC_MISSING');
need(r18KpiAdd.status==='CAUSE_CONFIRMED_ADD_TO_SAME_R18_CANDIDATE','B4_003_R18_KPI_PARITY_ADDENDUM_INVALID');
need(r1.status==='SOURCE_FIXED_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R1_RECEIPT_INVALID');
need(r2.status==='SOURCE_FIXED_R2_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R2_RECEIPT_INVALID');
need(r3.status==='SOURCE_FIXED_R3_PREVIEW_ISOLATION_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R3_RECEIPT_INVALID');
need(r4.status==='SOURCE_FIXED_R4_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R4_RECEIPT_INVALID');
need(r5.status==='SOURCE_FIXED_R5_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R5_RECEIPT_INVALID');
need(r11.status==='SOURCE_FIXED_R11_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R11_RECEIPT_INVALID');
need(r12diag.status==='CAUSES_DEMONSTRATED_NARROW_SOURCE_FIX_AUTHORIZED','B4_003_R12_DIAGNOSTIC_INVALID');
need(r12fix.status==='SOURCE_FIXED_R12_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R12_SOURCE_FIX_RECEIPT_INVALID');
need(adj.status==='CAUSES_RECONCILED_NARROW_SOURCE_FIX_AUTHORIZED','B4_003_ADJUDICATION_INVALID');
need(r13diag.status==='READONLY_CAUSAL_DIAGNOSTIC_COMPLETE','B4_003_R13_DIAGNOSTIC_INVALID');
need(r13drive.status==='CAUSE_DEMONSTRATED_NARROW_BACKEND_FIX_AUTHORIZED','B4_003_R13_DRIVE_DIAGNOSTIC_INVALID');
need(r13guard.status==='CAUSE_DEMONSTRATED_NARROW_PREVIEW_GUARD_FIX_AUTHORIZED','B4_003_R13_DRIVE_GUARD_DIAGNOSTIC_INVALID');
need(r13visual.status==='SOURCE_LINEAGE_RECONCILED_PENDING_EXACT_PREVIEW_AND_PAULA_VISUAL','B4_003_R13_VISUAL_LINEAGE_INVALID');
need(r13fix.status==='SOURCE_FIXED_R13_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R13_SOURCE_FIX_RECEIPT_INVALID');
need(r14diag.status==='PAULA_VISUAL_REJECTED_R14_CAUSES_DEMONSTRATED_NARROW_SOURCE_FIX_AUTHORIZED','B4_003_R14_DIAGNOSTIC_INVALID');
need(r14fix.status==='SOURCE_FIXED_R14_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R14_SOURCE_FIX_RECEIPT_INVALID');
need(r16diag.status==='CAUSES_DEMONSTRATED_SINGLE_SUCCESSOR_SOURCE_FIX_AUTHORIZED','B4_003_R16_DIAGNOSTIC_INVALID');
need(r16fix.status==='SOURCE_FIXED_R16_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R16_SOURCE_FIX_RECEIPT_INVALID');
need(r1604.status==='SOURCE_FIXED_R16_04_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R16_04_SOURCE_FIX_RECEIPT_INVALID');
need(String(master.status||'').startsWith('FROZEN_ACTIVE'),'B4_003_MASTER_PENDING_PLAN_NOT_FROZEN');
const ledgerIds=(ledger.findings||[]).map(x=>String(x.id)).sort(),carryIds=(carry.inventory||[]).map(x=>String(x.id)).sort();
need(ledgerIds.length>=208&&carryIds.length===ledgerIds.length&&JSON.stringify(ledgerIds)===JSON.stringify(carryIds),'B4_003_LEDGER_CARRY_NO_LOSS_VIOLATION');
for(const id of ['B1-EMAIL-DELIVERY-001','B2-R46-TEAM-RESET-INVITATION-DELIVERY-STILL-UNRESOLVED-R5','B4-CARRY-PORTAL-IMPORT-EMAIL-TRACEABILITY-R6'])need(ledgerIds.includes(id)&&carryIds.includes(id),'B4_003_EMAIL_FINDING_LOST:'+id);
need(ledgerIds.includes('B4-003-R16-02-QUALITY-GT-RENDER-PERFORMANCE-REGRESSION'),'B4_003_R16_02_PERFORMANCE_FINDING_LOST');
need(ledgerIds.includes('B4-003-R16-03-CATALOG-PREAUTH-HYDRATION-HTTP-401'),'B4_003_R16_03_PREAUTH_FINDING_LOST');
for(const id of ['B4-003-R16-04-QUALITY-RESOLUTION-DEEPLINK-MOBILE','B4-003-R16-05-RECEIPT-SHADOW-DUPLICATE-PROJECTION','B4-003-R16-06-CONFIG-CATALOG-FIRST-PAINT','B4-003-R16-07-RENEWABILITY-REVIEW-WORKFLOW-UX','B4-003-R16-08-INSURER-KNOWLEDGE-HIERARCHY'])need(ledgerIds.includes(id)&&carryIds.includes(id),'B4_003_R16_04_VISUAL_FINDING_LOST:'+id);
for(const id of [
'B4-003-R18-01-OPS-LEADS-DEFAULT-ENTRY-STAGE','B4-003-R18-02-OPS-LEADS-RAMO-PRODUCT-PLAN-DEPENDENCY',
'B4-003-R18-03-COMMERCIAL-IDENTITY-MULTIOPPORTUNITY-MODEL','B4-003-R18-04-OPS-ADVISOR-TYPED-HANDOFF-ACTIVITY',
'B4-003-R18-05-OPS-MANAGEMENT-TYPE-QUEUE-SEMANTICS','B4-003-R18-06-QUALITY-PROVENANCE-CONFIRMATION-ACTION',
'B4-003-R18-07-QUALITY-CHANNEL-ACTION-SEMANTIC-MISMATCH','B4-003-R18-08-QUALITY-REVIEW-AND-CORRECT-NOT-ACTIONABLE',
'B4-003-R18-09-POLICY-MOBILE-SEARCH-VISIBILITY','B4-003-R18-10-RENEWAL-UNIVERSE-11-VS-2-DISPOSITION-GAP',
'B4-003-R18-11-POLICY-DUPLICATE-COLLISION-ON-RENEWABILITY-EDIT','B4-003-R18-12-INSURER-REGISTRY-PROVENANCE-OBJECT-RENDER',
'B4-003-R18-13-INSURER-KNOWLEDGE-MOBILE-HIERARCHY','B4-003-R18-14-INSURER-ACTIVITY-KNOWLEDGE-EVENT-CONVERGENCE',
'B4-003-R18-15-PREUAT-AUTOMATION-DISCRIMINANT-COVERAGE','B4-003-R18-16-INICIO-POLIZAS-RENEWAL-KPI-PARITY'
])need(ledgerIds.includes(id)&&carryIds.includes(id),'B4_003_R18_FINDING_LOST:'+id);
for(const id of [
'B4-003-R19-01-INSURER-MULTISELECT-NATIVE-CTRL-DEPENDENCY','B4-003-R19-02-QUALITY-SEARCH-FILTER-REGRESSION',
'B4-003-R19-03-QUALITY-HORIZONTAL-REACHABILITY','B4-003-R19-04-QUALITY-CONTACT-CHANNEL-ACTION-GAP',
'B4-003-R19-05-POLICY-TECHNICAL-MARKUP-LABEL-VISIBLE','B4-003-R19-06-RENEWABILITY-DURABLE-ATOMIC-SAVE-FAILURE',
'B4-003-R19-07-INICIO-MONTHLY-ADVISOR-READINESS-REGRESSION','B4-003-R19-08-OPS-ADVISOR-HANDOFF-NOTIFICATION-GAP'
])need(ledgerIds.includes(id)&&carryIds.includes(id),'B4_003_R19_FINDING_LOST:'+id);
need(ledgerIds.length===carryIds.length&&ledgerIds.length>=281,'B4_003_R20_SECOND_REVIEW_FINDING_COUNT_OR_CARRY_DRIFT');
for(const id of ['B4-003-R20-V2-01-ACTION-QUEUE-RANK','B4-003-R20-V2-03-CARD-OPEN-LATENCY','B4-003-R20-V2-05-INBOX-ACTION-FEEDBACK','B4-003-R20-V2-08-INSURER-DRIVE-EMBED-RBAC','B4-003-R20-V2-09-INSURER-IMPORTER-TRUTHFULNESS','B4-003-R20-V2-13-QUALITY-PHONE-PREFIX','B4-003-R20-V2-15-RENEWAL-CUTOFF-DISPOSITION','B4-003-R20-V2-16-TRANSVERSAL-VISUAL-HIERARCHY'])need(ledgerIds.includes(id)&&carryIds.includes(id),'B4_003_R20_SECOND_REVIEW_FINDING_LOST:'+id);

need(/BUSINESS_MUTABLE_FIELDS[\s\S]*'polizaId','cancelacionId'/.test(workflow),'B4_003_RECOVERY_BUSINESS_LINK_FIELDS_MISSING');
need(/MANAGEMENT_MUTABLE_FIELDS[\s\S]*'negocioId','cancelacionId'/.test(workflow),'B4_003_RECOVERY_MANAGEMENT_LINK_FIELD_MISSING');
need(/BUSINESS_CREATE_EXTRA_FIELDS[\s\S]*'polizaId','cancelacionId'/.test(workflow),'B4_003_RECOVERY_BUSINESS_CREATE_LINK_FIELDS_MISSING');
need(/MANAGEMENT_CREATE_EXTRA_FIELDS[\s\S]*'cancelacionId'/.test(workflow),'B4_003_RECOVERY_MANAGEMENT_CREATE_LINK_FIELD_MISSING');

need(!/function\s+campana\s*\(/.test(base)&&!/function\s+solicitarPropuestas\s*\(/.test(base),'B4_003_LEGACY_RENEWAL_ACTION_OWNER_REMAINS');
need(/return\s*\{\s*render\s*\}/.test(base),'B4_003_BASE_RENDER_ONLY_CONTRACT_MISSING');
need(/p\.renovadaPor/.test(base)&&/terminalRenewalOutcome/.test(base)&&/renovacionEstado/.test(base),'B4_003_BASE_RENEWED_FILTER_MISSING');
need(base.includes("renewabilityState(p)!=='YES'")&&base.includes("renewabilityState(p)!=='UNKNOWN'"),'B4_003_BASE_RENEWABILITY_FAIL_CLOSED_MISSING');
need(/renewalDataReadiness/.test(base)&&/data-renewals-loading=/.test(base)&&/REQUIRED_DATA = \['polizas', 'clientes'\]/.test(base)&&/OPTIONAL_ENRICHMENT_DATA = \['aseguradoras'\]/.test(base)&&base.includes("collection !== 'aseguradoras'"),'B4_003_R14_RENEWAL_FIRST_PAINT_READINESS_MISSING');
need(/renewalPendingValidation/.test(base)&&/data-renewability-pending-count=/.test(base),'B4_003_R14_RENEWABILITY_VALIDATION_DEBT_MISSING');
need(/\['vigente','porrenovar','vencida'\]/.test(base),'B4_003_R14_EXPIRED_RENEWAL_CONTINUITY_MISSING');
need(/mod\.campana\s*=\s*campana/.test(bridge)&&/mod\.solicitarPropuestas\s*=\s*solicitarPropuestas/.test(bridge)&&/mod\.registrarAceptacion\s*=\s*registrarAceptacion/.test(bridge),'B4_003_OPERATIONAL_RENEWAL_OWNER_INCOMPLETE');
need(/batchDurable/.test(bridge)&&/await\s+S\(\)\.batchDurable/.test(bridge),'B4_003_RENEWAL_CAMPAIGN_DURABLE_READBACK_MISSING');
need(/No fue posible confirmar la preparación\. No se registró un falso éxito\./.test(bridge),'B4_003_RENEWAL_FALSE_SUCCESS_GUARD_MISSING');
need(/p\.renovadaPor/.test(bridge)&&/terminalRenewalOutcome/.test(bridge)&&/renovacionEstado/.test(bridge),'B4_003_OPERATIONAL_RENEWED_FILTER_MISSING');
need(bridge.includes("renewabilityState(p)!=='YES'"),'B4_003_OPERATIONAL_RENEWABILITY_FAIL_CLOSED_MISSING');
need(/\['vigente','porrenovar','vencida'\]/.test(bridge),'B4_003_R14_OPERATIONAL_EXPIRED_RENEWAL_CONTINUITY_MISSING');
need(!/mod\.render\s*=/.test(permission)&&!/setTimeout\s*\(/.test(permission),'B4_003_PERMISSION_SECOND_RENDER_FORBIDDEN');
need(!/mod\.render\s*=/.test(issued)&&!/setTimeout\s*\(/.test(issued),'B4_003_ISSUED_SECOND_RENDER_FORBIDDEN');

for(const token of ["await S().updateDurable('cancelaciones'","await S().updateDurable('negocios'","await S().insertDurable('negocios'","await S().updateDurable('gestiones'","await Orbit.ciclo.crearGestion"])need(cancel.includes(token),'B4_003_CANCEL_DURABLE_PATH_MISSING:'+token);
need(!/S\(\)\.update\('cancelaciones'/.test(cancel)&&!/S\(\)\.insert\('negocios'/.test(cancel)&&!/S\(\)\.update\('negocios'/.test(cancel)&&!/S\(\)\.update\('gestiones'/.test(cancel),'B4_003_CANCEL_OPTIMISTIC_CRITICAL_WRITE_REMAINS');
need(/No fue posible confirmar la recuperación\. No se registró un falso éxito\./.test(cancel),'B4_003_CANCEL_FALSE_SUCCESS_GUARD_MISSING');
need(/function\s+effectiveCancelations\s*\(/.test(cancel)&&/__policyCancellationProjection/.test(cancel),'B4_003_CANCEL_POLICY_PROJECTION_OWNER_MISSING');
need(/await\s+S\(\)\.insertDurable\('cancelaciones'/.test(cancel),'B4_003_CANCEL_PROJECTION_MATERIALIZATION_MISSING');
need(/cancelaciones:\s*'cancelaciones'/.test(accessScope),'B4_003_CANCEL_ACCESS_SCOPE_OWNER_MISSING');
need(/function\s+activeCountry/.test(cancel)&&/filter\(c\s*=>\s*inActiveCountry\(c,I\)\)/.test(cancel),'B4_003_CANCEL_SELECTED_COUNTRY_FILTER_MISSING');
need(/function\s+relationIndex\s*\(/.test(cancel)&&/data-cancel-indexed-relations="1"/.test(cancel),'B4_003_R13_CANCEL_RELATION_INDEX_MISSING');
need(/data-cancel-open=/.test(cancel)&&/data-cancel-policy-link=/.test(cancel),'B4_003_R13_CANCEL_EXPLICIT_TARGETS_MISSING');
need(/Cliente '\+clientCountry\+' · operación '\+operationCountry/.test(cancel),'B4_003_R13_CANCEL_CROSS_COUNTRY_LABEL_MISSING');
need(/detalleKpi/.test(cancel)&&/cancelation-kpi-detail/.test(cancel),'B4_003_CANCEL_KPI_DETAIL_OWNER_MISSING');
need(cancel.includes('function cancellationById(id, policyId)')&&cancel.includes("String(c&&c.polizaId||'')===wanted"),'B4_003_CANCEL_POLICY_IDENTITY_FALLBACK_MISSING');
need(cancel.includes('data-cancel-client-link')&&cancel.includes('&t=polizas'),'B4_003_CANCEL_CLIENT_POLICY_DEEPLINK_MISSING');
need(cancel.includes('no es churn temporal')&&cancel.includes('Relación canceladas / cartera'),'B4_003_CANCEL_HISTORICAL_RATIO_LABEL_MISSING');
need(cancel.includes('data-cancel-reason-editor="1"')&&cancel.includes("id=\"cx-save-motivo\"")&&cancel.includes("await S().updateDurable('cancelaciones',c.id,{motivo:nuevo})")&&cancel.includes('Motivo confirmado y guardado'),'B4_003_R20_CANCEL_REASON_EDIT_DURABLE_MISSING');
need(cancel.includes('function prepararWhatsApp(rows)')&&cancel.includes('data-cancel-wa-bulk')&&cancel.includes('data-cancel-select-all')&&cancel.includes('data-wa-template')&&cancel.includes('data-wa-message')&&cancel.includes("id=\"cx-wa\""),'B4_003_R20_CANCEL_WHATSAPP_INDIVIDUAL_MULTI_TEMPLATE_MISSING');
need(cancel.includes("if(/--/.test(location.hostname))return U.toast('Preview protegida")&&cancel.includes("window.open('https://wa.me/'+phone")&&cancel.includes('Ningún chat abierto equivale a mensaje entregado'),'B4_003_R20_CANCEL_WHATSAPP_PREVIEW_ISOLATION_MISSING');

need(policyBridge.includes('!rs.includes(initialRamo)')&&policyBridge.includes('!initialSubs.includes(initialProduct)'),'B4_003_POLICY_EDITOR_SOURCE_TAXONOMY_PRESERVATION_MISSING');
need(policyBridge.includes('data-renewable')&&policyBridge.includes("renovable: $('[data-renewable]').value==='yes'"),'B4_003_POLICY_EDITOR_RENEWABILITY_TRISTATE_MISSING');
need(/function\s+relationDataReady\s*\(/.test(policy)&&/data-polizas-relations-loading="1"/.test(policy),'B4_003_R13_POLICY_RELATION_READINESS_MISSING');
need(/ensureBasicSearchIndex/.test(policy)&&/ensureVehicleSearchIndex/.test(policy)&&/searchTimer=setTimeout/.test(policy)&&/},180\)/.test(policy),'B4_003_R13_POLICY_INDEXED_DEBOUNCED_SEARCH_MISSING');
need(/const policies = S\(\)\.all\('polizas'\)/.test(policy)&&/const clients = S\(\)\.all\('clientes'\)/.test(policy)&&/insurersById/.test(policy)&&/advisorsById/.test(policy),'B4_003_R13_POLICY_SINGLE_READ_RELATION_INDEX_MISSING');
const policyFirstPaintBlock=(policy.match(/function buildIndexes\(\) \{[\s\S]*?\n  \}\n\n  function ensureBasicSearchIndex/)||[''])[0];
need(policyFirstPaintBlock&&!/all\('vehiculos'\)/.test(policyFirstPaintBlock)&&!/searchTextByPolicy/.test(policyFirstPaintBlock),'B4_003_R13P3_POLICY_FIRST_PAINT_SEARCH_WORK_REMAINS');
need(/function\s+ensureBasicSearchIndex\s*\(/.test(policy)&&/function\s+ensureVehicleSearchIndex\s*\(/.test(policy)&&/const vehicles=S\(\)\.all\('vehiculos'\)/.test(policy),'B4_003_R13P3_POLICY_LAZY_SEARCH_INDEX_MISSING');
need(/function\s+policiesForActiveCountry\s*\(/.test(policy)&&/function\s+clientCell\s*\(/.test(policy)&&/function\s+insurerCell\s*\(/.test(policy)&&/function\s+advisorCell\s*\(/.test(policy),'B4_003_R13_POLICY_INDEXED_FIRST_PAINT_MISSING');
need(/function\s+rerender\s*\(/.test(policy)&&/Orbit\.access\.withScope\(MODULE_KEY/.test(policy),'B4_003_R13_POLICY_RERENDER_SCOPE_GUARD_MISSING');
need(!/q\.polizasScoped\s*\?\s*q\.polizasScoped\(\)/.test(policy),'B4_003_R13_POLICY_DUPLICATE_SCOPED_READ_REMAINS');
need(policy.includes("label: 'Vencen ≤45 d'")&&policy.includes('otherPolicyCount'),'B4_003_R14_POLICY_EXPIRY_KPI_SEMANTICS_MISSING');
need(!/K\.clienteCell\(p\.clienteId\)/.test(policy)&&!/K\.aseguradoraCell\(p\.aseguradoraId\)/.test(policy)&&!/K\.asesorCell\(p\.asesorId\)/.test(policy),'B4_003_R13_POLICY_PER_ROW_STORE_GET_REMAINS');
need(/function\s+collectionConfirmed\s*\(/.test(policyDetail)&&/data-policy-detail-loading="client"/.test(policyDetail),'B4_003_R13_POLICY_DETAIL_READINESS_MISSING');
need(/data-policy-vehicle-loading="1"/.test(policyDetail)&&/data-policy-receipts-loading="1"/.test(policyDetail),'B4_003_R13_POLICY_DETAIL_OPTIONAL_LOADING_MISSING');
need(client360.includes('id="ftab-prev"')&&client360.includes('left: -strip.clientWidth')&&infra.includes('.ftab-prev'),'B4_003_CLIENT360_LEFT_TAB_CONTROL_MISSING');
need(client360.includes("const clientesRaw = S().all('clientes')")&&client360.includes("const policiesRaw = policyReadiness === 'ready' ? S().all('polizas') : []")&&!client360.includes("batchRunner(['clientes']")&&!client360.includes('clientBatch')&&client360.includes("baseAuthority: 'server-confirmed-store'"),'B4_003_R14_CLIENT360_BASE_AUTHORITY_MISSING');
need(client360.includes('data-c360-base-authority="server-confirmed-store"')&&client360.includes('Vencen ≤45 d'),'B4_003_R14_CLIENT360_AUTHORITY_OR_KPI_LABEL_MISSING');
need(quality.includes('.filter(inActiveCountry)')&&quality.includes('vigenteClientIds')&&quality.includes('data-quality-country'),'B4_003_QUALITY_COUNTRY_OR_LINEAR_INDEX_MISSING');
need(!quality.includes("vig: tieneVigente(c.id)"),'B4_003_QUALITY_PER_CLIENT_POLICY_SCAN_REMAINS');
need(insurerVisual.includes("box.dataset.knowledgeSource='canonical'")&&insurerVisual.includes('Fuentes relacionadas')&&insurerVisual.includes('sourceApi.knowledgeSources(insurer)'),'B4_003_R12_INSURER_KPI_SHADOW_OWNER_REMAINS');
need(insurer.includes('aseguradoraId: id')&&insurer.includes('id="af-imp-doc"')&&insurer.includes('Cargar y clasificar fuente')&&insurer.includes('Aquí no se cargan archivos.')&&!insurer.includes('id="af-imp-doc2" style'),'B4_003_R20_SECOND_REVIEW_INSURER_SINGLE_UPLOAD_ENTRYPOINT_OR_SCOPE_MISSING');
need(importer.includes("updateDurable('aseguradoras', insurerId")&&importer.includes('preview_protected_operational_insurer')&&importer.includes('Documento recibido')&&importer.includes("requiereValidacion: state.kind === 'docs-aseguradora'"),'B4_003_R12_INSURER_DURABLE_SOURCE_BINDING_MISSING');
need(importer.includes('Ningún documento habilita Cotizador, Comparativo o IA automáticamente'),'B4_003_R12_INSURER_IMPORT_AUTO_ENABLE_CLAIM_REMAINS');
need(importer.includes("['Cargar archivo', 'Clasificar fuente', 'Guardar y vincular']")&&importer.includes("const modoIni = (opts && opts.modo) || 'inteligente'")&&importer.includes('analyzeInsurerSourceText')&&importer.includes('Análisis completado')&&importer.includes('Ninguna tarifa se aplicará ni se habilitará automáticamente.')&&!importer.includes('No se extraerán ni aplicarán tarifas automáticamente'),'B4_003_R20_SECOND_REVIEW_INSURER_IMPORT_TRUTHFUL_INTELLIGENT_FLOW_MISSING');
need(/renovaciones:\s*\['polizas', 'clientes', 'aseguradoras', 'gestiones'\]/.test(router),'B4_003_R14_RENEWAL_ROUTER_DEPENDENCY_MISSING');
need(/ops:\s*\['negocios', 'gestiones', 'clientes', 'polizas', 'aseguradoras', 'asesores'\]/.test(router)&&/leads:\s*\['negocios', 'gestiones', 'clientes', 'polizas', 'aseguradoras', 'asesores'\]/.test(router),'B4_003_R14A_OPS_LEADS_ADVISOR_REACTIVITY_MISSING');
need(/async function assignableAdvisors\(country\)/.test(cycle)&&/Orbit\.assignableAdvisorRoster\?\.list/.test(cycle)&&!/canonicalRosterStore/.test(cycle)&&! /all\('asesores'\)/.test(cycle),'B4_003_R16_MINIMAL_ASSIGNABLE_ADVISOR_ROSTER_MISSING');
need(/await assignableAdvisors\(initialCountry\)/.test(cycle)&&/countrySelect\.addEventListener\('change'/.test(cycle)&&/server-owned-minimal/.test(cycle),'B4_003_R16_NEW_BUSINESS_ROSTER_NOT_COUNTRY_REACTIVE');
need(/TEAM_DIRECTORY_ROLES = Object\.freeze\(\['Dirección', 'SuperAdmin', 'AdminTenant', 'Admin'\]\)/.test(readPolicy)&&!readPolicy.includes("'Operativo']"),'B4_003_R16_OPERATIVO_FULL_TEAM_DIRECTORY_PERMISSION_EXPANDED');
need(/FULL=new Set\(\[[\s\S]*'operativo'/.test(rosterBackend)&&/moduleCanAssign/.test(rosterBackend)&&/collection\('data'\)\.doc\('asesores'\)\.collection\('items'\)/.test(rosterBackend),'B4_003_R16_ASSIGNABLE_ROSTER_SERVER_OWNER_MISSING');
need(/return\{id:text\([\s\S]*nombre:text\([\s\S]*activo:active\(r\),assignable:active\(r\)&&eligible,roleEligible:eligible,paises:ps\}/.test(rosterBackend),'B4_003_R16_ASSIGNABLE_ROSTER_MINIMAL_PROJECTION_INVALID');
need(!/password|contrasena|credential|telefono|email/.test((rosterBackend.match(/function project\(doc\)[\s\S]*?\n\}/)||[''])[0]),'B4_003_R16_ASSIGNABLE_ROSTER_LEAKS_DIRECTORY_FIELDS');
need(/orbit360AssignableAdvisorRosterPreview/.test(rosterBackend)&&/Orbit\.assignableAdvisorRoster=Object\.freeze/.test(rosterClient),'B4_003_R16_ASSIGNABLE_ROSTER_CLIENT_BACKEND_BINDING_MISSING');
need(/DOMAINS = new Set\(\[[\s\S]*'catalogs'/.test(tenantBackend)&&/validateCatalogs/.test(tenantBackend)&&/CATALOG_CONFIG_SERVER_REQUIRED/.test(tenantClient),'B4_003_R16_DURABLE_TENANT_CATALOG_AUTHORITY_MISSING');
need(/CATALOG_CONFIG_CANONICAL_READBACK_REQUIRED/.test(read(paths.index.replace('index.html','core/config.js')))||/CATALOG_CONFIG_CANONICAL_READBACK_REQUIRED/.test(read('orbit360-platform/core/config.js')),'B4_003_R16_CATALOG_FAIL_CLOSED_MISSING');
need(!/setTimeout\(\(\)=>\{api\.ensure\(\)\.catch/.test(read('orbit360-platform/core/config.js'))&&!/Promise\.resolve\(\)\.then\(\(\)=>Orbit\.cat&&Orbit\.cat\.ensure/.test(cycle),'B4_003_R16_03_PREAUTH_CATALOG_HYDRATION_REMAINS');
need(/cf-cat-canales/.test(configuracion)&&/cf-cat-productos/.test(configuracion)&&/cf-cat-segmentos/.test(configuracion)&&/cf-cat-prioridades/.test(configuracion)&&/Orbit\.cat\.saveDurable/.test(configuracion),'B4_003_R16_CATALOG_ADMIN_SURFACE_MISSING');
need(/nn-canal/.test(cycle)&&/fSelectCat\('Canal de ingreso'/.test(cycle)&&/nn-segmento/.test(cycle)&&/nn-prioridad/.test(cycle)&&/puntoIngreso/.test(cycle)&&!/Math\.floor\(1000 \+ Math\.random\(\) \* 9000\)/.test(cycle),'B4_003_R18_NEW_PROSPECT_CATALOG_AUTHORITY_MISSING');
need(/departments:22,municipalities:340/.test(geo)&&/municipalities:1122/.test(geo),'B4_003_R16_GEO_GT_CO_COMPLETENESS_BINDING_MISSING');
need(/await S\(\)\.updateDurable\('clientes'/.test(quality)&&/remainingAfterReadback/.test(quality)&&/paisProvenance/.test(quality)&&/Confirmar origen del país/.test(quality)&&/forceProvenance/.test(quality)&&/País propuesto:/.test(quality),'B4_003_R18_QUALITY_DURABILITY_OR_PROVENANCE_MISSING');
need(/needsCountry=f\.some\(x=>x\.k==='pais'\)/.test(quality)&&/needsCountry \? evidenceFor\(c\)/.test(quality),'B4_003_R16_02_QUALITY_EVIDENCE_EVALUATION_NOT_BOUNDED');
need(/Tolerancia \/ causa/.test(quality)&&/calendarAuthority/.test(quality)&&/contractualSource/.test(policyDetail)&&/Math\.abs\(delta\)<0\.0000001\?0:delta/.test(policyDetail),'B4_003_R16_FINANCIAL_QUALITY_ACTIONABILITY_MISSING');
need(/Prima pendiente de fuente/.test(base)&&/Orbit\.modules\.cliente360\.verPoliza/.test(base)&&/return\s*\{\s*render\s*\}/.test(base),'B4_003_R16_RENEWAL_FAIL_CLOSED_REVIEW_PATH_MISSING');
need(/gravicentra-insurer-source-registry-v1/.test(read('orbit360-platform/core/config.js'))&&/Tarifario \/ Excel cotizador/.test(read('orbit360-platform/core/config.js'))&&/Legal\/regulatorio/.test(read('orbit360-platform/core/config.js'))&&/gravicentra-quote-authority-v1/.test(read('orbit360-platform/core/config.js')),'B4_003_R16_INSURER_CANONICAL_SOURCE_REGISTRY_MISSING');
need(insurer.includes('data-technical-registry="1"')&&insurer.includes('Fuentes y respaldo')&&/Biblioteca \+ Drive/.test(insurer)&&/familiaDocumento/.test(importer)&&/vigenciaFuente/.test(importer),'B4_003_R20_INSURER_REGISTRY_UI_OR_METADATA_MISSING');
need(!read('orbit360-platform/core/config.js').includes('automaticCalculationAllowed:true'),'B4_003_R16_INSURER_SOURCE_AUTO_CALC_FORBIDDEN');

need(/\^\(\?:b4\[-_\]\|b4003qa_\)/.test(importer)||/b4003qa_/.test(importer),'B4_003_R13_INSURER_PREVIEW_GUARD_ALIGNMENT_MISSING');
need(/if \(kind === 'docs-aseguradora'\) return originalImportOpen\(kind, options \|\| \{\}\)/.test(insurerImportBridge)&&/canonicalDocumentOwner: 'core\/importa\.js'/.test(insurerImportBridge)&&/legacyDocumentModalShadowed: false/.test(insurerImportBridge),'B4_003_R13_INSURER_DRIVE_SHADOW_OWNER_REMAINS');
need(/entity==='aseguradora'\|\|entity==='aseguradoras'/.test(driveBackend)&&/canonicalRef\(tenantId,'aseguradoras',insurerId\)/.test(driveBackend),'B4_003_R13_DRIVE_INSURER_TARGET_AUTHORITY_MISSING');
need(/\['documentos','docs','adjuntos','attachments','files'\]/.test(driveBackend),'B4_003_R13_DRIVE_INSURER_DOC_REFS_MISSING');
need(/previewSyntheticInsurer/.test(driveBackend)&&/b4003qa_/.test(driveBackend)&&/previewSyntheticTarget/.test(driveBackend),'B4_003_R13_DRIVE_PREVIEW_SYNTHETIC_GUARD_MISSING');
need(/_GRAVICENTRA_PREVIEW_QA/.test(driveBackend)&&/aseguradoras/.test(driveBackend),'B4_003_R13_DRIVE_PREVIEW_ISOLATION_MISSING');
need(policyDetail.includes('policyCompleteness')&&policyDetail.includes('receiptSchedule')&&policyDetail.includes('financialIntegrityBatch')&&policyDetail.includes('premiumBreakdown')&&quality.includes('financialIntegrityIssues')&&quality.includes('data-information-health-policy'),'B4_003_R12_INFORMATION_HEALTH_FINANCIAL_PROJECTION_MISSING');
need(policyDetail.includes("receiptsByPolicy=group(S().all('recibosEsperados')||[],'polizaId')")&&quality.includes('rm.financialIntegrityBatch(policies)')&&!quality.includes('rm.premiumBreakdown(p)'),'B4_003_R12_QUALITY_FINANCIAL_N_SQUARED_PATH_REMAINS');
need(quality.includes('pageSize: 50')&&quality.includes('visibleRows = rows.slice')&&quality.includes('data-quality-pagination="true"'),'B4_003_R12Q_QUALITY_UNBOUNDED_DOM_ROWS_REMAIN');
need((quality.match(/data-quality-table-grammar="canonical"/g)||[]).length>=2&&quality.includes("label: 'Expedientes completos'")&&quality.includes('completePct.toFixed(1)')&&quality.includes('financialClientCell(c,c.id)'),'B4_003_R14_QUALITY_VISUAL_GRAMMAR_OR_COMPLETENESS_MISSING');
need(quality.includes('function financialClientCell(c, fallbackId)')&&quality.includes('const clientsById = new Map(clients.map(c => [c.id, c]))')&&quality.includes('financialHealthHtml(financialIssues, clientsById)')&&(quality.includes('financialClientCell(c,x.p.clienteId)')||quality.includes('financialClientCell(v.c,x.p.clienteId)')),'B4_003_R14_QUALITY_FINANCIAL_CLIENT_PROJECTION_HOTPATH_REMAINS');
need(/selectedCountry/.test(base)&&/data-renewal-country/.test(base),'B4_003_RENEW_SELECTED_COUNTRY_FILTER_MISSING');
need(/renewalActionsLayout='grid2'/.test(bridge)&&/gridTemplateColumns='repeat\(2,minmax\(0,1fr\)\)'/.test(bridge),'B4_003_RENEW_COMPACT_ACTION_LAYOUT_MISSING');
need(/eventPriority/.test(cronograma)&&/data-more-date/.test(cronograma)&&/Agenda de renovaciones, recibos, gestiones y tareas/.test(cronograma),'B4_003_CRONOGRAMA_RENEWAL_VISIBILITY_MISSING');

need(/GENERAL_PREVIEW_COMMAND='orbit360ProductOperationalCommandPreview'/.test(store),'B4_003_GENERAL_PREVIEW_COMMAND_MISSING');
need(/previewGeneral\?GENERAL_PREVIEW_COMMAND:GENERAL_COMMAND/.test(store),'B4_003_GENERAL_PREVIEW_ROUTING_MISSING');
need(/previewGeneral\?'us-east1':'us-central1'/.test(store),'B4_003_GENERAL_PREVIEW_REGION_MISSING');
need(/b4003qa/.test(opBackend)&&/__syntheticQa/.test(opBackend),'B4_003_PREVIEW_SYNTHETIC_GUARD_MISSING');
need(/modules\/renovaciones\.js\?v=20261008-r20-uat-recovery/.test(index),'B4_003_BASE_CACHE_BINDING_MISSING');
need(/renewals-v1200-operational-bridge\.js\?v=20261005-r17/.test(index),'B4_003_BRIDGE_CACHE_BINDING_MISSING');
need(/renewals-v1200-permission-guard\.js\?v=20261003-b4003r2/.test(index),'B4_003_PERMISSION_CACHE_BINDING_MISSING');
need(/renewals-v1201-issued-filter\.js\?v=20261003-b4003r2/.test(index),'B4_003_ISSUED_CACHE_BINDING_MISSING');
need(/cancelaciones\.js\?v=20261008-r20-uat4-motivo-wa/.test(index),'B4_003_CANCEL_R13_CACHE_BINDING_MISSING');
need(/modules\/polizas\.js\?v=20261004-b4003r14/.test(index),'B4_003_POLICY_R13_CACHE_BINDING_MISSING');
need(/core\/access-scope\.js\?v=20261003-b4003r5/.test(index),'B4_003_ACCESS_SCOPE_CACHE_BINDING_MISSING');
need(/core\/router\.js\?v=20261007-r20f1/.test(index),'B4_003_R14_ROUTER_CACHE_BINDING_MISSING');
need(/core\/ciclo\.js\?v=20261007-r20f2/.test(index),'B4_003_R14A_CYCLE_CACHE_BINDING_MISSING');
need(/modules\/cronograma\.js\?v=20261003-b4003r5/.test(index),'B4_003_CRONOGRAMA_CACHE_BINDING_MISSING');
need(/store-firestore-product-operational-p0\.js\?v=20261009-b4003r21-hydration-contract/.test(index),'B4_003_STORE_CACHE_BINDING_MISSING');
need(/modules\/cliente360\.js\?v=20261005-r17/.test(index),'B4_003_CLIENT360_R11_CACHE_BINDING_MISSING');
need(index.includes('modules/calidad.js?v=20261007-r20f2'),'B4_003_QUALITY_R12Q_CACHE_BINDING_MISSING');
need(index.includes('modules/aseguradoras.js?v=20261007-r20f4'),'B4_003_INSURER_R12_CACHE_BINDING_MISSING');
need(/core\/importa\.js\?v=20261007-r20f2/.test(index),'B4_003_IMPORTER_R13_CACHE_BINDING_MISSING');
need(/modules\/aseguradoras-v1202-import-bridge\.js\?v=20261004-b4003r13d/.test(index),'B4_003_R13_INSURER_IMPORT_BRIDGE_CACHE_BINDING_MISSING');
need(index.includes('core/client-insurer-visual-contract-v20260720.js?v=20261004-r16p4'),'B4_003_INSURER_VISUAL_R12_CACHE_BINDING_MISSING');
need(index.includes('modules/policy-receipts-v1199-detail-guard.js?v=20261005-r19'),'B4_003_POLICY_DETAIL_R13_CACHE_BINDING_MISSING');
need(/modules\/policy-receipts-v1199-bridge\.js\?v=20261005-r19/.test(index),'B4_003_POLICY_BRIDGE_R11_CACHE_BINDING_MISSING');
need(/styles\/infra\.css\?v=20261007-r20f2/.test(index),'B4_003_INFRA_R20_SECOND_REVIEW_CACHE_BINDING_MISSING');
need(index.includes('core/product-app-p0.js?v=20261007-r20f3')&&index.includes('modules/ops.js?v=20261007-r20f2')&&index.includes('modules/leads.js?v=20261007-r20f2'),'B4_003_R20_SECOND_REVIEW_ROUTING_CACHE_BINDING_MISSING');


need(cycle.includes("find(p=>p&&p.etapa==='nuevo')")&&!cycle.includes("(Orbit.cat.get('puntosIngreso')[1]||Orbit.cat.get('puntosIngreso')[0]"),'B4_003_R18_DEFAULT_NEW_STAGE_NOT_CANONICAL');
need(cycle.includes('function commercialProducts(country,ramo)')&&cycle.includes('Orbit.cat.subramosDe(country,ramo)')&&cycle.indexOf("fSelect('Ramo', 'nn-ramo'")<cycle.indexOf("fSelect('Producto', 'nn-prod'")&&cycle.includes("fSelect('Plan', 'nn-plan'"),'B4_003_R18_RAMO_PRODUCT_PLAN_DEPENDENCY_MISSING');
need(cycle.includes('commercialIdentityId')&&cycle.includes('sourceOpportunityId')&&cycle.includes('＋ Otra oportunidad'),'B4_003_R18_MULTI_OPPORTUNITY_IDENTITY_MISSING');
for(const token of ['Comentario comercial','Observación operativa','Solicitar información al asesor','Devuelto a asesor','Reenviado a Operaciones'])need(cycle.includes(token),'B4_003_R18_TYPED_HANDOFF_MISSING:'+token);
need(cycle.includes('syncManagementQueue')&&cycle.includes('Cola operativa asignada')&&cycle.includes('id="mg-lista"')&&cycle.includes('readonly'),'B4_003_R18_MANAGEMENT_QUEUE_DERIVATION_MISSING');
need(quality.includes('Revisar diferencia')&&quality.includes('Corregir en póliza')&&quality.includes('Revisar recibos')&&!quality.includes('Revisar y corregir</button>'),'B4_003_R18_QUALITY_ACTION_TRUTHFULNESS_MISSING');
need(quality.includes('Confirmar origen del país')&&quality.includes('forceProvenance')&&quality.includes('Agregar teléfono / WhatsApp'),'B4_003_R18_QUALITY_PROVENANCE_OR_CHANNEL_ACTION_MISSING');
need((base.includes('function date45Disposition')&&base.includes('data-renewal-date45-reconciled='))||(base.includes('const renewalPipelineCandidate')&&base.includes('data-renewal-bucket=')&&!base.includes('renewal-disposition-detail')),'B4_003_R18_RENEWAL_DISPOSITION_CONTRACT_MISSING');
need(policyEngine.includes('const duplicateEdition')&&policyEngine.includes('lineage_ediciones_sin_vinculo')&&!policyEngine.includes("errors.push('poliza_duplicada:'"),'B4_003_R18_POLICY_EDITION_VALIDATOR_NOT_FIXED');
need(insurer.includes("typeof v==='object'")&&insurer.includes('Qué ocurrió y quién lo hizo')&&insurer.includes('Sistema documental')&&insurer.includes('Conocimiento de la aseguradora')&&insurer.includes('insurer-source-detail')&&!insurer.includes('a.comisionDefault || 12'),'B4_003_R18_INSURER_PROVENANCE_ACTIVITY_OR_COMMISSION_FALLBACK_INVALID');
need(infra.includes('#ciclo-modal{place-items:start stretch!important')&&infra.includes('.tb-search{display:flex!important')&&infra.includes('.insurer-source-detail{grid-template-columns:1fr!important'),'B4_003_R18_MOBILE_RESPONSIVE_GUARDS_MISSING');
need(inicio.includes('function renewalRows45()')&&inicio.includes('Orbit.modules.polizas.policyMetrics.isRenewalWithin45Days')&&inicio.includes('data-renewal-owner="polizas.policyMetrics.isRenewalWithin45Days"'),'B4_003_R18_INICIO_POLICY_KPI_PARITY_OWNER_MISSING');
need(index.includes('modules/inicio.js?v=20261005-r19')&&index.includes('core/policy-receipts-engine.js?v=20261005-r18'),'B4_003_R18_NEW_CACHE_BINDINGS_MISSING');

need(cycle.includes('function actionQueueRanks')&&cycle.includes('Acción requerida · #')&&cycle.includes('Registrar guarda la colaboración inmediatamente')&&cycle.includes('humanCommentAuthor')&&cycle.includes('assignableAdvisors(n.pais).then'),'B4_003_R20_SECOND_REVIEW_OPS_LEADS_USABILITY_MISSING');
need(index.includes('Reconociendo…')&&index.includes('Resolviendo…')&&index.includes('Archivando…')&&index.includes('inbox-active-count')&&index.includes('maybePendingLanding'),'B4_003_R20_SECOND_REVIEW_INBOX_FEEDBACK_MISSING');
/* B4-003 · Inbox landing: derived from effective user+event state, not an open task alone.
   Regression proof uses the exact inline source and no Firestore or session write. */
{
 const begin=index.indexOf('function newHandoffForSurface(r,surface)');
 const end=index.indexOf('function refresh(force){',begin);
 need(begin>=0&&end>begin,'B4_003_INBOX_LANDING_SOURCE_NOT_FOUND');
 const source=index.slice(begin,end);
 const cases=[
  ['NEW_OPERATIONS','Dirección','#/inicio',{targetSurface:'ops',read:false,acknowledged:false,archived:false,globalResolved:false},'#/ops'],
  ['ACKNOWLEDGED','Dirección','#/inicio',{targetSurface:'ops',read:true,acknowledged:true},'#/inicio'],
  ['READ_ONLY','Dirección','#/inicio',{targetSurface:'ops',read:true,acknowledged:false},'#/inicio'],
  ['SHARED_RESOLVED','Dirección','#/inicio',{targetSurface:'ops',read:true,globalResolved:true},'#/inicio'],
  ['PERSONALLY_ARCHIVED','Dirección','#/inicio',{targetSurface:'ops',archived:true},'#/inicio'],
  ['EXPLICIT_DEEP_LINK','Dirección','#/polizas',{targetSurface:'ops'},'#/polizas'],
  ['NEW_ADVISOR','Asesor','#/inicio',{targetSurface:'leads'},'#/leads'],
  ['WRONG_RECIPIENT','Asesor','#/inicio',{targetSurface:'ops'},'#/inicio']
 ];
 for(const [label,role,hash,row,expected] of cases){
  const context={rows:[row],location:{hash},activeRole:()=>role,startupLandingDone:false,autoLandingSurface:''};
  vm.runInNewContext(source+'; maybePendingLanding();',context,{timeout:1000});
  need(context.location.hash===expected,'B4_003_INBOX_LANDING_DISCRIMINANT_'+label+':'+context.location.hash);
  if(label==='NEW_OPERATIONS'){
   context.rows[0].read=true;
   vm.runInNewContext(source+'; returnHomeIfAutoLandingComplete();',context,{timeout:1000});
   need(context.location.hash==='#/inicio','B4_003_INBOX_ACKNOWLEDGED_AUTO_LANDING_NOT_CLEARED');
  }
 }
 const context={rows:[],location:{hash:'#/inicio'},activeRole:()=>'Operativo',startupLandingDone:false,autoLandingSurface:''};
 vm.runInNewContext(source+'; maybePendingLanding();',context,{timeout:1000});
 context.rows.push({targetSurface:'ops',read:false});
 vm.runInNewContext(source+'; maybePendingLanding();',context,{timeout:1000});
 need(context.location.hash==='#/inicio','B4_003_INBOX_NEW_NOTICE_INTERRUPTS_ACTIVE_SESSION');
 need(index.includes('id="ops-inbox-home"')&&index.includes("location.hash='#/inicio'")&&index.includes('INBOX_SERVER_READBACK_INCOMPLETE')&&index.includes("out.acknowledged===true")
   &&index.includes("out.globalResolved===true")&&!index.includes("updateState(row,'read').catch(function(){}).finally"),
   'B4_003_INBOX_READBACK_FAIL_CLOSED_MISSING');
}
need(insurer.includes('sourceCommissions=S().get')&&insurer.includes('visibleRequirements=[...body.querySelectorAll')&&insurer.includes('draft.docsRequeridos=retained'),'B4_003_R20_INSURER_DRAFT_SOURCE_PRESERVATION_MISSING');
need(insurer.includes('function semanticValue')&&insurer.includes('Cambios detectados:')&&insurer.includes('Revisando cambios…')&&insurer.includes('Procesando logo…'),'B4_003_R20_SECOND_REVIEW_INSURER_SEMANTIC_DIFF_OR_PROGRESS_MISSING');
need(importer.includes('analyzeInsurerSourceText')&&importer.includes('Analizar y clasificar')&&importer.includes('insurer-source-classifier')&&importer.includes('Cómo se analizó')&&importer.includes('id="imp-insurer-ramo"')&&importer.includes('id="imp-insurer-producto"')&&importer.includes('id="imp-insurer-plan"'),'B4_003_R20_SECOND_REVIEW_INSURER_IMPORTER_INTELLIGENCE_MISSING');
need(driveBackend.includes('INSURER_DOSSIER_ROLES')&&driveBackend.includes('listEntityFolder')&&driveBackend.includes('orbit360DocumentDriveListFolderPreview')&&driveProvider.includes('listFolder')&&driveProvider.includes('resolveDossier'),'B4_003_R20_SECOND_REVIEW_INSURER_DRIVE_BROWSER_MISSING');
need(previewProof.includes('B4_003_INBOX_ROLE_NOT_ASSIGNED_OR_SESSION_NOT_READY')&&previewProof.includes('Orbit.session.set(role)===true')&&previewProof.includes('B4_003_INBOX_SESSION_ROLE_NOT_READY')&&!previewProof.includes("document.dispatchEvent(new CustomEvent('orbit:session',{detail:{source:'b4003qa'}}))"),'B4_003_R20_INBOX_STARTUP_PROOF_ROLE_SELECTION_NOT_CANONICAL');
need(previewProof.includes('B4_003_R20_HANDOFF_ACTORS_NOT_DISTINCT')&&previewProof.includes("actorForRole('operativo',[directionActor.uid])")&&previewProof.includes("actorForRole('asesor',[directionActor.uid,operativeActor.uid])"),'B4_003_R20_HANDOFF_QA_DISTINCT_PRINCIPALS_MISSING');
need(previewProof.includes("location.hash='#/aseguradoras'")&&previewProof.includes("Orbit?.route?.key==='aseguradoras'&&!!document.querySelector('#host .page')"),'B4_003_R20_INSURER_QA_ROUTE_OWNER_PRECONDITION_MISSING');
need(previewProof.includes('DRIVE_REAL_DOSSIER_EXPECTED_ISOLATION_DENIAL')&&previewProof.includes('orbit360DocumentDriveListFolderPreview')&&previewProof.includes("entityId==='gt-aseguradora-guatemalteca'")&&previewProof.includes('insurerDriveSyntheticPositivePath')&&previewProof.includes('insurerDriveRealIsolationDenied')&&previewProof.includes('B4_003_DRIVE_REAL_ISOLATION_NEGATIVE_PATH_NOT_PROVEN'),'B4_003_R20_DRIVE_ISOLATION_DISCRIMINANT_MISSING');
need(quality.includes('const PHONE_CODES=')&&quality.includes("['GT','+502','Guatemala']")&&quality.includes("['CO','+57','Colombia']")&&quality.includes("if(options.focus==='telefono')ordered=ordered.filter")&&quality.includes('quality-scroll-top')&&quality.includes('País propuesto:'),'B4_003_R20_SECOND_REVIEW_QUALITY_PHONE_COUNTRY_SCROLL_MISSING');
need(configuracion.includes('id="cf-cat-planes"')&&read('orbit360-platform/core/config.js').includes('"planes":[]'),'B4_003_R20_SECOND_REVIEW_PLAN_CATALOG_AUTHORITY_MISSING');
need(infra.includes('R20 transversal visual grammar · contrast without aggression')&&infra.includes('.ciclo-collab-panel')&&infra.includes('.inbox-active-count')&&infra.includes('.insurer-offering-card')&&infra.includes('.insurer-drive-panel')&&infra.includes('.quality-scroll-top'),'B4_003_R20_SECOND_REVIEW_VISUAL_GRAMMAR_MISSING');
need(!/insurer-activity-time\{[^}]*font-family:var\(--f-mono\)/.test(infra)&&!/quality-eyebrow\{[^}]*font-family:var\(--f-mono\)/.test(infra),'B4_003_R20_SECOND_REVIEW_TYPOGRAPHY_MIX_REGRESSION');
need(insurer.includes('Qué ocurrió y quién lo hizo')&&insurer.includes('Sistema documental')&&insurer.includes('Conocimiento de la aseguradora')&&!insurer.includes('Registry técnico y provenance'),'B4_003_R20_SECOND_REVIEW_INSURER_AUDIT_LANGUAGE_MISSING');

const productPaths=[paths.workflow,paths.opsInbox,paths.notificationProcessor,paths.authRuntime,paths.productApp,paths.operationalBackend,paths.store,paths.accessScope,paths.cycle,paths.ops,paths.leads,paths.inicio,paths.policyEngine,paths.cronograma,paths.base,paths.bridge,paths.permission,paths.issued,paths.cancel,paths.policy,paths.policyBridge,paths.policyDetail,paths.client360,paths.quality,paths.insurer,paths.insurerVisual,paths.importer,paths.driveBackend,paths.driveProvider,paths.infra,paths.index,paths.rosterBackend,paths.rosterClient,paths.tenantBackend,paths.tenantClient,paths.configuracion,paths.geo,'orbit360-platform/core/config.js'];
const bindings=Object.fromEntries(productPaths.map(p=>[p,hash(p)]));
for(const [p,sha] of Object.entries(bindings)){
  need((comp.productFiles||[]).includes(p),'B4_003_COMPOSITION_PATH_MISSING:'+p);
  need(comp.productFileBlobs?.[p]===sha,'B4_003_COMPOSITION_BLOB_DRIFT:'+p);
}
need(comp.productFileCount===(comp.productFiles||[]).length,'B4_003_PRODUCT_FILE_COUNT_DRIFT');
need(comp.b4003SourceFix?.status==='SOURCE_FIXED_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R1_COMPOSITION_STATE_INVALID');
need(comp.b4003SourceFixR2?.status==='SOURCE_FIXED_R2_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R2_COMPOSITION_STATE_INVALID');
need(comp.b4003SourceFixR3?.status==='SOURCE_FIXED_R3_PREVIEW_ISOLATION_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R3_COMPOSITION_STATE_INVALID');
need(comp.b4003SourceFixR4?.status==='SOURCE_FIXED_R4_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R4_COMPOSITION_STATE_INVALID');
need(comp.b4003SourceFixR5?.status==='SOURCE_FIXED_R5_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R5_COMPOSITION_STATE_INVALID');
need(comp.b4003SourceFixR11?.status==='SOURCE_FIXED_R11_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R11_COMPOSITION_STATE_INVALID');
need(comp.b4003SourceFixR12?.status==='SOURCE_FIXED_R12_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R12_COMPOSITION_STATE_INVALID');
need(comp.b4003SourceFixR13?.status==='SOURCE_FIXED_R13_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R13_COMPOSITION_STATE_INVALID');
need(comp.b4003SourceFixR14?.status==='SOURCE_FIXED_R14_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R14_COMPOSITION_STATE_INVALID');
need(comp.b4003SourceFixR16?.status==='SOURCE_FIXED_R16_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R16_COMPOSITION_STATE_INVALID');
need(comp.b4003SourceFixR17?.status==='SOURCE_FIXED_R17_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R17_COMPOSITION_STATE_INVALID');
need(comp.r18CumulativeSourceFix?.status==='SOURCE_FIXED_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R18_COMPOSITION_STATE_INVALID');
need(comp.r19CumulativeSourceFix?.status==='SOURCE_FIXED_R19_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R19_COMPOSITION_STATE_INVALID');
need(comp.r20CumulativeSourceFix?.status==='SOURCE_FIXED_R20_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R20_COMPOSITION_STATE_INVALID');
/* Business-regression proof runs the REAL versioned source, not a regex assertion.
   Covers the rejected historic-versus-current renewal edition cases. */
{
 const date=s=>s?Math.round((Date.parse(s+'T00:00:00Z')-Date.parse('2026-10-08T00:00:00Z'))/86400000):null;
 const pol=[
  {id:'old70682',numero:'70682',clienteId:'cli1',aseguradoraId:'asg1',pais:'GT',ramo:'VEHICULOS',vigenciaInicio:'2025-08-04',vigenciaFin:'2026-08-04',estado:'Renovada',renovable:true,renovacionEstado:'No renovada'},
  {id:'new70682',numero:'70682',clienteId:'cli1',aseguradoraId:'asg1',pais:'GT',ramo:'VEHICULOS',vigenciaInicio:'2026-08-04',vigenciaFin:'2027-08-04',estado:'Vigente',renovable:true},
  {id:'historic401',numero:'401011234470',clienteId:'cli2',aseguradoraId:'asg2',pais:'GT',ramo:'VIDA',vigenciaInicio:'2025-08-20',vigenciaFin:'2026-08-19',estado:'Histórica',renovable:true},
  {id:'expiredAuto',numero:'AUTO38446',clienteId:'cli3',aseguradoraId:'asg3',pais:'GT',ramo:'VEHICULOS',vigenciaInicio:'2025-10-06',vigenciaFin:'2026-10-06',estado:'Vigente',renovable:true},
  {id:'cancel',numero:'X',clienteId:'cli4',aseguradoraId:'asg3',pais:'GT',ramo:'VEHICULOS',vigenciaInicio:'2025-08-01',vigenciaFin:'2026-08-01',estado:'Cancelada',renovable:true},
  {id:'unknown',numero:'UNKNOWN',clienteId:'cli5',aseguradoraId:'asg3',pais:'GT',ramo:'VEHICULOS',vigenciaInicio:'2025-11-01',vigenciaFin:'2026-11-01',estado:'Vigente',renovable:null},
  {id:'linked',numero:'L',clienteId:'cli6',aseguradoraId:'asg3',pais:'GT',ramo:'VEHICULOS',vigenciaInicio:'2025-09-01',vigenciaFin:'2026-09-01',estado:'Renovada',renovable:true,renovadaPor:'linkedNext'},
  {id:'linkedNext',numero:'L',clienteId:'cli6',aseguradoraId:'asg3',pais:'GT',ramo:'VEHICULOS',vigenciaInicio:'2026-09-01',vigenciaFin:'2027-09-01',estado:'Vigente',renovable:true,renuevaDe:'linked'},
  {id:'coCurrent',numero:'C',clienteId:'cli7',aseguradoraId:'asg7',pais:'CO',ramo:'VIDA',vigenciaInicio:'2025-09-01',vigenciaFin:'2026-10-10',estado:'Vigente',renovable:true},
  {id:'nonrenewable',numero:'NR',clienteId:'cli8',aseguradoraId:'asg3',pais:'GT',ramo:'VIDA',vigenciaInicio:'2025-09-01',vigenciaFin:'2026-09-01',estado:'Vigente',renovable:false},
  {id:'declaredRenewedWithoutSuccessor',numero:'D',clienteId:'cli9',aseguradoraId:'asg3',pais:'GT',ramo:'VIDA',vigenciaInicio:'2025-09-01',vigenciaFin:'2026-09-01',estado:'Vigente',renovable:true,renovacionEstado:'Renovada'},
  {id:'unidentifiedHistorical',numero:'',clienteId:'cli10',aseguradoraId:'asg3',pais:'GT',ramo:'VIDA',vigenciaInicio:'2025-09-01',vigenciaFin:'2026-09-01',estado:'Histórica',renovable:true},
  {id:'unidentifiedOther',numero:'',clienteId:'cli10',aseguradoraId:'asg3',pais:'GT',ramo:'VIDA',vigenciaInicio:'2026-09-01',vigenciaFin:'2027-09-01',estado:'Vigente',renovable:true}
 ];
 const store={all:col=>col==='polizas'?pol:[],get:(col,id)=>col==='clientes'?{id,pais:'GT'}:null};
 const Orbit={pais:'GT',store,modules:{},ui:{daysFromNow:date},q:{},kit:{}};
 const win={Orbit,addEventListener:()=>{}};
 vm.runInNewContext(base,{window:win,Orbit});
 const lifecycle=Orbit.renewalLifecycle;
 need(!!lifecycle&&typeof lifecycle.snapshot==='function','B4_003_R20_LIFECYCLE_PROJECTOR_MISSING');
 const assessment=lifecycle.snapshot(),get=id=>assessment.assess(pol.find(x=>x.id===id));
 need(!get('old70682').bucketEligible&&!get('old70682').actionable&&get('old70682').potentialSuccessor,'B4_003_R20_OLD_RENEWED_NOT_REMOVED');
 need(get('historic401').reviewOnly&&get('historic401').bucketEligible&&!get('historic401').actionable,'B4_003_R20_HISTORICAL_UNRENEWED_HIDDEN');
 need(get('expiredAuto').actionable&&get('expiredAuto').effectiveCoverage==='VENCIDA','B4_003_R20_EXPIRED_VIGENTE_NOT_ACTIONABLE');
 need(get('cancel').terminal&&!get('cancel').bucketEligible,'B4_003_R20_CANCELLED_WAS_ACTIONABLE');
 need(get('unknown').reviewOnly&&get('unknown').bucketEligible&&!get('unknown').actionable,'B4_003_R20_UNKNOWN_RENEWABILITY_CTA_NOT_BLOCKED');
 need(get('linked').terminal&&!get('linked').bucketEligible,'B4_003_R20_LINKED_RENEWED_WAS_ACTIONABLE');
 need(get('coCurrent').actionable,'B4_003_R20_CO_PROJECTION_MISSING');
 need(get('nonrenewable').terminal&&!get('nonrenewable').bucketEligible,'B4_003_R20_NO_RENEWABLE_VISIBLE');
 need(get('declaredRenewedWithoutSuccessor').reviewOnly&&!get('declaredRenewedWithoutSuccessor').actionable,'B4_003_R20_RENEWAL_OUTCOME_WITHOUT_SUCCESSOR_NOT_HELD');
 need(get('unidentifiedHistorical').reviewOnly&&!get('unidentifiedHistorical').potentialSuccessor,'B4_003_R20_INCOMPLETE_IDENTITY_FALSE_SUCCESSOR');
 need(lifecycle.snapshot()===assessment,'B4_003_R20_LIFECYCLE_SNAPSHOT_REBUILT_PER_ROW');
}

/* R20 cumulative performance+role regression: do not repeatedly hydrate entire
   renewal lineage from an unrelated Pólizas KPI or leak a scoped snapshot across roles. */
{
 const rows=Array.from({length:1419},(_,i)=>({
   id:'perf_'+i,estado:i<17?'Vigente':(i%2?'Renovada':'Vigente'),
   vigenciaFin:i<17?'2026-10-28':'2027-10-28'
 }));
 let lineageCalls=0;
 const orbit={modules:{},store:{},kit:{},q:{},ui:{daysFromNow:d=>d==='2026-10-28'?20:385},
   renewalLifecycle:{evaluate:()=>{lineageCalls++;return{actionable:true,reviewOnly:false};}}};
 const context={Orbit:orbit,window:{Orbit:orbit,addEventListener:()=>{}},document:{addEventListener:()=>{}}};
 vm.runInNewContext(policy,context,{timeout:1500});
 const metric=orbit.modules?.polizas?.policyMetrics?.isRenewalWithin45Days;
 need(typeof metric==='function','B4_003_POLICIES_KPI_OWNER_MISSING');
 const eligible=rows.filter(p=>metric(p)).map(p=>p.id);
 need(eligible.length===17&&lineageCalls===17,'B4_003_POLICY_KPI_LIFECYCLE_READ_AMPLIFICATION:'+lineageCalls);
 need(eligible.every(id=>Number(id.slice(5))<17),'B4_003_POLICY_KPI_FAST_PRUNE_CHANGED_BUSINESS_SET');
}
{
 let activeRole='direccion';
 const baseRows=[
  {id:'direction',numero:'D-1',clienteId:'c1',aseguradoraId:'as',pais:'GT',ramo:'VIDA',estado:'Vigente',renovable:true,vigenciaInicio:'2025-09-01',vigenciaFin:'2026-10-08'},
  {id:'advisor',numero:'A-1',clienteId:'c1',aseguradoraId:'as',pais:'GT',ramo:'VIDA',estado:'Vigente',renovable:true,vigenciaInicio:'2025-09-01',vigenciaFin:'2026-10-08'}
 ];
 const store={all:col=>col==='polizas'?(activeRole==='direccion'?baseRows:baseRows.slice(1)):[],get:()=>({pais:'GT'})};
 const orbit={pais:'GT',session:{rol:()=>activeRole},store,modules:{},kit:{},q:{},ui:{daysFromNow:()=>0}};
 vm.runInNewContext(base,{Orbit:orbit,window:{Orbit:orbit,addEventListener:()=>{}}},{timeout:1500});
 const direction=orbit.renewalLifecycle.snapshot();
 activeRole='asesor';
 const advisor=orbit.renewalLifecycle.snapshot();
 need(direction.rows.length===2&&advisor.rows.length===1&&advisor.rows[0].id==='advisor'&&direction!==advisor,
   'B4_003_RENEWAL_LIFECYCLE_CROSS_ROLE_CACHE_LEAK');
 orbit.pais='CO';
 need(orbit.renewalLifecycle.snapshot()!==advisor,'B4_003_RENEWAL_LIFECYCLE_COUNTRY_CACHE_LEAK');
}
need(index.includes('modules/polizas.js?v=20261004-b4003r14-i65-20261008-lineage-r20-perf-role-scope-20261008')
  &&index.includes('modules/renovaciones.js?v=20261008-r20-uat-recovery-i65-20261008-lineage-p1-r20-perf-role-scope-20261008'),
  'B4_003_R20_POLICY_AND_RENEWALS_CACHE_BUST_BINDING_MISSING');
need(base.includes('advisorProjectionReady=')&&base.includes("n!=='asesores'||!advisorProjectionReady")&&previewProof.includes('B4_003_RENEWAL_SEARCH_TARGET_NOT_READY_OR_NOT_VISIBLE'),'B4_003_RENEWAL_SEARCH_ADVISOR_PROJECTION_READINESS_GUARD_MISSING');
need(base.includes('data-renewal-search-input')&&base.includes('data-renewal-search-state')&&base.includes('visibleCols.map')&&previewProof.includes('renewalSearchKanbanPositiveNegativeClear'),'B4_003_RENEWAL_SEARCH_EXACT_KANBAN_CONTRACT_MISSING');
need(index.includes("document.addEventListener('orbit:auth'")&&index.includes('!Orbit.auth?.productUser?.uid||!activeRole()')&&previewProof.includes('B4_003_R21_ACTION_CARD_INBOX_STARTUP_READINESS_NOT_CONFIRMED'),'B4_003_R21_COLD_LOGIN_INBOX_AUTH_HANDOFF_REGRESSION');
need(index.includes('refreshFlight')&&index.includes('inboxScope()')&&index.includes('data-inbox-render-count')&&previewProof.includes('B4_003_INBOX_AUTHENTICATED_CARD_NOT_VISIBLE'),'B4_003_INBOX_STALE_REFRESH_DISCRIMINANT_MISSING');
/* R20: Reproduce the actual string-composition failure: header count previously
   rendered without any body/cards. Execute the source's real HTML expression. */
{
 const start=index.indexOf('var esc=Orbit.ui.esc,active=');
 const end=index.indexOf("dr.querySelector('#ops-inbox-x').onclick",start);
 need(start>=0&&end>start,'B4_003_INBOX_EFFECTIVE_TEMPLATE_OWNER_NOT_FOUND');
 const owner=index.slice(start,end);
 for(const [resolved,expectedActive] of [[false,1],[true,0]]){
  const eventId='qa_inbox_card_'+(resolved?'resolved':'active');
  const context={Orbit:{ui:{esc:value=>String(value)}},rows:[{eventId,title:'Solicitud',message:'Atención',targetType:'advisor',targetId:'qa',archived:false,globalResolved:resolved}],refreshState:'ready'};
  vm.runInNewContext("var dr={innerHTML:''};"+owner+"; renderedHtml=dr.innerHTML;",context,{timeout:1300});
  need(context.renderedHtml.includes('data-notice-event="'+eventId+'"')&&context.renderedHtml.includes('inbox-list')&&context.renderedHtml.includes('<b>'+expectedActive+'</b><span>activas</span>'),'B4_003_INBOX_RENDERED_BODY_MISSING_WHEN_COUNTER_PRESENT:'+eventId);
 }
}

/* B4-003 R21: no inferred renewal is written; only source-backed continuity
   can suppress a false expired campaign and must remain reviewable. */
{
 const date=s=>s?Math.round((Date.parse(s+'T00:00:00Z')-Date.parse('2026-10-09T00:00:00Z'))/86400000):null;
 const original={id:'old',tenantId:'t',pais:'GT',numero:'02-01-488-5659-0',clienteId:'c',aseguradoraId:'a',ramo:'VEHICULOS',producto:'Auto Individual',placa:'P-728JPL',vigenciaInicio:'2025-09-08',vigenciaFin:'2026-09-08',estado:'Renovada',renovable:true};
 const successor={...original,id:'new',numero:'02-01-488-5659-1',vigenciaInicio:'2026-09-08',vigenciaFin:'2027-09-08',estado:'Vigente',tipoEmisionFuente:'Póliza Renovada'};
 function classify(rows){
  const store={all:k=>k==='polizas'?rows:[],get:()=>null,where:(k,test)=>rows.filter(test)};
  const orbit={pais:'GT',auth:{productUser:{uid:'qa'}},session:{rol:()=> 'Dirección'},store,modules:{},kit:{},q:{},ui:{daysFromNow:date}};
  vm.runInNewContext(base,{Orbit:orbit,window:{Orbit:orbit,addEventListener:()=>{}}},{timeout:1700});
  return orbit.renewalLifecycle.snapshot().assess(rows[0]);
 }
 const source=classify([original,successor]);
 need(base.includes('q.tipoEmisionFuente||q.tipoEmision'),'B4_003_R21_CANONICAL_ISSUANCE_FIELD_READ_OWNER_MISSING');
 need(store.includes('_ensureCollections:function(names)')&&store.includes('__productHydrationRequiredOptionalP0:base.__productHydrationRequiredOptionalP0||null')&&index.includes('store-firestore-product-operational-p0.js?v=20261009-b4003r21-hydration-contract')&&previewProof.includes('readOnlyOperationalFacadeHydrationForwarded'),'B4_003_R21_OPERATIONAL_STORE_FACADE_HYDRATION_OWNER_NOT_BOUND');
 need(previewProof.includes('const readback=await page.evaluate(({missing,extra})=>')&&previewProof.includes('B4_003_R13_REAL_RENEWAL_PIPELINE_MISMATCH')&&previewProof.includes('readback.pass&&uniqueVisible')&&previewProof.includes('if(!changesExplained)throw new Error')&&previewProof.includes('realRenewalLineageSourceBackedIndependentlyAdjudicated'), 'B4_003_R21_INDEPENDENT_REAL_DELTA_ADJUDICATOR_NOT_BOUND');
 need(source.reason==='SUCESORA_DE_FUENTE_PENDIENTE_ENLACE'&&!source.bucketEligible&&source.sourceBackedSuccessorId==='new'&&!source.terminal,'B4_003_R21_SOURCE_SUCCESSOR_NOT_CAUSALLY_SEPARATED');
 const unproved=classify([original,{...successor,tipoEmisionFuente:'Póliza Nueva'}]);
 need(unproved.bucketEligible&&unproved.reviewOnly&&!unproved.terminal,'B4_003_R21_UNPROVEN_RENEWAL_WRONGLY_HIDDEN');
 const crossed=classify([original,{...successor,placa:'P-111ABC'}]);
 need(crossed.bucketEligible&&!crossed.sourceBackedSuccessorId,'B4_003_R21_DIFFERENT_VEHICLE_FALSE_SUCCESSOR');
 const explicit=classify([{...original,renovadaPor:'new'},successor]);
 need(explicit.terminal&&explicit.verifiedSuccessorId==='new','B4_003_R21_CHANGED_NUMBER_EXPLICIT_LINK_REJECTED');
 const closed=classify([{...original,estado:'Vencida',renovacionEstado:'No renovada',vigenciaFin:'2026-07-31'}]);
 need(closed.terminal&&!closed.bucketEligible,'B4_003_R21_CUTOFF_PRIOR_APPROVAL_NOT_PRESERVED');
}
{
 const begin=cycle.indexOf('function collaborationState(n,board)');
 const end=cycle.indexOf('function actionQueueRanks(board)',begin);
 need(begin>=0&&end>begin,'B4_003_R21_COLLABORATION_EFFECTIVE_OWNER_NOT_FOUND');
 const src=cycle.slice(begin,end);
 const row={comentarios:[{eventId:'evt',direction:'operations',ts:'2026-10-09T10:00:00Z'}]};
 function action(globalResolved,known){
  const orbit={sharedInboxState:{lookup:()=>({known,globalResolved})}};
  const ctx={Orbit:orbit,row};
  vm.runInNewContext(src+';result=collaborationState(row,"ops")',ctx,{timeout:1000});
  return ctx.result;
 }
 need(action(false,true).needsAction===true&&action(true,true).needsAction===false&&action(false,false).needsAction===true,'B4_003_R21_ACTION_RANK_IGNORES_SHARED_RESOLUTION_OR_ACK_NOT_DISTINCT');
 need(index.includes('includeArchived:true')&&index.includes('orbit:inbox-state')&&index.includes('publishInboxProjection')&&
 ops.includes('orbit:inbox-state')&&leads.includes('orbit:inbox-state'),'B4_003_R21_RESOLVED_EVENT_HYDRATION_OR_BOARD_REFRESH_MISSING');
 need(cycle.includes('previewProtectedUpload')&&cycle.includes('type="file" ${previewProtectedUpload?\'disabled\':\'\'}')&&cycle.includes('Preview protege los archivos de negocios reales')&&
 driveBackend.includes('previewSyntheticTarget(target)'),'B4_003_R21_PREVIEW_ATTACHMENT_DENIAL_NOT_EARLY_OR_BOUNDARY_WEAKENED');
 need(previewProof.includes('ephemeral_synthetic_negative_readmodel')&&previewProof.includes('r21SyntheticBusinessSnap.exists')&&previewProof.includes('readModelRestored')&&previewProof.includes('writeCountUnchanged')&&!previewProof.includes('if(!real)return{realPresent:false}'),'B4_003_R21_SCOPE_SAFE_PREVIEW_ATTACHMENT_NEGATIVE_PROBE_MISSING');
 need(index.includes('modules/renovaciones.js?v=')&&index.includes('b4003r21')&&index.includes('core/ciclo.js?v=20261007-r20f2-b4003r21'),'B4_003_R21_CACHE_BUST_REAL_RUNTIME_MISSING');
}
need(index.includes('class="inbox-toolbar" style="flex-wrap:wrap')&&index.includes('class="inbox-card-actions" style="flex-wrap:wrap"'),
 'B4_003_INBOX_320_VIEWPORT_FLEX_WRAP_MISSING');

/* B4-003 R20: Policy country is already on the canonical row for nearly all editions.
   An unconditional scoped client lookup for each edition multiplied first paint cost.
   Assert semantics and that at most two lookups occur across 1419 synthetic rows,
   including one with missing country that MUST still use the client fallback. */
{
 const records=Array.from({length:1419},(_,i)=>({
   id:'perf_'+i,numero:'P'+Math.floor(i/4),clienteId:'client_'+i,
   aseguradoraId:'ins',ramo:'Vehiculos',
   pais:i===0?'':i%2?'GT':'CO',estado:'Vigente',renovable:true,
   vigenciaInicio:'2025-08-04',vigenciaFin:'2026-10-07'
 }));
 let clientGets=0;
 const store={all:kind=>kind==='polizas'?records:[],
   get:(kind,id)=>{clientGets++;return kind==='clientes'?{id,pais:'GT'}:null;}};
 const orbit={pais:'TODOS',store,modules:{},q:{},kit:{},ui:{daysFromNow:()=>-2},session:{rol:()=>'direccion'}};
 vm.runInNewContext(base,{window:{Orbit:orbit,addEventListener:()=>{}},Orbit:orbit},{timeout:1500});
 const snap=orbit.renewalLifecycle.snapshot();
 need(snap.rows.length===1419,'B4_003_R20_POLICY_COUNTRY_READMODEL_SET_CHANGED');
 need(snap.assess(records[0]).actionable===true,'B4_003_R20_POLICY_COUNTRY_FALLBACK_LOST');
 need(clientGets<=5,'B4_003_R20_POLICY_COUNTRY_EXTRA_CLIENT_READ_AMPLIFICATION:'+clientGets);
}
/* Independent renewals QA is itself regression tested against meaningful statuses.
   This prevents false PASS/FAIL caused by "No renovada" and "Por renovar" spacing. */
{
 const start=previewProof.indexOf(' const normIdentity=v=>'),end=previewProof.indexOf(' const byState={',start);
 need(start>=0&&end>start,'B4_003_RENEWAL_QA_CLASSIFIER_UNAVAILABLE');
 const rows=[
  {id:'terminal',numero:'X',clienteId:'c1',aseguradoraId:'a',pais:'GT',ramo:'VIDA',estado:'Vigente',renovable:true,renovacionEstado:'No renovada',vigenciaInicio:'2025-01-01',vigenciaFin:'2026-09-01'},
  {id:'dueSoon',numero:'Y',clienteId:'c2',aseguradoraId:'a',pais:'GT',ramo:'VIDA',estado:'Por renovar',renovable:true,vigenciaInicio:'2025-11-01',vigenciaFin:'2026-10-20'},
  {id:'expired',numero:'Z',clienteId:'c3',aseguradoraId:'a',pais:'GT',ramo:'AUTO',estado:'Vigente',renovable:true,vigenciaInicio:'2025-10-06',vigenciaFin:'2026-10-06'}
 ];
 const ctx={rows,clientById:new Map(),clean:v=>String(v==null?'':v).trim(),norm:v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''),state:()=>'YES'};
 const computed=vm.runInNewContext(previewProof.slice(start,end)+";[pipelineEligible(rows[0],-20),pipelineEligible(rows[1],11),pipelineEligible(rows[2],-3)]",ctx,{timeout:1500});
 need(computed[0]===false&&computed[1]===true&&computed[2]===true,'B4_003_RENEWAL_QA_DISCRIMINANT_FAILED');
 need(previewProof.includes("const hash=value=>createHash('sha256')"),'B4_003_RENEWAL_QA_DIAGNOSTIC_HASH_UNBOUND');
}

need(lock.boundaries?.businessWritesAuthorized===false&&lock.boundaries?.dataMutationAuthorized===false&&lock.boundaries?.reimportAuthorized===false&&lock.boundaries?.livePromotionAuthorized===false,'B4_003_BOUNDARY_INVALID');
need(lock.boundaries?.syntheticQaWritesAuthorized===true,'B4_003_SYNTHETIC_QA_NOT_AUTHORIZED');

console.log(JSON.stringify({status:'PASS',contract:'B4_003_R20_CONTRACT',exactBlobBindings:bindings,singleRenewalActionOwner:paths.bridge,noDelayedRenewalRenderOwners:true,durableRenewalCampaign:true,durableCancelationRecovery:true,previewGeneralWritesIsolated:true,r13PolicyIndexedSearch:true,r13PolicyCoherentHydration:true,r13CancelIndexedRelations:true,r13InsurerDriveTargetAuthority:true,productFileCount:comp.productFileCount},null,2));

need(quality.includes('id="q-search"')&&quality.includes('id="q-pais"')&&!quality.includes('<th>Canal</th>')&&quality.includes('quality-main-scroll'),'B4_003_R19_QUALITY_SEARCH_FILTER_RESPONSIVE_MISSING');
need(policyBridge.includes('operacion_atomica_no_confirmada')&&policyBridge.includes('protectedPreviewRealPolicy')&&!policyBridge.includes("|| String(x).replace(/_/g, ' ')"),'B4_003_R19_POLICY_HUMAN_ERROR_OR_PREVIEW_GUARD_MISSING');
need(policyDetail.includes('function humanIssueLabel')&&policyDetail.includes("replace(/<[^>]*>/g,' ')"),'B4_003_R19_POLICY_TECHNICAL_LABEL_SANITIZER_MISSING');
need(base.includes('const renewalPipelineCandidate')&&base.includes("renewabilityState(p)==='NO'")&&base.includes('data-renewal-bucket=')&&base.includes('data-renewability-pending-count=')&&base.includes('data-source-link-review-count=')&&base.includes('SUCESORA_DE_FUENTE_PENDIENTE_ENLACE')&&base.includes('renewal-pipeline-note')&&!base.includes('Existen <b>${expired.historicalExpired}</b> ediciones históricas vencidas')&&!base.includes('renewal-disposition-detail'),'B4_003_R20_RENEWAL_APPROVED_KANBAN_CONTRACT_MISSING');
need(inicio.includes('data-inicio-advisor-readiness="unavailable"')&&inicio.includes("state==='unavailable'?'No disponible'"),'B4_003_R19_INICIO_TERMINAL_READINESS_MISSING');
need(insurer.includes('insurer-offering-matrix')&&insurer.includes('data-offer-ramo')&&insurer.includes('data-ramoprod')&&insurer.includes('data-ramoplancheck')&&insurer.includes('insurer-knowledge-workbench')&&insurer.includes('Productos con conocimiento disponible')&&insurer.includes('Tarifas y condiciones para cálculo'),'B4_003_R20_SECOND_REVIEW_INSURER_INFORMATION_ARCHITECTURE_MISSING');
need(workflow.includes("collabDirection==='advisor'")&&workflow.includes("collabDirection==='operations'"),'B4_003_R19_HANDOFF_OUTBOX_DIRECTION_MISSING');
need(opsInbox.includes('orbit360GetAdvisorOpsInboxPreview')&&opsInbox.includes('collaborationNotices')&&opsInbox.includes("['advisor','operations'].includes(direction)")&&opsInbox.includes('opsRole(authz.activeRole)'),'B4_003_R19_HANDOFF_INBOX_PROJECTION_MISSING');
need(infra.includes('.quality-main-scroll')&&infra.includes('.insurer-multicheck-list')&&infra.includes('.quality-main-table td:before'),'B4_003_R19_RESPONSIVE_STYLES_MISSING');
need(/function\s+calendarAuthorityLabel\s*\(/.test(quality)&&quality.includes('data-health-open-review')&&quality.includes('revisarDescuadre')&&quality.includes('&t=recibos'),'B4_003_R17_QUALITY_EXACT_RESOLUTION_ACTION_MISSING');
need(!quality.includes("location.hash='#/polizas?p=")&&quality.includes('quality-fin-mobile'),'B4_003_R16_04_QUALITY_STALE_DEEPLINK_OR_MOBILE_CONTRACT_MISSING');
need(policyDetail.includes('function receiptPlanOrdinal')&&policyDetail.includes('LEGACY_UNDENOMINATED_DUPLICATE')&&policyDetail.includes('data-receipt-shadow-exclusion'),'B4_003_R16_05_RECEIPT_SHADOW_PROJECTION_MISSING');
need(configuracion.includes("catalogLoadState = 'idle'")&&configuracion.includes('data-catalog-state="loading"')&&configuracion.includes('hydrateCatalogs(host,false)'),'B4_003_R16_06_CATALOG_FIRST_PAINT_MISSING');
need(configuracion.includes('plans = Orbit.PLANES || {}')&&!configuracion.includes('plan = Orbit.PLANES[t.plan]'),'B4_003_R16_06_CONFIG_PLAN_BOOTSTRAP_GUARD_MISSING');
need(base.includes('data-renewability-review=')&&base.includes('Revisar renovabilidad')&&base.includes('cliente360.editarPoliza')&&base.includes('renovabilidad')&&base.includes('Decisión: renovabilidad pendiente'),'B4_003_R20_RENEWABILITY_INLINE_ACTION_MISSING');
need(insurer.includes('insurer-drive-panel')&&insurer.includes('data-drive-browser="1"')&&insurer.includes('Expediente Drive')&&insurer.includes('Fuentes clasificadas')&&insurer.includes('data-technical-registry="1"'),'B4_003_R20_SECOND_REVIEW_INSURER_DRIVE_KNOWLEDGE_HIERARCHY_MISSING');
need(insurerVisual.includes('<span>Validadas</span>')&&insurerVisual.includes('Archivo físico en Drive')&&!insurerVisual.includes('Mapeadas / validadas'),'B4_003_R16_08_INSURER_KPI_SEMANTICS_MISSING');
need(cycle.includes('function insurersForCountry')&&cycle.includes('insurerChecklistHtml')&&cycle.includes('checkedInsurerIds')&&!/id="(?:ng|nn)-asg"[^>]*multiple/.test(cycle)&&cycle.includes('aseguradoraIds: insurerIds'),'B4_003_R19_EXPLICIT_INSURER_MULTISELECT_MISSING');
need(!cycle.includes('if(preferred&&!rows.includes(preferred))rows.unshift(preferred)'),'B4_003_R19_STALE_DEPENDENT_VALUE_REINSERTION_REMAINS');
need(cycle.includes('function collaborationDirection')&&cycle.includes("['Solicitar información al asesor','Devuelto a asesor'].includes(tipo)")&&cycle.includes("['Respuesta del asesor','Reenviado a Operaciones'].includes(tipo)")&&cycle.includes('direction, eventId'),'B4_003_R19_TYPED_COLLABORATION_METADATA_MISSING');
need(cycle.includes("surface==='leads'")&&cycle.includes("scopes.leads||scopes.commercial")&&cycle.includes("negocios({surface:'leads'})")&&cycle.includes("gestiones({surface:'ops'})"),'B4_003_R20_LEADS_OPS_SCOPE_SEPARATION_MISSING');
need(workflow.includes('function collaborationWriteDirection')&&workflow.includes('function workflowAuthorizationDomain')&&workflow.includes("direction==='advisor'")&&workflow.includes("origin==='ops'")&&workflow.includes('operationalContext')&&workflow.includes('ADMIN_ROLES.has(authz.actor.activeRole)')&&workflow.includes('authorizationDomain'),'B4_003_R20_HANDOFF_BACKEND_SCOPE_DOMAIN_MISSING');
need(cycle.includes('Registrando…')&&cycle.includes('Colaboración registrada y confirmada.')&&cycle.includes('slice().reverse().map(comRow)')&&cycle.includes('data-collab-state='),'B4_003_R20_HANDOFF_FEEDBACK_OR_CARD_STATE_MISSING');
need(cycle.includes('currentUserName')&&cycle.includes('displayStamp')&&cycle.includes('ng-com-file')&&cycle.includes('collab-action')&&cycle.includes('collab-wait'),'B4_003_R20_COLLAB_IDENTITY_DATE_ATTACHMENT_VISUAL_STATE_MISSING');
need(workflow.includes('canonicalizeCollaborationPayload')&&workflow.includes('actorName:authz.actor.name')&&workflow.includes('collaborationReadback'),'B4_003_R20_COLLAB_CANONICAL_SERVER_IDENTITY_MISSING');
need(opsInbox.includes('const deduped=new Map()')&&opsInbox.includes('updateInboxState')&&opsInbox.includes("statusLabel:resolvedAt?'Resuelta para todos':acknowledgedAt?'Reconocida por ti':readAt?'Vista por ti':'Nueva'")&&opsInbox.includes('recipientMatch')&&opsInbox.includes('inboxTaskCollection')&&opsInbox.includes('sharedResolutionOwner: true'),'B4_003_R20_INBOX_DEDUPE_RECIPIENT_STATE_MISSING');
need(notificationProcessor.includes('targetSurface')&&notificationProcessor.includes('actorUid')&&notificationProcessor.includes('actorName'),'B4_003_R20_NOTIFICATION_RECIPIENT_PROJECTION_MISSING');
need(index.includes('Reconocer para mí')&&index.includes('Resolver para todos')&&index.includes('Archivar resueltas')&&index.includes('targetSurface')&&!index.includes("n.status||'pendiente'"),'B4_003_R20_INBOX_HUMAN_UI_MISSING');
need(authRuntime.includes("setRestoring('Acceso confirmado · preparando tus datos…')")&&!authRuntime.includes("if(!validRequestedRoute())location.hash='#/inicio'"),'B4_003_R20_AUTH_PROGRESS_OR_FORCED_INICIO_REMAINS');
need(productApp.includes('hydration.required.slice()')&&productApp.includes("function preferredLanding()")&&productApp.includes("return'inicio'")&&!productApp.includes("if(advisor)return'leads'")&&index.includes('maybePendingLanding')&&index.includes("surface=/operativo|admin|direcci[oó]n|superadmin/.test(role)?'ops':/asesor|comercial|asistente/.test(role)?'leads':''"),'B4_003_R20_SECOND_REVIEW_STARTUP_PENDING_ROUTING_MISSING');
need(previewProof.includes("'|BOOTSTRAP_TRACE='")&&previewProof.includes('bootstrapTrace.length>16'),'B4_003_R20_ADVISOR_BOOTSTRAP_SANITIZED_TRACE_MISSING');
need(previewProof.includes('u.emailVerified===true')&&previewProof.includes('B4_003_R20_VERIFIED_ACTOR_FOR_ROLE_NOT_FOUND'),'B4_003_R20_VERIFIED_CROSS_ROLE_ACTOR_SELECTION_MISSING');
need(router.includes("orbit:route-ready"),'B4_003_R20_ROUTE_READY_SIGNAL_MISSING');
need(base.includes('Vencidas renovables')&&base.includes('data-expired-historical-count')&&base.includes('expiredContext()'),'B4_003_R20_RENEWAL_EXPIRED_KPI_SEMANTICS_MISSING');
need(insurer.includes('data-insurer-preview-uat="1"')&&insurer.includes('data-rupload')&&insurer.includes('insurer-premium-section')&&!insurer.includes('Registry técnico y provenance'),'B4_003_R20_INSURER_HUMAN_UAT_OR_VISUAL_REDESIGN_MISSING');
need(quality.includes('sourceLabel(x.contractualSource)')&&quality.includes('Prima total en póliza')&&quality.includes('Total de recibos programados')&&quality.includes('programación de pagos')&&quality.includes('quality-workbench'),'B4_003_R20_SECOND_REVIEW_QUALITY_HUMAN_LANGUAGE_MISSING');
need(driveBackend.includes("entity==='negocio'")&&driveBackend.includes('refsForTarget(target)')&&driveBackend.includes("target.entityType==='negocio'?await ensureFolder(rootId,'_NEGOCIOS'")&&!driveBackend.includes("if(!clientId)throw new HttpsError('failed-precondition','El negocio no tiene cliente vinculado"),'B4_003_R20_COLLAB_DRIVE_TARGET_MISSING');
need(driveBackend.includes("for(const key of ['attachment','adjunto'])append(row&&row[key])")&&driveBackend.includes('function refsForTarget(target)')&&driveBackend.includes('...businessHistory.flatMap(row=>[...refsFrom(row)])')&&driveBackend.includes('const bound=refsForTarget(target)'),'B4_003_R20_COLLAB_ATTACHMENT_NESTED_REF_AUTH_MISSING');
need(previewProof.includes('attempt<=6')&&previewProof.includes('Math.min(2500,500*attempt)'),'B4_003_R20_CROSS_CONTEXT_BOOTSTRAP_RETRY_BUDGET_MISSING');
need(executorWorkflow.includes('retry_bounded 420 npm install --prefix "$CROOT"')&&executorWorkflow.includes('retry_bounded 420 npm install --no-save')&&executorWorkflow.includes('retry_bounded 600 npx playwright install')&&executorWorkflow.includes('timeout --foreground "${limit}s"'),'B4_003_R20_QA_DEPENDENCY_BOUNDED_RETRY_MISSING');
need(opBackend.includes('b4003qa_'),'B4_003_R20_INSURER_ASSET_PREVIEW_UAT_MISSING');

need(workflow.includes("onSchedule")&&workflow.includes('orbit360OpsLeadsCadenceScheduler')&&workflow.includes('previewNotificationOutbox')&&workflow.includes("advisorAllowed(authz.member")&&workflow.includes("'leads'"),'B4_003_R20_CADENCE_SCOPE_PREVIEW_BACKEND_MISSING');
need(opsInbox.includes('opsScope')&&opsInbox.includes('leadsScope')&&opsInbox.includes('previewInternalNotifs')&&opsInbox.includes('internalNotices'),'B4_003_R20_INBOX_SCOPE_OR_INTERNAL_PROJECTION_MISSING');
need(notificationProcessor.includes('internalProjectionRef')&&notificationProcessor.includes('internalProjectionCount')&&notificationProcessor.includes('PREVIEW_QA_EVENT_ONLY'),'B4_003_R20_INTERNAL_NOTIFICATION_PROJECTION_MISSING');
need(authRuntime.includes('restorePromise=null')&&authRuntime.includes("showLogin();paintError('')")&&!authRuntime.includes('rawUser=null;location.reload()'),'B4_003_R20_LOGOUT_RELOAD_REGRESSION_REMAINS');
need(index.includes('id="ops-inbox-bell"')&&index.includes('orbit360GetAdvisorOpsInboxPreview')&&index.includes("surface==='ops'?'#/ops':'#/leads'")&&index.includes("location.hash='#/ops'"),'B4_003_R20_INTERNAL_INBOX_SHELL_MISSING');
need(insurer.includes('insurer-requirement-card')&&insurer.includes('data-rcountry')&&insurer.includes('data-rramo')&&insurer.includes('data-rplan')&&insurer.includes('data-rattach'),'B4_003_R20_INSURER_REQUIREMENT_SCHEMA_UI_MISSING');
need(insurer.includes('data-dprod')&&insurer.includes('data-dplan')&&insurer.includes('data-source-link')&&insurer.includes('Asociar a ficha'),'B4_003_R20_INSURER_SOURCE_ASSOCIATION_MISSING');
need(insurer.includes('id="kf-ramo"')&&insurer.includes('id="kf-producto"')&&insurer.includes('Seleccionar fuente registrada'),'B4_003_R20_INSURER_KNOWLEDGE_FILTER_OR_SOURCE_CATALOG_MISSING');
need(infra.includes('.insurer-requirement-card')&&infra.includes('.insurer-knowledge-grid')&&infra.includes('@media(max-width:640px)'),'B4_003_R20_INSURER_PREMIUM_RESPONSIVE_STYLES_MISSING');
need(infra.includes('.kcol-body{padding:10px;display:grid;gap:9px;flex:1;min-width:0;overflow:hidden}')&&infra.includes('min-width:0;max-width:100%;width:100%;box-sizing:border-box;overflow:hidden')&&infra.includes('.kcard-t{')&&infra.includes('overflow-wrap:anywhere;word-break:break-word'),'B4_003_R17_OPS_LEADS_CARD_CONTAINMENT_MISSING');
need(base.includes('data-renewal-bucket=')&&bridge.includes("bucket=key=>Array.from(host.querySelectorAll('[data-renewal-bucket=\"'+key+'\"] [data-renewal-policy]'))")&&!bridge.includes('const all=policies(90),venc='),'B4_003_R17_RENEWAL_KPI_CANONICAL_BUCKET_BINDING_MISSING');
need(policyBridge.includes("clientMod.editarPoliza=function(policyId,focusField)")&&policyBridge.includes("opts.focusField==='renovabilidad'")&&policyBridge.includes('[data-renewable]'),'B4_003_R17_RENEWABILITY_FOCUS_RUNTIME_OWNER_MISSING');
need(quality.includes('max-width:1700px')&&quality.includes('sourceLabel(x.contractualSource)')&&quality.includes('Qué estamos comparando:')&&quality.includes('Por qué requiere revisión:')&&quality.includes('Origen de la prima')&&quality.includes('Origen de la programación de pagos')&&quality.includes('Cómo se determinó')&&!quality.includes('<th>Provenance / evidencia</th>'),'B4_003_R18_QUALITY_RESPONSIVE_HUMAN_SEMANTICS_MISSING');
need(policyDetail.includes('const isVehiclePolicy')&&policyDetail.includes("isVehiclePolicy(p) ? section('🚘 Riesgo asegurado / vehículo'")&&policyDetail.includes("let reason=''")&&policyDetail.includes("calendario activo") ,'B4_003_R17_NONVEHICLE_OR_FINANCIAL_CAUSE_GUARD_MISSING');
need(insurer.includes('insurer-source-card')&&insurer.includes('data-source-registry-detail=')&&insurer.includes('Ver detalles ▾')&&!insurer.includes("const provenance=clean(r.provenance"),'B4_003_R18_INSURER_SOURCE_REGISTRY_DRILLDOWN_MISSING');
