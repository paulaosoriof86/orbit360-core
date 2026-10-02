import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const need=(v,c)=>{if(!v)throw new Error(c);};
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();

const paths={
  queries:'orbit360-platform/core/queries.js',
  cliente:'orbit360-platform/modules/cliente360.js',
  inicio:'orbit360-platform/modules/inicio.js',
  cobros:'orbit360-platform/modules/cobros.js',
  polizas:'orbit360-platform/modules/polizas.js',
  router:'orbit360-platform/core/router.js',
  index:'orbit360-platform/index.html'
};
const src=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,read(p)]));
const composition=JSON.parse(read('artifacts/orbit360-recovery/release-control/I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json'));
const control=JSON.parse(read('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json'));

for(const k of ['queries','cliente','inicio','cobros','polizas','router']) new Function(src[k]);

need((src.queries.match(/function saludCliente\s*\(/g)||[]).length===1,'B3_008_HEALTH_OWNER_CARDINALITY');
need(src.queries.includes('function realizedPaymentRows()'),'B3_008_REALIZED_PAYMENT_OWNER_MISSING');
need(src.queries.includes('function produccionMesPorMoneda('),'B3_008_MONTHLY_PRODUCTION_OWNER_MISSING');
need(src.queries.includes('function recaudoMesPorMoneda('),'B3_008_MONTHLY_COLLECTION_OWNER_MISSING');
need(src.queries.includes('function leaderboardMes('),'B3_008_MONTHLY_ADVISOR_OWNER_MISSING');
need(src.queries.includes('function polizasScoped()'),'B3_008_POLICY_COUNTRY_SCOPE_OWNER_MISSING');
need(src.queries.includes('function clientesScoped()'),'B3_008_CLIENT_COUNTRY_SCOPE_OWNER_MISSING');
need((src.queries.match(/const cob = realizedPaymentRows\(\)\.filter/g)||[]).length>=2,'B3_008_FINANCIAL_KPI_NOT_REALIZED_PAYMENT_BASED');
need(src.queries.includes("estado: 'Pagado'"),'B3_008_PROJECTED_CONFIRMED_PAYMENT_STATE_MISSING');

need(!src.inicio.includes('Math.round((U.finiteNumber(prima) || 0) * 1.1)'),'B3_008_SYNTHETIC_91_FALLBACK_REMAINS');
need(!src.inicio.includes("metaRec = gMeta('recaudo', Math.round(metaPrima * 0.85))"),'B3_008_SYNTHETIC_RECAUDO_META_REMAINS');
need(src.inicio.includes("targetDial('production','Producción neta del mes'"),'B3_008_MONTHLY_PRODUCTION_UI_MISSING');
need(src.inicio.includes("data-meta-state="),'B3_008_META_FAIL_CLOSED_MARKER_MISSING');
need(src.inicio.includes("q.clientesScoped"),'B3_008_INICIO_CLIENT_SCOPE_MISSING');
need(src.inicio.includes("q.polizasScoped"),'B3_008_INICIO_POLICY_SCOPE_MISSING');
need(src.inicio.includes("data-values="),'B3_008_INDEPENDENT_VALUE_MARKERS_MISSING');

need(src.cliente.includes("return ['clientes'].every"),'B3_008_CLIENT_LIST_PRIMARY_READINESS_INVALID');
need(src.cliente.includes("const policyReadiness = dataReadiness(['polizas'])"),'B3_008_CLIENT_LIST_PROGRESSIVE_POLICY_READINESS_MISSING');
need(src.cliente.includes("Actualizando pólizas"),'B3_008_CLIENT_LIST_POLICY_FAIL_CLOSED_COPY_MISSING');
need(src.cliente.includes("ensureDataCollections(['clientes','polizas','asesores','carteraPrimas'])"),'B3_008_CLIENT_LIST_PREWARM_MISSING');
need(src.cliente.includes('data-c360-list-ready="1"'),'B3_008_CLIENT_LIST_READY_MARKER_MISSING');

need(src.cobros.includes("const CORE_HYDRATION_DEPS = ['cobros', 'clientes', 'polizas']"),'B3_008_COBROS_CORE_PROGRESSIVE_HYDRATION_MISSING');
need(src.cobros.includes("const FINANCIAL_HYDRATION_DEPS = ['recibosEsperados', 'carteraPrimas']"),'B3_008_COBROS_FINANCIAL_DEPS_MISSING');
need(src.cobros.includes('data-cobros-core-ready="1"'),'B3_008_COBROS_CORE_READY_MARKER_MISSING');
need(src.cobros.includes('data-cobros-financial-readiness='),'B3_008_COBROS_FINANCIAL_READINESS_MARKER_MISSING');
need(src.cobros.includes('Actualizando datos'),'B3_008_COBROS_PARTIAL_ZERO_GUARD_MISSING');

need(src.polizas.includes("const all = q.polizasScoped ? q.polizasScoped()"),'B3_008_POLIZAS_COUNTRY_SCOPE_MISSING');
need(src.polizas.includes("st.fkind === 'active' ? isActivePolicy(p)"),'B3_008_POLIZAS_ACTIVE_KPI_FILTER_MISMATCH');
need(src.polizas.includes("label: 'Pólizas activas'"),'B3_008_POLIZAS_ACTIVE_LABEL_MISSING');

for(const p of [paths.queries,paths.cliente,paths.inicio,paths.cobros,paths.polizas,paths.index]){
  need(composition.productFileBlobs?.[p]===git('hash-object',p),'B3_008_COMPOSITION_BLOB_DRIFT:'+p);
}
need(control.currentB3?.status==='B3_008_SOURCE_FIXED_PENDING_CONTRACT_AND_EXACT_PREVIEW','B3_008_CONTROL_STATUS_INVALID');
need(control.nextAction==='I6_5_FORENSIC_REMEDIATION_B3_008_CONTRACT_AND_EXACT_PREVIEW','B3_008_CONTROL_CURSOR_INVALID');
need(control.currentB3?.noLive===true&&control.currentB3?.noReimport===true,'B3_008_BOUNDARY_INVALID');

console.log('B3_008_R2_SOURCE_CONTRACT=PASS');
console.log('B3_008_R2_REALITY_PERFORMANCE_CONTRACT=PASS');
