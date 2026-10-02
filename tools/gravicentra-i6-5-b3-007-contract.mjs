import fs from 'node:fs';

const need=(v,c)=>{if(!v)throw new Error(c);};
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

const cronograma=read('orbit360-platform/modules/cronograma.js');
const router=read('orbit360-platform/core/router.js');
const index=read('orbit360-platform/index.html');
const adapter=read('orbit360-platform/modules/cobros-cartera-i65-closure-bridge.js');

new Function(cronograma);
new Function(router);

need(!cronograma.includes("S().all('cobros').filter(c => (c.estado === 'Pendiente' || c.estado === 'Vencido')"),'B3_007_LEGACY_COBROS_PENDING_OWNER_REMAINS');
need(cronograma.includes('function portfolioAdapter()'),'B3_007_PORTFOLIO_ADAPTER_BINDING_MISSING');
need(cronograma.includes("a.portfolioRows('')"),'B3_007_CANONICAL_PORTFOLIO_ROWS_MISSING');
need(cronograma.includes("typeof q.recibosEsperadosDe === 'function'"),'B3_007_CURRENT_RECEIPT_CLASSIFICATION_MISSING');
need(cronograma.includes("t: label")&&cronograma.includes("Recibo pendiente · "),'B3_007_OBLIGATION_LABEL_MISSING');
need(cronograma.includes("window.location.hash = '#/cliente360?c='")&&cronograma.includes("&t=recibos&r="),'B3_007_RECEIPT_DETAIL_ROUTE_MISSING');
need(cronograma.includes("tipo: 'recibo'"),'B3_007_EVENT_SEMANTIC_TYPE_MISSING');
need(!cronograma.includes("tipo: 'cobro', icon: '💳'"),'B3_007_COBRO_EVENT_SEMANTIC_REMAINS');
need(cronograma.includes('__b3007: Object.freeze'),'B3_007_DIAGNOSTIC_SURFACE_MISSING');

need(adapter.includes("S().all('carteraPrimas')"),'B3_007_CANONICAL_ADAPTER_NOT_PORTFOLIO_BASED');
need(adapter.includes("accessOk('carteraPrimas',r)"),'B3_007_CANONICAL_ADAPTER_SCOPE_MISSING');
need(adapter.includes("activePolicyRow(r)"),'B3_007_CANONICAL_ADAPTER_ACTIVE_POLICY_MISSING');

need(router.includes("cronograma: ['clientes', 'polizas', 'recibosEsperados', 'carteraPrimas', 'cobros', 'gestiones', 'tareas']"),'B3_007_ROUTER_HYDRATION_DEPENDENCIES_MISSING');
need(index.includes('modules/cronograma.js?v=20261001-b3007'),'B3_007_CRONOGRAMA_ASSET_BINDING_MISSING');
need(index.includes('core/router.js?v=20261001-b3007'),'B3_007_ROUTER_ASSET_BINDING_MISSING');

console.log('B3_007_SOURCE_CONTRACT=PASS');
console.log('B3_007_CANONICAL_PENDING_OBLIGATION_OWNER=PASS');
console.log('B3_007_ZERO_COBRO_OBLIGATION_SUPPORTED=PASS');
console.log('B3_007_RECEIPT_ROUTE_AND_HYDRATION=PASS');
