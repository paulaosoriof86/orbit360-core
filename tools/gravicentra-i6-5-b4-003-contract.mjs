import fs from 'node:fs';
import cp from 'node:child_process';

const need=(v,c)=>{if(!v)throw new Error(c);};
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>cp.execFileSync('git',['hash-object',p],{encoding:'utf8'}).trim();

const paths={
  workflow:'functions/product-ops-leads-domain.js',
  operationalBackend:'functions/product-operational-domain.js',
  store:'orbit360-platform/data/store-firestore-product-operational-p0.js',
  accessScope:'orbit360-platform/core/access-scope.js',
  cronograma:'orbit360-platform/modules/cronograma.js',
  base:'orbit360-platform/modules/renovaciones.js',
  bridge:'orbit360-platform/modules/renewals-v1200-operational-bridge.js',
  permission:'orbit360-platform/modules/renewals-v1200-permission-guard.js',
  issued:'orbit360-platform/modules/renewals-v1201-issued-filter.js',
  cancel:'orbit360-platform/modules/cancelaciones.js',
  policyBridge:'orbit360-platform/modules/policy-receipts-v1199-bridge.js',
  policyDetail:'orbit360-platform/modules/policy-receipts-v1199-detail-guard.js',
  client360:'orbit360-platform/modules/cliente360.js',
  quality:'orbit360-platform/modules/calidad.js',
  insurer:'orbit360-platform/modules/aseguradoras.js',
  insurerVisual:'orbit360-platform/core/client-insurer-visual-contract-v20260720.js',
  importer:'orbit360-platform/core/importa.js',
  infra:'orbit360-platform/styles/infra.css',
  index:'orbit360-platform/index.html',
  composition:'artifacts/orbit360-recovery/release-control/I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json',
  lock:'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B4_EXECUTION_LOCK_20261002.json',
  control:'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json',
  r1:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_CAUSAL_SOURCE_FIX_20261003.json',
  r2:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_CAUSAL_SOURCE_FIX_R2_20261003.json',
  r3:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_CAUSAL_SOURCE_FIX_R3_PREVIEW_ISOLATION_20261003.json',
  r4:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_CAUSAL_SOURCE_FIX_R4_CANONICAL_POLICY_PROJECTION_20261003.json',
  r5:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_PAULA_VISUAL_REJECTION_R5_SOURCE_FIX_20261003.json',
  r11:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_PAULA_VISUAL_REJECTION_R11_SOURCE_FIX_20261003.json',
  r12diag:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R12_REMAINING_BLOCKERS_CAUSAL_DIAGNOSTIC_20261003.json',
  r12fix:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_R12_REMAINING_BLOCKERS_SOURCE_FIX_20261003.json',
  adjudication:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_DIAGNOSTIC_ADJUDICATION_20261003.json'
};
for(const p of Object.values(paths))need(fs.existsSync(p),'B4_003_REQUIRED_FILE_MISSING:'+p);

const workflow=read(paths.workflow),opBackend=read(paths.operationalBackend),store=read(paths.store),accessScope=read(paths.accessScope),cronograma=read(paths.cronograma),base=read(paths.base),bridge=read(paths.bridge),permission=read(paths.permission),issued=read(paths.issued),cancel=read(paths.cancel),policyBridge=read(paths.policyBridge),policyDetail=read(paths.policyDetail),client360=read(paths.client360),quality=read(paths.quality),insurer=read(paths.insurer),insurerVisual=read(paths.insurerVisual),importer=read(paths.importer),infra=read(paths.infra),index=read(paths.index);
const comp=json(paths.composition),lock=json(paths.lock),control=json(paths.control),r1=json(paths.r1),r2=json(paths.r2),r3=json(paths.r3),r4=json(paths.r4),r5=json(paths.r5),r11=json(paths.r11),r12diag=json(paths.r12diag),r12fix=json(paths.r12fix),adj=json(paths.adjudication);

need(control.nextAction==='I6_5_FORENSIC_REMEDIATION_B4_003_CONTRACT_AND_EXACT_PREVIEW','B4_003_CONTROL_NEXT_ACTION_INVALID');
need(/^B4_003_SOURCE_FIXED_R(?:5|9|10|11|12)_/.test(String(control.currentB4?.status||'')),'B4_003_CONTROL_STATUS_INVALID');
need(/^B4_003_SOURCE_FIXED_R(?:5|9|10|11|12)_/.test(String(lock.status||''))&&lock.activeFinding?.id==='B4-003','B4_003_LOCK_STATUS_INVALID');
need(r1.status==='SOURCE_FIXED_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R1_RECEIPT_INVALID');
need(r2.status==='SOURCE_FIXED_R2_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R2_RECEIPT_INVALID');
need(r3.status==='SOURCE_FIXED_R3_PREVIEW_ISOLATION_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R3_RECEIPT_INVALID');
need(r4.status==='SOURCE_FIXED_R4_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R4_RECEIPT_INVALID');
need(r5.status==='SOURCE_FIXED_R5_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R5_RECEIPT_INVALID');
need(r11.status==='SOURCE_FIXED_R11_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R11_RECEIPT_INVALID');
need(r12diag.status==='CAUSES_DEMONSTRATED_NARROW_SOURCE_FIX_AUTHORIZED','B4_003_R12_DIAGNOSTIC_INVALID');
need(r12fix.status==='SOURCE_FIXED_R12_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R12_SOURCE_FIX_RECEIPT_INVALID');
need(adj.status==='CAUSES_RECONCILED_NARROW_SOURCE_FIX_AUTHORIZED','B4_003_ADJUDICATION_INVALID');

need(/BUSINESS_MUTABLE_FIELDS[\s\S]*'polizaId','cancelacionId'/.test(workflow),'B4_003_RECOVERY_BUSINESS_LINK_FIELDS_MISSING');
need(/MANAGEMENT_MUTABLE_FIELDS[\s\S]*'negocioId','cancelacionId'/.test(workflow),'B4_003_RECOVERY_MANAGEMENT_LINK_FIELD_MISSING');
need(/BUSINESS_CREATE_EXTRA_FIELDS[\s\S]*'polizaId','cancelacionId'/.test(workflow),'B4_003_RECOVERY_BUSINESS_CREATE_LINK_FIELDS_MISSING');
need(/MANAGEMENT_CREATE_EXTRA_FIELDS[\s\S]*'cancelacionId'/.test(workflow),'B4_003_RECOVERY_MANAGEMENT_CREATE_LINK_FIELD_MISSING');

need(!/function\s+campana\s*\(/.test(base)&&!/function\s+solicitarPropuestas\s*\(/.test(base),'B4_003_LEGACY_RENEWAL_ACTION_OWNER_REMAINS');
need(/return\s*\{\s*render\s*\}/.test(base),'B4_003_BASE_RENDER_ONLY_CONTRACT_MISSING');
need(/!p\.renovadaPor/.test(base)&&/renovacionEstado/.test(base),'B4_003_BASE_RENEWED_FILTER_MISSING');
need(base.includes("renewabilityState(p)==='YES'"),'B4_003_BASE_RENEWABILITY_FAIL_CLOSED_MISSING');
need(/mod\.campana\s*=\s*campana/.test(bridge)&&/mod\.solicitarPropuestas\s*=\s*solicitarPropuestas/.test(bridge)&&/mod\.registrarAceptacion\s*=\s*registrarAceptacion/.test(bridge),'B4_003_OPERATIONAL_RENEWAL_OWNER_INCOMPLETE');
need(/batchDurable/.test(bridge)&&/await\s+S\(\)\.batchDurable/.test(bridge),'B4_003_RENEWAL_CAMPAIGN_DURABLE_READBACK_MISSING');
need(/No fue posible confirmar la preparación\. No se registró un falso éxito\./.test(bridge),'B4_003_RENEWAL_FALSE_SUCCESS_GUARD_MISSING');
need(/!p\.renovadaPor/.test(bridge)&&/renovacionEstado/.test(bridge),'B4_003_OPERATIONAL_RENEWED_FILTER_MISSING');
need(bridge.includes("renewabilityState(p)==='YES'"),'B4_003_OPERATIONAL_RENEWABILITY_FAIL_CLOSED_MISSING');
need(!/mod\.render\s*=/.test(permission)&&!/setTimeout\s*\(/.test(permission),'B4_003_PERMISSION_SECOND_RENDER_FORBIDDEN');
need(!/mod\.render\s*=/.test(issued)&&!/setTimeout\s*\(/.test(issued),'B4_003_ISSUED_SECOND_RENDER_FORBIDDEN');

for(const token of ["await S().updateDurable('cancelaciones'","await S().updateDurable('negocios'","await S().insertDurable('negocios'","await S().updateDurable('gestiones'","await Orbit.ciclo.crearGestion"])need(cancel.includes(token),'B4_003_CANCEL_DURABLE_PATH_MISSING:'+token);
need(!/S\(\)\.update\('cancelaciones'/.test(cancel)&&!/S\(\)\.insert\('negocios'/.test(cancel)&&!/S\(\)\.update\('negocios'/.test(cancel)&&!/S\(\)\.update\('gestiones'/.test(cancel),'B4_003_CANCEL_OPTIMISTIC_CRITICAL_WRITE_REMAINS');
need(/No fue posible confirmar la recuperación\. No se registró un falso éxito\./.test(cancel),'B4_003_CANCEL_FALSE_SUCCESS_GUARD_MISSING');
need(/function\s+effectiveCancelations\s*\(/.test(cancel)&&/__policyCancellationProjection/.test(cancel),'B4_003_CANCEL_POLICY_PROJECTION_OWNER_MISSING');
need(/await\s+S\(\)\.insertDurable\('cancelaciones'/.test(cancel),'B4_003_CANCEL_PROJECTION_MATERIALIZATION_MISSING');
need(/cancelaciones:\s*'cancelaciones'/.test(accessScope),'B4_003_CANCEL_ACCESS_SCOPE_OWNER_MISSING');
need(/function\s+activeCountry/.test(cancel)&&/filter\(inActiveCountry\)/.test(cancel),'B4_003_CANCEL_SELECTED_COUNTRY_FILTER_MISSING');
need(/detalleKpi/.test(cancel)&&/cancelation-kpi-detail/.test(cancel),'B4_003_CANCEL_KPI_DETAIL_OWNER_MISSING');
need(cancel.includes('function cancellationById(id, policyId)')&&cancel.includes("String(c&&c.polizaId||'')===wanted"),'B4_003_CANCEL_POLICY_IDENTITY_FALLBACK_MISSING');
need(cancel.includes('data-cancel-client-link')&&cancel.includes('&t=polizas'),'B4_003_CANCEL_CLIENT_POLICY_DEEPLINK_MISSING');
need(cancel.includes('no es churn temporal')&&cancel.includes('Relación canceladas / cartera'),'B4_003_CANCEL_HISTORICAL_RATIO_LABEL_MISSING');
need(policyBridge.includes('!rs.includes(initialRamo)')&&policyBridge.includes('!initialSubs.includes(initialProduct)'),'B4_003_POLICY_EDITOR_SOURCE_TAXONOMY_PRESERVATION_MISSING');
need(policyBridge.includes('data-renewable')&&policyBridge.includes("renovable: $('[data-renewable]').value==='yes'"),'B4_003_POLICY_EDITOR_RENEWABILITY_TRISTATE_MISSING');
need(client360.includes('id="ftab-prev"')&&client360.includes('left: -strip.clientWidth')&&infra.includes('.ftab-prev'),'B4_003_CLIENT360_LEFT_TAB_CONTROL_MISSING');
need(quality.includes('.filter(inActiveCountry)')&&quality.includes('vigenteClientIds')&&quality.includes('data-quality-country'),'B4_003_QUALITY_COUNTRY_OR_LINEAR_INDEX_MISSING');
need(!quality.includes("vig: tieneVigente(c.id)"),'B4_003_QUALITY_PER_CLIENT_POLICY_SCAN_REMAINS');
need(insurerVisual.includes("box.dataset.knowledgeSource='canonical'")&&insurerVisual.includes('Fuentes relacionadas')&&insurerVisual.includes('sourceApi.knowledgeSources(insurer)'),'B4_003_R12_INSURER_KPI_SHADOW_OWNER_REMAINS');
need(insurer.includes('aseguradoraId: id')&&insurer.includes('Cargar tarifario / Excel de cotizador')&&insurer.includes('Cargar formulario, póliza o cotización de ejemplo'),'B4_003_R12_INSURER_UPLOAD_ENTRYPOINT_OR_SCOPE_MISSING');
need(importer.includes("updateDurable('aseguradoras', insurerId")&&importer.includes('preview_protected_operational_insurer')&&importer.includes('Documento recibido')&&importer.includes("requiereValidacion: state.kind === 'docs-aseguradora'"),'B4_003_R12_INSURER_DURABLE_SOURCE_BINDING_MISSING');
need(importer.includes('Ningún documento habilita Cotizador, Comparativo o IA automáticamente'),'B4_003_R12_INSURER_IMPORT_AUTO_ENABLE_CLAIM_REMAINS');
need(policyDetail.includes('policyCompleteness, receiptSchedule, financialIntegrityBatch, premiumBreakdown')&&quality.includes('financialIntegrityIssues')&&quality.includes('data-information-health-policy'),'B4_003_R12_INFORMATION_HEALTH_FINANCIAL_PROJECTION_MISSING');
need(policyDetail.includes("receiptsByPolicy=group(S().all('recibosEsperados')||[],'polizaId')")&&quality.includes('rm.financialIntegrityBatch(policies)')&&!quality.includes('rm.premiumBreakdown(p)'),'B4_003_R12_QUALITY_FINANCIAL_N_SQUARED_PATH_REMAINS');
need(quality.includes('pageSize: 50')&&quality.includes('visibleRows = rows.slice')&&quality.includes('data-quality-pagination="true"'),'B4_003_R12Q_QUALITY_UNBOUNDED_DOM_ROWS_REMAIN');
need(/selectedCountry/.test(base)&&/data-renewal-country/.test(base),'B4_003_RENEW_SELECTED_COUNTRY_FILTER_MISSING');
need(/renewalActionsLayout='grid2'/.test(bridge)&&/gridTemplateColumns='repeat\(2,minmax\(0,1fr\)\)'/.test(bridge),'B4_003_RENEW_COMPACT_ACTION_LAYOUT_MISSING');
need(/eventPriority/.test(cronograma)&&/data-more-date/.test(cronograma)&&/Agenda de renovaciones, recibos, gestiones y tareas/.test(cronograma),'B4_003_CRONOGRAMA_RENEWAL_VISIBILITY_MISSING');

need(/GENERAL_PREVIEW_COMMAND='orbit360ProductOperationalCommandPreview'/.test(store),'B4_003_GENERAL_PREVIEW_COMMAND_MISSING');
need(/previewGeneral\?GENERAL_PREVIEW_COMMAND:GENERAL_COMMAND/.test(store),'B4_003_GENERAL_PREVIEW_ROUTING_MISSING');
need(/previewGeneral\?'us-east1':'us-central1'/.test(store),'B4_003_GENERAL_PREVIEW_REGION_MISSING');
need(/b4003qa/.test(opBackend)&&/__syntheticQa/.test(opBackend),'B4_003_PREVIEW_SYNTHETIC_GUARD_MISSING');
need(/modules\/renovaciones\.js\?v=20261003-b4003r11/.test(index),'B4_003_BASE_CACHE_BINDING_MISSING');
need(/renewals-v1200-operational-bridge\.js\?v=20261003-b4003r11/.test(index),'B4_003_BRIDGE_CACHE_BINDING_MISSING');
need(/renewals-v1200-permission-guard\.js\?v=20261003-b4003r2/.test(index),'B4_003_PERMISSION_CACHE_BINDING_MISSING');
need(/renewals-v1201-issued-filter\.js\?v=20261003-b4003r2/.test(index),'B4_003_ISSUED_CACHE_BINDING_MISSING');
need(/cancelaciones\.js\?v=20261003-b4003r11/.test(index),'B4_003_CANCEL_CACHE_BINDING_MISSING');
need(/core\/access-scope\.js\?v=20261003-b4003r5/.test(index),'B4_003_ACCESS_SCOPE_CACHE_BINDING_MISSING');
need(/modules\/cronograma\.js\?v=20261003-b4003r5/.test(index),'B4_003_CRONOGRAMA_CACHE_BINDING_MISSING');
need(/store-firestore-product-operational-p0\.js\?v=20261003-b4003r3/.test(index),'B4_003_STORE_CACHE_BINDING_MISSING');
need(/modules\/cliente360\.js\?v=20261003-b4003r11/.test(index),'B4_003_CLIENT360_R11_CACHE_BINDING_MISSING');
need(/modules\/calidad\.js\?v=20261003-b4003r12q/.test(index),'B4_003_QUALITY_R12Q_CACHE_BINDING_MISSING');
need(/modules\/aseguradoras\.js\?v=20261003-b4003r12/.test(index),'B4_003_INSURER_R12_CACHE_BINDING_MISSING');
need(/core\/importa\.js\?v=20261003-b4003r12/.test(index),'B4_003_IMPORTER_R12_CACHE_BINDING_MISSING');
need(/core\/client-insurer-visual-contract-v20260720\.js\?v=20261003-b4003r12/.test(index),'B4_003_INSURER_VISUAL_R12_CACHE_BINDING_MISSING');
need(/modules\/policy-receipts-v1199-detail-guard\.js\?v=20261003-b4003r12p/.test(index),'B4_003_POLICY_DETAIL_R12P_CACHE_BINDING_MISSING');
need(/modules\/policy-receipts-v1199-bridge\.js\?v=20261003-b4003r11/.test(index),'B4_003_POLICY_BRIDGE_R11_CACHE_BINDING_MISSING');
need(/styles\/infra\.css\?v=20261003-b4003r11/.test(index),'B4_003_INFRA_R11_CACHE_BINDING_MISSING');

const productPaths=[paths.workflow,paths.operationalBackend,paths.store,paths.accessScope,paths.cronograma,paths.base,paths.bridge,paths.permission,paths.issued,paths.cancel,paths.policyBridge,paths.policyDetail,paths.client360,paths.quality,paths.insurer,paths.insurerVisual,paths.importer,paths.infra,paths.index];
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
need(lock.boundaries?.businessWritesAuthorized===false&&lock.boundaries?.dataMutationAuthorized===false&&lock.boundaries?.reimportAuthorized===false&&lock.boundaries?.livePromotionAuthorized===false,'B4_003_BOUNDARY_INVALID');
need(lock.boundaries?.syntheticQaWritesAuthorized===true,'B4_003_SYNTHETIC_QA_NOT_AUTHORIZED');

console.log(JSON.stringify({status:'PASS',contract:'B4_003_RENEWALS_CANCELATIONS_CONTRACT',exactBlobBindings:bindings,singleRenewalActionOwner:paths.bridge,noDelayedRenewalRenderOwners:true,durableRenewalCampaign:true,durableCancelationRecovery:true,previewGeneralWritesIsolated:true,productFileCount:comp.productFileCount},null,2));
