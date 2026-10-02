import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const need=(v,c)=>{if(!v)throw new Error(c);};
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();

const queriesPath='orbit360-platform/core/queries.js';
const clientePath='orbit360-platform/modules/cliente360.js';
const inicioPath='orbit360-platform/modules/inicio.js';
const routerPath='orbit360-platform/core/router.js';
const compositionPath='artifacts/orbit360-recovery/release-control/I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json';
const controlPath='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';

const queries=read(queriesPath);
const cliente=read(clientePath);
const inicio=read(inicioPath);
const router=read(routerPath);
const composition=JSON.parse(read(compositionPath));
const control=JSON.parse(read(controlPath));

for(const src of [queries,cliente,inicio,router]) new Function(src);

need((queries.match(/function saludCliente\s*\(/g)||[]).length===1,'B3_008_HEALTH_OWNER_CARDINALITY');
need((queries.match(/const salud = saludCliente\(/g)||[]).length===2,'B3_008_HEALTH_CONSUMERS_NOT_CANONICAL');
need(queries.includes("salud += Math.min(20, (vigentes || []).length * 6)"),'B3_008_APPROVED_HEALTH_POLICY_TERM_MISSING');
need(queries.includes("salud -= vencido > 0 ? 25 : 0"),'B3_008_APPROVED_HEALTH_OVERDUE_TERM_MISSING');
need(queries.includes("salud += cli && cli.segmento === 'Premium' ? 8 : 0"),'B3_008_APPROVED_HEALTH_PREMIUM_TERM_MISSING');
need(queries.includes("return Math.max(8, Math.min(100, salud))"),'B3_008_APPROVED_HEALTH_CLAMP_MISSING');

need(queries.includes('function carteraPendienteRows()'),'B3_008_CANONICAL_PENDING_ROWS_MISSING');
need(queries.includes('function carteraVencidaRows()'),'B3_008_CANONICAL_OVERDUE_ROWS_MISSING');
need(queries.includes("return (S().all('carteraPrimas') || []).filter"),'B3_008_PORTFOLIO_OWNER_NOT_CARTERAPRIMAS');

need(cliente.includes('function dataReadiness(names)'),'B3_008_CLIENTE_READINESS_OWNER_MISSING');
need(cliente.includes("data-c360-health=\"1\""),'B3_008_CLIENTE_HEALTH_READINESS_MARKER_MISSING');
need(cliente.includes("data-c360-list-health=\"1\""),'B3_008_CLIENTE_LIST_HEALTH_READINESS_MARKER_MISSING');
need(cliente.includes("const canonicalSummaryIndex = portfolioReadiness === 'ready' && q.clientesResumenIndex ? q.clientesResumenIndex() : null"),'B3_008_CLIENTE_LIST_CANONICAL_SUMMARY_MISSING');
need(!cliente.includes("const cob = collectionByClient.get(c.id) || []"),'B3_008_CLIENTE_LEGACY_COBROS_LIST_OWNER_REMAINS');
need(!cliente.includes("const pendiente = cob.filter(x => x.estado === 'Pendiente')"),'B3_008_CLIENTE_LEGACY_PENDING_CALC_REMAINS');
need(cliente.includes("const healthReadiness = dataReadiness(['clientes','polizas','carteraPrimas'])"),'B3_008_CLIENTE_HEALTH_DEPENDENCIES_INVALID');
need(cliente.includes("healthReadiness === 'unavailable' ? 'No disponible' : 'Calculando'"),'B3_008_CLIENTE_NEUTRAL_PREREADY_STATE_MISSING');

need(inicio.includes('function openFinancialKpi(kind)'),'B3_008_INICIO_FINANCIAL_DRILLDOWN_OWNER_MISSING');
need(inicio.includes("q.carteraPendienteRows()"),'B3_008_INICIO_PENDING_DETAIL_NOT_CANONICAL');
need(inicio.includes("q.carteraVencidaRows()"),'B3_008_INICIO_OVERDUE_DETAIL_NOT_CANONICAL');
need(!inicio.includes("onclick=\"Orbit.kpi('cobros-pendientes')\""),'B3_008_INICIO_LEGACY_PENDING_MODAL_REMAINS');
need(!inicio.includes("onclick=\"Orbit.kpi('cobros-vencidos')\""),'B3_008_INICIO_LEGACY_OVERDUE_MODAL_REMAINS');
need(inicio.includes('data-inicio-metric="cartera-pendiente"'),'B3_008_INICIO_PENDING_READINESS_MARKER_MISSING');
need(inicio.includes('data-inicio-metric="cartera-vencida"'),'B3_008_INICIO_OVERDUE_READINESS_MARKER_MISSING');

need(router.includes("inicio: ['clientes', 'polizas', 'cobros', 'carteraPrimas', 'recibosEsperados'"),'B3_008_INICIO_REACTIVE_CARTERA_MISSING');
need(router.includes("cliente360: ['clientes', 'asesores', 'polizas', 'cobros', 'carteraPrimas', 'recibosEsperados', 'comisiones'"),'B3_008_CLIENTE_REACTIVE_FINANCIAL_DEPS_MISSING');

for(const p of [queriesPath,clientePath,inicioPath,routerPath]){
  need(composition.productFileBlobs?.[p]===git('hash-object',p),'B3_008_COMPOSITION_BLOB_DRIFT:'+p);
}
need(control.currentB3?.status==='B3_008_SOURCE_FIXED_PENDING_CONTRACT_AND_EXACT_PREVIEW','B3_008_CONTROL_STATUS_INVALID');
need(control.nextAction==='I6_5_FORENSIC_REMEDIATION_B3_008_CONTRACT_AND_EXACT_PREVIEW','B3_008_CONTROL_CURSOR_INVALID');
need(control.currentB3?.noLive===true&&control.currentB3?.noReimport===true,'B3_008_BOUNDARY_INVALID');

console.log('B3_008_SOURCE_CONTRACT=PASS');
console.log('B3_008_HEALTH_SINGLE_OWNER=PASS');
console.log('B3_008_PORTFOLIO_SINGLE_OWNER=PASS');
console.log('B3_008_PREREADY_NEUTRAL_CONTRACT=PASS');
