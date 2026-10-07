import fs from 'node:fs';
import cp from 'node:child_process';

const need=(v,c)=>{if(!v)throw new Error(c);};
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>cp.execFileSync('git',['hash-object',p],{encoding:'utf8'}).trim();

const paths={
  workflow:'functions/product-ops-leads-domain.js',
  opsInbox:'functions/ops-advisor-inbox.js',
  notificationProcessor:'functions/notification-outbox-processor.js',
  authRuntime:'orbit360-platform/core/auth-product-runtime-p0.js',
  productApp:'orbit360-platform/core/product-app-p0.js',
  operationalBackend:'functions/product-operational-domain.js',
  store:'orbit360-platform/data/store-firestore-product-operational-p0.js',
  accessScope:'orbit360-platform/core/access-scope.js',
  cycle:'orbit360-platform/core/ciclo.js',
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

const workflow=read(paths.workflow),opsInbox=read(paths.opsInbox),notificationProcessor=read(paths.notificationProcessor),authRuntime=read(paths.authRuntime),productApp=read(paths.productApp),opBackend=read(paths.operationalBackend),store=read(paths.store),accessScope=read(paths.accessScope),cycle=read(paths.cycle),inicio=read(paths.inicio),policyEngine=read(paths.policyEngine),router=read(paths.router),cronograma=read(paths.cronograma),base=read(paths.base),bridge=read(paths.bridge),permission=read(paths.permission),issued=read(paths.issued),cancel=read(paths.cancel),policy=read(paths.policy),policyBridge=read(paths.policyBridge),policyDetail=read(paths.policyDetail),client360=read(paths.client360),quality=read(paths.quality),insurer=read(paths.insurer),insurerVisual=read(paths.insurerVisual),importer=read(paths.importer),insurerImportBridge=read(paths.insurerImportBridge),driveBackend=read(paths.driveBackend),driveProvider=read(paths.driveProvider),infra=read(paths.infra),index=read(paths.index),rosterBackend=read(paths.rosterBackend),rosterClient=read(paths.rosterClient),tenantBackend=read(paths.tenantBackend),tenantClient=read(paths.tenantClient),configuracion=read(paths.configuracion),geo=read(paths.geo),readPolicy=read(paths.readPolicy);
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
need(/renewalDataReadiness/.test(base)&&/data-renewals-loading=/.test(base)&&/REQUIRED_DATA = \['polizas', 'clientes', 'aseguradoras'\]/.test(base),'B4_003_R14_RENEWAL_FIRST_PAINT_READINESS_MISSING');
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
need(insurer.includes('data-technical-registry="1"')&&insurer.includes('Detalle de fuentes y trazabilidad')&&/Biblioteca \+ Drive/.test(insurer)&&/familiaDocumento/.test(importer)&&/vigenciaFuente/.test(importer),'B4_003_R20_INSURER_REGISTRY_UI_OR_METADATA_MISSING');
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
need(/modules\/renovaciones\.js\?v=20261007-r20f1/.test(index),'B4_003_BASE_CACHE_BINDING_MISSING');
need(/renewals-v1200-operational-bridge\.js\?v=20261005-r17/.test(index),'B4_003_BRIDGE_CACHE_BINDING_MISSING');
need(/renewals-v1200-permission-guard\.js\?v=20261003-b4003r2/.test(index),'B4_003_PERMISSION_CACHE_BINDING_MISSING');
need(/renewals-v1201-issued-filter\.js\?v=20261003-b4003r2/.test(index),'B4_003_ISSUED_CACHE_BINDING_MISSING');
need(/cancelaciones\.js\?v=20261003-b4003r13/.test(index),'B4_003_CANCEL_R13_CACHE_BINDING_MISSING');
need(/modules\/polizas\.js\?v=20261004-b4003r14/.test(index),'B4_003_POLICY_R13_CACHE_BINDING_MISSING');
need(/core\/access-scope\.js\?v=20261003-b4003r5/.test(index),'B4_003_ACCESS_SCOPE_CACHE_BINDING_MISSING');
need(/core\/router\.js\?v=20261007-r20f1/.test(index),'B4_003_R14_ROUTER_CACHE_BINDING_MISSING');
need(/core\/ciclo\.js\?v=20261007-r20f2/.test(index),'B4_003_R14A_CYCLE_CACHE_BINDING_MISSING');
need(/modules\/cronograma\.js\?v=20261003-b4003r5/.test(index),'B4_003_CRONOGRAMA_CACHE_BINDING_MISSING');
need(/store-firestore-product-operational-p0\.js\?v=20261003-b4003r3/.test(index),'B4_003_STORE_CACHE_BINDING_MISSING');
need(/modules\/cliente360\.js\?v=20261005-r17/.test(index),'B4_003_CLIENT360_R11_CACHE_BINDING_MISSING');
need(index.includes('modules/calidad.js?v=20261007-r20f2'),'B4_003_QUALITY_R12Q_CACHE_BINDING_MISSING');
need(index.includes('modules/aseguradoras.js?v=20261007-r20f3'),'B4_003_INSURER_R12_CACHE_BINDING_MISSING');
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
need(quality.includes('Registrar evidencia del origen')&&quality.includes('forceProvenance')&&quality.includes('Agregar teléfono / WhatsApp'),'B4_003_R18_QUALITY_PROVENANCE_OR_CHANNEL_ACTION_MISSING');
need((base.includes('function date45Disposition')&&base.includes('data-renewal-date45-reconciled='))||(base.includes('const renewalPipelineCandidate')&&base.includes('data-renewal-bucket=')&&!base.includes('renewal-disposition-detail')),'B4_003_R18_RENEWAL_DISPOSITION_CONTRACT_MISSING');
need(policyEngine.includes('const duplicateEdition')&&policyEngine.includes('lineage_ediciones_sin_vinculo')&&!policyEngine.includes("errors.push('poliza_duplicada:'"),'B4_003_R18_POLICY_EDITION_VALIDATOR_NOT_FIXED');
need(insurer.includes("typeof v==='object'")&&insurer.includes('Historia unificada:')&&insurer.includes('insurer-source-detail')&&!insurer.includes('a.comisionDefault || 12'),'B4_003_R18_INSURER_PROVENANCE_ACTIVITY_OR_COMMISSION_FALLBACK_INVALID');
need(infra.includes('#ciclo-modal{place-items:start stretch!important')&&infra.includes('.tb-search{display:flex!important')&&infra.includes('.insurer-source-detail{grid-template-columns:1fr!important'),'B4_003_R18_MOBILE_RESPONSIVE_GUARDS_MISSING');
need(inicio.includes('function renewalRows45()')&&inicio.includes('Orbit.modules.polizas.policyMetrics.isRenewalWithin45Days')&&inicio.includes('data-renewal-owner="polizas.policyMetrics.isRenewalWithin45Days"'),'B4_003_R18_INICIO_POLICY_KPI_PARITY_OWNER_MISSING');
need(index.includes('modules/inicio.js?v=20261005-r19')&&index.includes('core/policy-receipts-engine.js?v=20261005-r18'),'B4_003_R18_NEW_CACHE_BINDINGS_MISSING');

need(cycle.includes('function actionQueueRanks')&&cycle.includes('Acción requerida · #')&&cycle.includes('Registrar guarda la colaboración inmediatamente')&&cycle.includes('humanCommentAuthor')&&cycle.includes('assignableAdvisors(n.pais).then'),'B4_003_R20_SECOND_REVIEW_OPS_LEADS_USABILITY_MISSING');
need(index.includes('Marcando…')&&index.includes('Archivando…')&&index.includes('inbox-active-count')&&index.includes('maybePendingLanding'),'B4_003_R20_SECOND_REVIEW_INBOX_FEEDBACK_MISSING');
need(insurer.includes('function semanticValue')&&insurer.includes('Cambios detectados:')&&insurer.includes('Revisando cambios…')&&insurer.includes('Procesando logo…'),'B4_003_R20_SECOND_REVIEW_INSURER_SEMANTIC_DIFF_OR_PROGRESS_MISSING');
need(importer.includes('analyzeInsurerSourceText')&&importer.includes('Analizar y clasificar')&&importer.includes('insurer-source-classifier')&&importer.includes('Cómo se analizó')&&importer.includes('id="imp-insurer-ramo"')&&importer.includes('id="imp-insurer-producto"')&&importer.includes('id="imp-insurer-plan"'),'B4_003_R20_SECOND_REVIEW_INSURER_IMPORTER_INTELLIGENCE_MISSING');
need(driveBackend.includes('INSURER_DOSSIER_ROLES')&&driveBackend.includes('listEntityFolder')&&driveBackend.includes('orbit360DocumentDriveListFolderPreview')&&driveProvider.includes('listFolder')&&driveProvider.includes('resolveDossier'),'B4_003_R20_SECOND_REVIEW_INSURER_DRIVE_BROWSER_MISSING');
need(quality.includes('const PHONE_CODES=')&&quality.includes("['GT','+502','Guatemala']")&&quality.includes("['CO','+57','Colombia']")&&quality.includes("if(options.focus==='telefono')ordered=ordered.filter")&&quality.includes('quality-scroll-top')&&quality.includes('País propuesto:'),'B4_003_R20_SECOND_REVIEW_QUALITY_PHONE_COUNTRY_SCROLL_MISSING');
need(configuracion.includes('id="cf-cat-planes"')&&read('orbit360-platform/core/config.js').includes('"planes":[]'),'B4_003_R20_SECOND_REVIEW_PLAN_CATALOG_AUTHORITY_MISSING');
need(infra.includes('R20 transversal visual grammar · contrast without aggression')&&infra.includes('.ciclo-collab-panel')&&infra.includes('.inbox-active-count')&&infra.includes('.insurer-offering-card')&&infra.includes('.insurer-drive-panel')&&infra.includes('.quality-scroll-top'),'B4_003_R20_SECOND_REVIEW_VISUAL_GRAMMAR_MISSING');
need(!/insurer-activity-time\{[^}]*font-family:var\(--f-mono\)/.test(infra)&&!/quality-eyebrow\{[^}]*font-family:var\(--f-mono\)/.test(infra),'B4_003_R20_SECOND_REVIEW_TYPOGRAPHY_MIX_REGRESSION');
need(insurer.includes('Qué ocurrió y quién lo hizo')&&insurer.includes('Sistema documental')&&insurer.includes('Conocimiento de la aseguradora')&&!insurer.includes('Registry técnico y provenance'),'B4_003_R20_SECOND_REVIEW_INSURER_AUDIT_LANGUAGE_MISSING');

const productPaths=[paths.workflow,paths.opsInbox,paths.notificationProcessor,paths.authRuntime,paths.productApp,paths.operationalBackend,paths.store,paths.accessScope,paths.cycle,paths.inicio,paths.policyEngine,paths.cronograma,paths.base,paths.bridge,paths.permission,paths.issued,paths.cancel,paths.policy,paths.policyBridge,paths.policyDetail,paths.client360,paths.quality,paths.insurer,paths.insurerVisual,paths.importer,paths.driveBackend,paths.driveProvider,paths.infra,paths.index,paths.rosterBackend,paths.rosterClient,paths.tenantBackend,paths.tenantClient,paths.configuracion,paths.geo,'orbit360-platform/core/config.js'];
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
need(lock.boundaries?.businessWritesAuthorized===false&&lock.boundaries?.dataMutationAuthorized===false&&lock.boundaries?.reimportAuthorized===false&&lock.boundaries?.livePromotionAuthorized===false,'B4_003_BOUNDARY_INVALID');
need(lock.boundaries?.syntheticQaWritesAuthorized===true,'B4_003_SYNTHETIC_QA_NOT_AUTHORIZED');

console.log(JSON.stringify({status:'PASS',contract:'B4_003_R20_CONTRACT',exactBlobBindings:bindings,singleRenewalActionOwner:paths.bridge,noDelayedRenewalRenderOwners:true,durableRenewalCampaign:true,durableCancelationRecovery:true,previewGeneralWritesIsolated:true,r13PolicyIndexedSearch:true,r13PolicyCoherentHydration:true,r13CancelIndexedRelations:true,r13InsurerDriveTargetAuthority:true,productFileCount:comp.productFileCount},null,2));

need(quality.includes('id="q-search"')&&quality.includes('id="q-pais"')&&!quality.includes('<th>Canal</th>')&&quality.includes('quality-main-scroll'),'B4_003_R19_QUALITY_SEARCH_FILTER_RESPONSIVE_MISSING');
need(policyBridge.includes('operacion_atomica_no_confirmada')&&policyBridge.includes('protectedPreviewRealPolicy')&&!policyBridge.includes("|| String(x).replace(/_/g, ' ')"),'B4_003_R19_POLICY_HUMAN_ERROR_OR_PREVIEW_GUARD_MISSING');
need(policyDetail.includes('function humanIssueLabel')&&policyDetail.includes("replace(/<[^>]*>/g,' ')"),'B4_003_R19_POLICY_TECHNICAL_LABEL_SANITIZER_MISSING');
need(base.includes('const renewalPipelineCandidate')&&base.includes("renewabilityState(p)==='NO'")&&base.includes('data-renewal-bucket=')&&base.includes('Renovabilidad pendiente')&&!base.includes('renewal-disposition-detail'),'B4_003_R20_RENEWAL_APPROVED_KANBAN_CONTRACT_MISSING');
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
need(base.includes('data-renewability-review=')&&base.includes('Revisar renovabilidad')&&base.includes('cliente360.editarPoliza')&&base.includes('renovabilidad')&&base.includes('Renovabilidad pendiente'),'B4_003_R20_RENEWABILITY_INLINE_ACTION_MISSING');
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
need(opsInbox.includes('const deduped=new Map()')&&opsInbox.includes('updateInboxState')&&opsInbox.includes("statusLabel:attendedAt?'Atendida':readAt?'Vista':'Nueva'")&&opsInbox.includes('recipientMatch'),'B4_003_R20_INBOX_DEDUPE_RECIPIENT_STATE_MISSING');
need(notificationProcessor.includes('targetSurface')&&notificationProcessor.includes('actorUid')&&notificationProcessor.includes('actorName'),'B4_003_R20_NOTIFICATION_RECIPIENT_PROJECTION_MISSING');
need(index.includes('Marcar atendida')&&index.includes('Archivar atendidas')&&index.includes('targetSurface')&&!index.includes("n.status||'pendiente'"),'B4_003_R20_INBOX_HUMAN_UI_MISSING');
need(authRuntime.includes("setRestoring('Acceso confirmado · preparando tus datos…')")&&!authRuntime.includes("if(!validRequestedRoute())location.hash='#/inicio'"),'B4_003_R20_AUTH_PROGRESS_OR_FORCED_INICIO_REMAINS');
need(productApp.includes('hydration.required.slice()')&&productApp.includes("function preferredLanding()")&&productApp.includes("return'inicio'")&&!productApp.includes("if(advisor)return'leads'")&&index.includes('maybePendingLanding')&&index.includes("surface=/operativo|admin|direcci[oó]n|superadmin/.test(role)?'ops':/asesor|comercial/.test(role)?'leads':''"),'B4_003_R20_SECOND_REVIEW_STARTUP_PENDING_ROUTING_MISSING');
need(router.includes("orbit:route-ready"),'B4_003_R20_ROUTE_READY_SIGNAL_MISSING');
need(base.includes('Vencidas renovables')&&base.includes('data-expired-historical-count')&&base.includes('expiredContext()'),'B4_003_R20_RENEWAL_EXPIRED_KPI_SEMANTICS_MISSING');
need(insurer.includes('data-insurer-preview-uat="1"')&&insurer.includes('data-rupload')&&insurer.includes('insurer-premium-section')&&!insurer.includes('Registry técnico y provenance'),'B4_003_R20_INSURER_HUMAN_UAT_OR_VISUAL_REDESIGN_MISSING');
need(quality.includes('sourceLabel(x.contractualSource)')&&quality.includes('Prima total en póliza')&&quality.includes('Total de recibos programados')&&quality.includes('programación de pagos')&&quality.includes('quality-workbench'),'B4_003_R20_SECOND_REVIEW_QUALITY_HUMAN_LANGUAGE_MISSING');
need(driveBackend.includes("entity==='negocio'")&&driveBackend.includes('refsFrom(target.business||{})')&&driveBackend.includes("target.entityType==='negocio'?await ensureFolder(rootId,'_NEGOCIOS'")&&!driveBackend.includes("if(!clientId)throw new HttpsError('failed-precondition','El negocio no tiene cliente vinculado"),'B4_003_R20_COLLAB_DRIVE_TARGET_MISSING');
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
need(quality.includes('max-width:1700px')&&quality.includes('sourceLabel(x.contractualSource)')&&quality.includes('Qué estamos comparando:')&&quality.includes('Por qué requiere revisión:')&&quality.includes('Origen / evidencia')&&!quality.includes('<th>Provenance / evidencia</th>'),'B4_003_R18_QUALITY_RESPONSIVE_HUMAN_SEMANTICS_MISSING');
need(policyDetail.includes('const isVehiclePolicy')&&policyDetail.includes("isVehiclePolicy(p) ? section('🚘 Riesgo asegurado / vehículo'")&&policyDetail.includes("let reason=''")&&policyDetail.includes("calendario activo") ,'B4_003_R17_NONVEHICLE_OR_FINANCIAL_CAUSE_GUARD_MISSING');
need(insurer.includes('insurer-source-card')&&insurer.includes('data-source-registry-detail=')&&insurer.includes('Ver detalles ▾')&&!insurer.includes("const provenance=clean(r.provenance"),'B4_003_R18_INSURER_SOURCE_REGISTRY_DRILLDOWN_MISSING');
